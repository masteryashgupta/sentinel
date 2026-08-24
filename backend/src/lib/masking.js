/**
 * Data Masking - Privacy, Legal, and Compliance Safeguards
 * Per PS 26106 requirement: Implement role-based sensitive data redaction.
 *
 * Roles:
 *  - "investigator" (default): full access, no redaction
 *  - "viewer": redacted email body, masked sender address
 */

/**
 * Masks an email address like "john.doe@example.com" -> "j***.d**@example.com"
 * Local part: show first char of each segment (split by dot), mask rest.
 */
export function maskEmail(address) {
  if (!address) return null;
  const [local, domain] = address.split("@");
  if (!local || !domain) return "***@***";
  const maskedLocal = local
    .split(".")
    .map((seg) => (seg.length <= 1 ? seg + "*" : seg[0] + "*".repeat(seg.length - 1)))
    .join(".");
  return `${maskedLocal}@${domain}`;
}

/**
 * Applies role-based masking to a case data object.
 *
 * @param {Object} caseData - The raw case record from Supabase
 * @param {string} role - "investigator" (default) or "viewer"
 * @returns {Object} - Masked case data
 */
export function maskSensitiveData(caseData, role = "investigator") {
  if (role !== "viewer") return caseData;

  return {
    ...caseData,
    from_address: maskEmail(caseData.from_address),
    return_path: caseData.return_path ? maskEmail(caseData.return_path) : null,
    reply_to: caseData.reply_to ? maskEmail(caseData.reply_to) : null,
    // Redact full origin IP to /24 prefix for viewer role
    origin_ip: caseData.origin_ip
      ? caseData.origin_ip.replace(/\.\d+$/, ".***")
      : null,
    // Strip detailed classifier_notes (may contain raw header content)
    classifier_notes: "[REDACTED — investigator access required]",
    // Strip raw attachment data
    attachments: (caseData.attachments || []).map((a) => ({
      filename: "[redacted]",
      mime_type: a.mime_type,
    })),
    _masked: true,
    _role: "viewer",
  };
}
