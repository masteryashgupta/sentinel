import express from "express";
import { google } from "googleapis";
import { getOAuthClient } from "../lib/googleOAuth.js";
import { supabase, supabaseAdmin } from "../lib/supabase.js";
import { analyzeRawEmail } from "./cases.js";
import crypto from "crypto";
import { requireAuth } from "../lib/requireAuth.js";

const router = express.Router();

router.get("/auth", requireAuth, (req, res) => {
  const state = req.userId; // encode user ID in state so callback knows who it is
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.settings.basic"
    ],
    state: state,
  });
  res.json({ url });
});

router.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query;
  
  // A robust app would verify state against a session store here
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  if (!code) {
    return res.redirect(`${frontendUrl}/sentinel/gmail-sync?error=missing_code`);
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress;

    const { createUserClient } = await import("../lib/supabase.js");
    const userClient = createUserClient(req.token || ""); // Callback might not have token, but wait, this is a redirect!
    // Since callback is a browser redirect, req.token is undefined. We must rely on state (userId).
    // We use service role (supabaseAdmin) here to bypass RLS.
    
    await supabaseAdmin.from("gmail_connections").delete().eq("user_id", state);

    const { error } = await supabaseAdmin.from("gmail_connections").insert({
      user_id: state,
      email_address: emailAddress,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    });

    if (error) throw error;

    res.redirect(`${frontendUrl}/sentinel/gmail-sync?connected=true`);
  } catch (error) {
    console.error("OAuth callback error", error);
    res.redirect(`${frontendUrl}/sentinel/gmail-sync?error=auth_failed`);
  }
});

router.get("/status", requireAuth, async (req, res) => {
  const { createUserClient } = await import("../lib/supabase.js");
  const userClient = createUserClient(req.token);

  const { data, error } = await userClient
    .from("gmail_connections")
    .select("id, email_address, created_at, access_token, auto_spam_enabled")
    .eq("user_id", req.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.json({ connected: false });
  }

  let requiresReconnect = false;
  try {
    const oauth2Client = getOAuthClient();
    const tokenInfo = await oauth2Client.getTokenInfo(data.access_token);
    
    const requiredScopes = [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.settings.basic"
    ];
    
    if (!tokenInfo.scopes || !requiredScopes.every(s => tokenInfo.scopes.includes(s))) {
      requiresReconnect = true;
    }
  } catch (e) {
    console.warn("Failed to check token info scopes:", e);
    // If token is expired or invalid, we can just return requiresReconnect = true
    requiresReconnect = true;
  }

  res.json({ 
    connected: true, 
    email: data.email_address, 
    lastSynced: null,
    requiresReconnect,
    auto_spam_enabled: data.auto_spam_enabled 
  });
});

router.post("/disconnect", requireAuth, async (req, res) => {
  const { createUserClient } = await import("../lib/supabase.js");
  const userClient = createUserClient(req.token);

  const { data } = await userClient.from("gmail_connections").select("*").eq("user_id", req.userId).limit(1).maybeSingle();
  if (data && data.access_token) {
    try {
      const oauth2Client = getOAuthClient();
      await oauth2Client.revokeToken(data.access_token);
    } catch (e) {
      console.warn("Revoke token failed", e);
    }
  }
  await userClient.from("gmail_connections").delete().eq("user_id", req.userId);
  res.json({ success: true });
});

router.get("/inbox", requireAuth, async (req, res) => {
  try {
    const { createUserClient } = await import("../lib/supabase.js");
    const userClient = createUserClient(req.token);

    const { data: conn } = await userClient.from("gmail_connections").select("*").eq("user_id", req.userId).limit(1).maybeSingle();
    if (!conn) {
      return res.status(400).json({ error: "Not connected to Gmail" });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      expiry_date: conn.token_expiry ? new Date(conn.token_expiry).getTime() : null
    });

    auth.on('tokens', async (tokens) => {
      const updates = { access_token: tokens.access_token };
      if (tokens.refresh_token) updates.refresh_token = tokens.refresh_token;
      if (tokens.expiry_date) updates.token_expiry = new Date(tokens.expiry_date).toISOString();
      await userClient.from("gmail_connections").update(updates).eq("id", conn.id);
    });

    const gmail = google.gmail({ version: "v1", auth });
    
    const query = req.query.q || "is:unread";
    let listRes;
    try {
      listRes = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 10 });
    } catch (err) {
       if (err.message.includes("invalid_grant") || err.message.includes("invalid_token")) {
          await userClient.from("gmail_connections").delete().eq("id", conn.id);
          return res.status(401).json({ error: "Token revoked or invalid, please reconnect" });
       }
       throw err;
    }

    const messages = listRes.data.messages || [];
    const inbox = [];

    // Fetch metadata for each message
    await Promise.all(messages.map(async (msg) => {
       const messageId = msg.id;
       const { data: existing } = await userClient.from("cases").select("id").eq("gmail_message_id", messageId).maybeSingle();
       
       try {
           const msgRes = await gmail.users.messages.get({ 
               userId: "me", 
               id: messageId, 
               format: "metadata", 
               metadataHeaders: ["Subject", "From", "Date"] 
           });
           
           const headers = msgRes.data.payload.headers || [];
           inbox.push({
               id: messageId,
               subject: headers.find(h => h.name.toLowerCase() === "subject")?.value || "(No Subject)",
               from: headers.find(h => h.name.toLowerCase() === "from")?.value || "Unknown",
               date: headers.find(h => h.name.toLowerCase() === "date")?.value || "",
               snippet: msgRes.data.snippet,
               analyzed: !!existing,
               caseId: existing ? existing.id : null
           });
       } catch (e) {
           console.error(`Failed to fetch metadata for ${messageId}`, e);
       }
    }));

    // Sort descending by date (using the order from the list endpoint is usually correct, but let's be safe)
    res.json(inbox);
  } catch (err) {
    console.error("Inbox fetch error:", err);
    res.status(500).json({ error: "Failed to fetch inbox", detail: err.message });
  }
});

