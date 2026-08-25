import { supabase } from "./supabase.js";

/**
 * Classifies attribution confidence category per PS 26106 requirements.
 * Returns one of:
 * - "likely_spoofed_domain"
 * - "likely_compromised_account"
 * - "likely_anonymized_infrastructure"
 * - "unattributed"
 */
export function classifyAttribution(analysis) {
  const auth = analysis.authentication || {};
  const origin = analysis.origin || {};
  const scoring = analysis.scoring || {};
  const headerAnomalies = analysis.header_anomalies || [];
  const ruleFlags = analysis.detection?.rule_based?.flags || [];

  const spfFail = auth.spf === "fail";
  const dkimFail = auth.dkim === "fail";
  const dmarcFail = auth.dmarc === "fail";
  const spfPass = auth.spf === "pass";
  const dkimPass = auth.dkim === "pass";

  const isAnonymized = origin.is_tor_exit_node || origin.is_likely_proxy_or_hosting;
  const hasBrandFreemail = headerAnomalies.some((a) => a.type === "brand_display_name_freemail");
  const isBEC = scoring.category === "business_email_compromise" || ruleFlags.some((f) => f.category === "business_email_compromise");

  if (spfFail && dkimFail && dmarcFail) {
    return "likely_spoofed_domain";
  }

  if (hasBrandFreemail || (spfFail && dmarcFail)) {
    return "likely_spoofed_domain";
  }

  if ((spfPass || dkimPass) && (isBEC || scoring.fraud_score >= 50)) {
    return "likely_compromised_account";
  }

  if (isAnonymized) {
    return "likely_anonymized_infrastructure";
  }

  return "unattributed";
}

/**
 * Checks extracted indicators against the known_bad_indicators table.
 */
export async function checkBlacklist(indicators, userClient) {
  if (!indicators || indicators.length === 0) return false;

  for (const ind of indicators) {
    const { data } = await userClient
      .from("known_bad_indicators")
      .select("id")
      .eq("type", ind.type)
      .eq("value", ind.value)
      .maybeSingle();

    if (data) return true;
  }
  return false;
}
