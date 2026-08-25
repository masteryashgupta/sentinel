import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import { supabase } from "../lib/supabase.js";
import { correlateCase } from "../lib/campaigns.js";

import { classifyAttribution, checkBlacklist } from "../lib/attribution.js";
import { maskSensitiveData } from "../lib/masking.js";
import { mlHttpAgent, mlHttpsAgent } from "../index.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const ML_SERVICE_URL = (process.env.ML_SERVICE_URL || "http://localhost:8000").replace(/^"|"$/g, "");

export async function analyzeRawEmail(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, { filename });

  const isHttps = ML_SERVICE_URL.startsWith("https");
  const mlResponse = await fetch(`${ML_SERVICE_URL}/analyze`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    agent: isHttps ? mlHttpsAgent : mlHttpAgent,
  });

  if (!mlResponse.ok) {
    const errText = await mlResponse.text();
    throw new Error(`ML service error: ${errText}`);
  }

  const analysis = await mlResponse.json();

  const attributionCategory = classifyAttribution(analysis);
  const matchesBlacklist = await checkBlacklist(analysis.indicators);

  if (matchesBlacklist) {
    analysis.header_anomalies.unshift({
      type: "matches_known_bad_indicator",
      severity: "high",
      detail: "Case contains one or more indicators (IP, domain, DKIM key, or URL) matching the analyst blacklist.",
    });
  }

  const { data: newCase, error } = await supabase
    .from("cases")
    .insert({
      filename,
      subject: analysis.email.subject,
      from_address: analysis.email.from_address,
      from_display_name: analysis.email.from_display_name,
      return_path: analysis.email.return_path,
      reply_to: analysis.email.reply_to,
      message_id: analysis.email.message_id,
      sender_domain: analysis.email.sender_domain,
      category: analysis.scoring.category,
      fraud_score: analysis.scoring.fraud_score,
      classifier_notes: analysis.detection,
      spf_result: analysis.authentication.spf,
      dkim_result: analysis.authentication.dkim,
      dmarc_result: analysis.authentication.dmarc,
      header_anomalies: analysis.header_anomalies,
      origin_ip: analysis.origin.ip,
      origin_country: analysis.origin.country,
      origin_region: analysis.origin.region,
      origin_city: analysis.origin.city,
      origin_isp: analysis.origin.isp,
      origin_lat: analysis.origin.lat || null,
      origin_lon: analysis.origin.lon || null,
      is_likely_proxy_or_hosting: analysis.origin.is_likely_proxy_or_hosting || false,
      domain_created_at: analysis.domain_intelligence?.created_at || null,
      domain_registrar: analysis.domain_intelligence?.registrar || null,
      attachments: analysis.email.attachments || [],
      attribution_category: attributionCategory,
      matches_known_bad_indicator: matchesBlacklist,
    })
    .select()
    .single();

  if (error) throw error;

  // Real-time alert creation for high-risk threat (fraud_score >= 75)
  if (analysis.scoring.fraud_score >= 75) {
    await supabase.from("alerts").insert({
      case_id: newCase.id,
      message: `HIGH THREAT DETECTED [Score: ${analysis.scoring.fraud_score}/100]: "${analysis.email.subject || "No Subject"}" from ${analysis.email.from_address || "unknown"}`,
      acknowledged: false,
    });
  }

  // store indicators for campaign correlation
  if (analysis.indicators?.length) {
    await supabase.from("indicators").insert(
      analysis.indicators.map((i) => ({ case_id: newCase.id, type: i.type, value: i.value }))
    );
  }

  const campaignId = await correlateCase(newCase.id, analysis.indicators);

  await supabase.from("audit_log").insert({
    case_id: newCase.id,
    action: "case_created",
    actor: "system",
    details: { fraud_score: analysis.scoring.fraud_score },
  });

  return { case: newCase, analysis, campaign_id: campaignId };
}

/**
 * POST /api/cases/analyze
 * Accepts a raw .eml file, forwards to the ML service, stores the full
 * analysis as a case, extracts indicators, and runs campaign correlation.
 */
router.post("/analyze", upload.single("email"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No email file uploaded (field name: 'email')" });
    }

    const result = await analyzeRawEmail(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed", detail: err.message });
  }
});

/** GET /api/cases — list all cases, most recent first */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/** GET /api/cases/:id — full case detail, with optional ?role=viewer masking */
router.get("/:id", async (req, res) => {
  const { data: caseData, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) return res.status(404).json({ error: "Case not found" });

  const { data: indicators } = await supabase
    .from("indicators")
    .select("*")
    .eq("case_id", req.params.id);

  const { data: campaignLink } = await supabase
    .from("campaign_cases")
    .select("campaign_id, campaigns(*)")
    .eq("case_id", req.params.id)
    .maybeSingle();

  // Privacy compliance: apply data masking if role=viewer is passed
  const role = req.query.role || "investigator";
  const maskedCase = maskSensitiveData(caseData, role);

  res.json({ ...maskedCase, indicators, campaign: campaignLink?.campaigns || null });
});

/** GET /api/cases/:id/audit-log — chain-of-custody log for a case */
router.get("/:id/audit-log", async (req, res) => {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("case_id", req.params.id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


/** GET /api/cases/:id/ai-summary — fetch AI summary for the case */
router.get("/:id/ai-summary", async (req, res) => {
  try {
    // 1. Fetch case details
    const { data: caseData, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) return res.status(404).json({ error: "Case not found" });

    // 2. Fetch indicators
    const { data: indicators } = await supabase
      .from("indicators")
      .select("*")
      .eq("case_id", req.params.id);

    const reportData = { ...caseData, indicators };

    // 3. Call ML service
    const mlResponse = await fetch(`${ML_SERVICE_URL}/summarize-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData),
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      return res.status(502).json({ error: "ML service error", detail: errText });
    }

    const result = await mlResponse.json();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate AI summary", detail: err.message });
  }
});


/** PATCH /api/cases/:id/status — analyst updates case status */
router.patch("/:id/status", async (req, res) => {
  const { status, reviewed_by } = req.body;
  const { data, error } = await supabase
    .from("cases")
    .update({ status, reviewed_by })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("audit_log").insert({
    case_id: req.params.id,
    action: `status_changed_to_${status}`,
    actor: reviewed_by || "unknown",
  });

  res.json(data);
});

export default router;