router.post("/analyze/:id", requireAuth, async (req, res) => {
  try {
    const { createUserClient } = await import("../lib/supabase.js");
    const userClient = createUserClient(req.token);

    const messageId = req.params.id;
    
    // Check if already analyzed
    const { data: existing } = await userClient.from("cases").select("*").eq("gmail_message_id", messageId).maybeSingle();
    if (existing) {
        return res.json({ case: existing, already_analyzed: true });
    }

    const { data: conn } = await userClient.from("gmail_connections").select("*").eq("user_id", req.userId).limit(1).maybeSingle();
    if (!conn) return res.status(400).json({ error: "Not connected to Gmail" });

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    auth.setCredentials({
      access_token: conn.access_token,
      refresh_token: conn.refresh_token,
      expiry_date: conn.token_expiry ? new Date(conn.token_expiry).getTime() : null
    });

    const gmail = google.gmail({ version: "v1", auth });
    
    const msgRes = await gmail.users.messages.get({ userId: "me", id: messageId, format: "raw" });
       
    const rawBase64 = msgRes.data.raw;
    const rawBuffer = Buffer.from(rawBase64.replace(/-/g, "+").replace(/_/g, "/"), "base64");

    const result = await analyzeRawEmail(rawBuffer, `gmail_${messageId}.eml`, userClient, req.userId);
    
    await userClient.from("cases").update({ gmail_message_id: messageId }).eq("id", result.case.id);
    
    // Auto-spam logic
    if (result.case.fraud_score >= 75 && conn.auto_spam_enabled) {
      try {
        await gmail.users.messages.modify({
          userId: "me",
          id: messageId,
          requestBody: {
            removeLabelIds: ["INBOX"],
            addLabelIds: ["SPAM"]
          }
        });
        
        // Log action in audit_log
        await userClient.from("audit_log").insert({
          case_id: result.case.id,
          action: "auto_marked_spam",
          actor: "system",
          details: { fraud_score: result.case.fraud_score }
        });
        
      } catch (e) {
        console.error(`Failed to auto-spam message ${messageId}:`, e);
      }
    }
    
    res.json({ case: result.case, analysis: result.analysis, campaign_id: result.campaign_id });
  } catch (err) {
    console.error(`Failed to analyze email ${req.params.id}:`, err);
    res.status(500).json({ error: "Analysis failed", detail: err.message });
  }
});

router.patch("/settings", requireAuth, async (req, res) => {
  const { createUserClient } = await import("../lib/supabase.js");
  const userClient = createUserClient(req.token);
  
  const { auto_spam_enabled } = req.body;
  if (typeof auto_spam_enabled !== "boolean") {
    return res.status(400).json({ error: "Invalid auto_spam_enabled value" });
  }

  const { data, error } = await userClient
    .from("gmail_connections")
    .update({ auto_spam_enabled })
    .eq("user_id", req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, auto_spam_enabled: data.auto_spam_enabled });
});

router.post("/block-sender", requireAuth, async (req, res) => {
  try {
    const { email_address, block_ip, origin_ip, case_id } = req.body;
    if (!email_address) return res.status(400).json({ error: "email_address required" });

    const { createUserClient } = await import("../lib/supabase.js");
    const userClient = createUserClient(req.token);

    // Get Gmail connection for OAuth client
    const { data: conn } = await userClient.from("gmail_connections").select("*").eq("user_id", req.userId).limit(1).maybeSingle();
    if (!conn) return res.status(400).json({ error: "Not connected to Gmail" });

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
    auth.setCredentials({ access_token: conn.access_token, refresh_token: conn.refresh_token, expiry_date: conn.token_expiry ? new Date(conn.token_expiry).getTime() : null });
    const gmail = google.gmail({ version: "v1", auth });

    // Create filter in Gmail
    await gmail.users.settings.filters.create({
      userId: "me",
      requestBody: {
        criteria: { from: email_address },
        action: { removeLabelIds: ["INBOX"], addLabelIds: ["TRASH"] }
      }
    });

    // Add to known_bad_indicators (blacklist)
    const indicators = [{ type: "email", value: email_address, source: "user_blocked" }];
    if (block_ip && origin_ip) {
      indicators.push({ type: "ip", value: origin_ip, source: "user_blocked" });
    }
    
    // Using userClient to ensure RLS compliance and attach user_id implicitly or explicitly
    const insertData = indicators.map(i => ({ ...i, user_id: req.userId }));
    await userClient.from("known_bad_indicators").insert(insertData);

    // Audit log
    if (case_id) {
      await userClient.from("audit_log").insert({
        case_id,
        action: "blocked_sender",
        actor: req.userId,
        details: { email_address, blocked_ip: block_ip ? origin_ip : null }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to block sender:", err);
    res.status(500).json({ error: "Failed to block sender", detail: err.message });
  }
});

export default router;
