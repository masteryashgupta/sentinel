const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('sentinel_token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...options, headers });
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error((await res.json()).error || "Login failed");
  return res.json();
}

export async function signup(email, password) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error((await res.json()).error || "Signup failed");
  return res.json();
}

export async function getMe() {
  const res = await fetchWithAuth(`${API_URL}/api/auth/me`);
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

export async function analyzeEmail(file) {
  const form = new FormData();
  form.append("email", file);
  const res = await fetchWithAuth(`${API_URL}/api/cases/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
  return res.json();
}

export async function listCases() {
  const res = await fetchWithAuth(`${API_URL}/api/cases`);
  if (!res.ok) throw new Error("Failed to load cases");
  return res.json();
}

export async function getCase(id, role = "investigator") {
  const url = role === "viewer"
    ? `${API_URL}/api/cases/${id}?role=viewer`
    : `${API_URL}/api/cases/${id}`;
  const res = await fetchWithAuth(url);
  if (!res.ok) throw new Error("Failed to load case");
  return res.json();
}

export async function getCaseAuditLog(id) {
  const res = await fetchWithAuth(`${API_URL}/api/cases/${id}/audit-log`);
  if (!res.ok) throw new Error("Failed to load audit log");
  return res.json();
}

export async function getCaseAISummary(id) {
  const res = await fetchWithAuth(`${API_URL}/api/cases/${id}/ai-summary`);
  if (!res.ok) {
    let msg = "Failed to generate AI summary";
    try {
      const errData = await res.json();
      msg = errData.detail || errData.error || msg;
    } catch (e) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function updateCaseStatus(id, status, reviewed_by) {
  const res = await fetchWithAuth(`${API_URL}/api/cases/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reviewed_by }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function listCampaigns() {
  const res = await fetchWithAuth(`${API_URL}/api/campaigns`);
  if (!res.ok) throw new Error("Failed to load campaigns");
  return res.json();
}

export async function getCampaign(id) {
  const res = await fetchWithAuth(`${API_URL}/api/campaigns/${id}`);
  if (!res.ok) throw new Error("Failed to load campaign");
  return res.json();
}

export async function downloadReport(caseId) {
  const res = await fetchWithAuth(`${API_URL}/api/reports/${caseId}`);
  if (!res.ok) throw new Error("Failed to download report");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sentinel_report_${caseId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function listBlacklist() {
  const res = await fetchWithAuth(`${API_URL}/api/blacklist`);
  if (!res.ok) throw new Error("Failed to load blacklist");
  return res.json();
}

export async function addBlacklist(type, value, source) {
  const res = await fetchWithAuth(`${API_URL}/api/blacklist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, value, source }),
  });
  if (!res.ok) throw new Error("Failed to add blacklist entry");
  return res.json();
}

export async function fetchHealth() {
  const res = await fetchWithAuth(`${API_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function fetchSystemStatus() {
  try {
    const res = await fetchWithAuth(`${API_URL}/api/system-status`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null; // backend is completely down
  }
}

export async function listAlerts() {
  const res = await fetchWithAuth(`${API_URL}/api/alerts`);
  if (!res.ok) throw new Error("Failed to load alerts");
  return res.json();
}

export async function acknowledgeAlert(id) {
  const res = await fetchWithAuth(`${API_URL}/api/alerts/${id}/acknowledge`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to acknowledge alert");
  return res.json();
}

export async function getGmailAuthUrl() {
  const res = await fetchWithAuth(`${API_URL}/api/gmail/auth`);
  if (!res.ok) throw new Error("Failed to fetch auth url");
  return (await res.json()).url;
}

export async function getGmailStatus() {
  const res = await fetchWithAuth(`${API_URL}/api/gmail/status`);
  if (!res.ok) throw new Error("Failed to get Gmail status");
  return res.json();
}

export async function disconnectGmail() {
  const res = await fetchWithAuth(`${API_URL}/api/gmail/disconnect`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to disconnect Gmail");
  return res.json();
}

export async function fetchGmailInbox() {
  const res = await fetchWithAuth(`${API_URL}/api/gmail/inbox`);
  if (!res.ok) {
    let msg = "Failed to fetch inbox";
    try {
      const errData = await res.json();
      msg = errData.error || msg;
    } catch(e) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function analyzeGmailMessage(id) {
  const res = await fetchWithAuth(`${API_URL}/api/gmail/analyze/${id}`, { method: "POST" });
  if (!res.ok) {
    let msg = "Analysis failed";
    try {
      const errData = await res.json();
      msg = errData.error || msg;
    } catch(e) {}
    throw new Error(msg);
  }
  return res.json();
}
