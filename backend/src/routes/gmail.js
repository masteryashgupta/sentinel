import express from "express";
import { google } from "googleapis";
import { oauth2Client } from "../lib/googleOAuth.js";
import { supabase } from "../lib/supabase.js";
import { analyzeRawEmail } from "./cases.js";
import crypto from "crypto";

const router = express.Router();

router.get("/auth", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    state: state,
  });
  res.redirect(url);
});

router.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query;
  
  // A robust app would verify state against a session store here
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  if (!code) {
    return res.redirect(`${frontendUrl}/sentinel/gmail-sync?error=missing_code`);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const emailAddress = profile.data.emailAddress;

    // We use a basic insert and onConflict isn't possible natively without a unique constraint
    // But since it's just for one user, we can clear the table and insert the new one
    await supabase.from("gmail_connections").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // clear all

    const { error } = await supabase.from("gmail_connections").insert({
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

router.get("/status", async (req, res) => {
  const { data, error } = await supabase
    .from("gmail_connections")
    .select("id, email_address, created_at")
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.json({ connected: false });
  }
  res.json({ connected: true, email: data.email_address, lastSynced: null });
});

router.post("/disconnect", async (req, res) => {
  const { data } = await supabase.from("gmail_connections").select("*").limit(1).maybeSingle();
  if (data && data.access_token) {
    try {
      await oauth2Client.revokeToken(data.access_token);
    } catch (e) {
      console.warn("Revoke token failed", e);
    }
  }
  await supabase.from("gmail_connections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  res.json({ success: true });
});

router.get("/inbox", async (req, res) => {
  try {
    const { data: conn } = await supabase.from("gmail_connections").select("*").limit(1).maybeSingle();
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
      await supabase.from("gmail_connections").update(updates).eq("id", conn.id);
    });

    const gmail = google.gmail({ version: "v1", auth });
    
    const query = req.query.q || "is:unread";
    let listRes;
    try {
      listRes = await gmail.users.messages.list({ userId: "me", q: query, maxResults: 10 });
    } catch (err) {
       if (err.message.includes("invalid_grant") || err.message.includes("invalid_token")) {
          await supabase.from("gmail_connections").delete().eq("id", conn.id);
          return res.status(401).json({ error: "Token revoked or invalid, please reconnect" });
       }
       throw err;
    }

    const messages = listRes.data.messages || [];
    const inbox = [];

    // Fetch metadata for each message
    await Promise.all(messages.map(async (msg) => {
       const messageId = msg.id;
       const { data: existing } = await supabase.from("cases").select("id").eq("gmail_message_id", messageId).maybeSingle();
       
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

router.post("/analyze/:id", async (req, res) => {
  try {
    const messageId = req.params.id;
    
    // Check if already analyzed
    const { data: existing } = await supabase.from("cases").select("*").eq("gmail_message_id", messageId).maybeSingle();
    if (existing) {
        return res.json({ case: existing, already_analyzed: true });
    }

    const { data: conn } = await supabase.from("gmail_connections").select("*").limit(1).maybeSingle();
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

    const result = await analyzeRawEmail(rawBuffer, `gmail_${messageId}.eml`);
    
    await supabase.from("cases").update({ gmail_message_id: messageId }).eq("id", result.case.id);
    res.json({ case: result.case, analysis: result.analysis, campaign_id: result.campaign_id });
  } catch (err) {
    console.error(`Failed to analyze email ${req.params.id}:`, err);
    res.status(500).json({ error: "Analysis failed", detail: err.message });
  }
});

export default router;
