const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function analyzeEmail(file) {
  const form = new FormData();
  form.append("email", file);
  const res = await fetch(`${API_URL}/api/cases/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
  return res.json();
}

export async function listCases() {
  const res = await fetch(`${API_URL}/api/cases`);
  if (!res.ok) throw new Error("Failed to load cases");
  return res.json();
}

export async function getCase(id, role = "investigator") {
  const url = role === "viewer"
    ? `${API_URL}/api/cases/${id}?role=viewer`
    : `${API_URL}/api/cases/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load case");
  return res.json();
}

export async function getCaseAuditLog(id) {
  const res = await fetch(`${API_URL}/api/cases/${id}/audit-log`);
  if (!res.ok) throw new Error("Failed to load audit log");
  return res.json();
}

export async function getCaseAISummary(id) {
  const res = await fetch(`${API_URL}/api/cases/${id}/ai-summary`);
  if (!res.ok) throw new Error("Failed to generate AI summary");
  return res.json();
}

export async function updateCaseStatus(id, status, reviewed_by) {
  const res = await fetch(`${API_URL}/api/cases/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reviewed_by }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function listCampaigns() {
  const res = await fetch(`${API_URL}/api/campaigns`);
  if (!res.ok) throw new Error("Failed to load campaigns");
  return res.json();
}

export async function getCampaign(id) {
  const res = await fetch(`${API_URL}/api/campaigns/${id}`);
  if (!res.ok) throw new Error("Failed to load campaign");
  return res.json();
}

export function reportUrl(caseId) {
  return `${API_URL}/api/reports/${caseId}`;
}

export async function listBlacklist() {
  const res = await fetch(`${API_URL}/api/blacklist`);
  if (!res.ok) throw new Error("Failed to load blacklist");
  return res.json();
}

export async function addBlacklist(type, value, source) {
  const res = await fetch(`${API_URL}/api/blacklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, value, source }),
  });
  if (!res.ok) throw new Error("Failed to add blacklist entry");
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function fetchSystemStatus() {
  try {
    const res = await fetch(`${API_URL}/api/system-status`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null; // backend is completely down
  }
}

export async function listAlerts() {
  const res = await fetch(`${API_URL}/api/alerts`);
  if (!res.ok) throw new Error("Failed to load alerts");
  return res.json();
}

export async function acknowledgeAlert(id) {
  const res = await fetch(`${API_URL}/api/alerts/${id}/acknowledge`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to acknowledge alert");
  return res.json();
}
