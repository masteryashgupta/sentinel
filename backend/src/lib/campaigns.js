/**
 * Identity Correlation and Attribution Support
 * Maps to PS 26106 component: "Identity Correlation and Attribution Support"
 *
 * Simple shared-attribute clustering: if a new case shares an indicator
 * (IP, domain, or DKIM key) with an existing campaign, it joins that campaign.
 * Otherwise, if it shares an indicator with another *case* not yet in a campaign,
 * a new campaign is created linking both.
 *
 * This is intentionally a transparent, explainable clustering rule rather than
 * an opaque ML model — investigators need to see *why* cases were linked.
 */
import { supabase } from "./supabase.js";

export async function correlateCase(caseId, indicators) {
  if (!indicators || indicators.length === 0) return null;

  for (const indicator of indicators) {
    // does an existing campaign already key off this indicator?
    const { data: existingCampaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("shared_indicator_type", indicator.type)
      .eq("shared_indicator_value", indicator.value)
      .maybeSingle();

    if (existingCampaign) {
      await supabase
        .from("campaign_cases")
        .insert({ campaign_id: existingCampaign.id, case_id: caseId });
      await supabase
        .from("campaigns")
        .update({ case_count: existingCampaign.case_count + 1 })
        .eq("id", existingCampaign.id);
      return existingCampaign.id;
    }

    // does another case already have this same indicator? if so, start a campaign
    const { data: matchingIndicator } = await supabase
      .from("indicators")
      .select("case_id")
      .eq("type", indicator.type)
      .eq("value", indicator.value)
      .neq("case_id", caseId)
      .limit(1)
      .maybeSingle();

    if (matchingIndicator) {
      const { data: newCampaign } = await supabase
        .from("campaigns")
        .insert({
          name: `Campaign: ${indicator.type}=${indicator.value}`,
          shared_indicator_type: indicator.type,
          shared_indicator_value: indicator.value,
          case_count: 2,
        })
        .select()
        .single();

      await supabase.from("campaign_cases").insert([
        { campaign_id: newCampaign.id, case_id: caseId },
        { campaign_id: newCampaign.id, case_id: matchingIndicator.case_id },
      ]);

      return newCampaign.id;
    }
  }

  return null; // no correlation found — case stands alone for now
}
