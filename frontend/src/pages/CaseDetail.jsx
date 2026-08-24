import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCase, updateCaseStatus, reportUrl, getCaseAuditLog } from "../lib/api";
import ScoreBadge from "../components/ScoreBadge";
import SeverityTag from "../components/SeverityTag";
import LocationMap from "../components/LocationMap";

const STATUSES = ["open", "reviewed", "escalated", "closed"];

// Action label styles for chain-of-custody log
const ACTION_STYLES = {
  case_created: { label: "Case Created", color: "text-signal", icon: "✦" },
  status_changed_to_open: { label: "Status → Open", color: "text-muted", icon: "○" },
  status_changed_to_reviewed: { label: "Status → Reviewed", color: "text-signal", icon: "✓" },
  status_changed_to_escalated: { label: "Status → Escalated", color: "text-amber", icon: "↑" },
  status_changed_to_closed: { label: "Status → Closed", color: "text-muted", icon: "✕" },
};

export default function CaseDetail() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [role, setRole] = useState("investigator");

  useEffect(() => {
    getCase(id, role).then(setC).catch((e) => setError(e.message));
  }, [id, role]);

  useEffect(() => {
    getCaseAuditLog(id).then(setAuditLog).catch(() => {});
  }, [id]);

  async function handleStatusChange(status) {
    setUpdating(true);
    try {
      const updated = await updateCaseStatus(id, status, "analyst");
      setC((prev) => ({ ...prev, ...updated }));
      // Re-fetch audit log after status change
      getCaseAuditLog(id).then(setAuditLog).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  if (error) return <div className="p-8 text-crimson text-sm">{error}</div>;
  if (!c) return <div className="p-8 text-muted text-sm">Loading…</div>;

  const anomalies = c.header_anomalies || [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <Link to="/cases" className="text-xs text-muted hover:text-signal">← Back to cases</Link>
        {/* Role toggle for demoing data masking */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">View as:</span>
          <button
            onClick={() => setRole("investigator")}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${role === "investigator" ? "border-signal/50 text-signal bg-signal/10" : "border-line text-muted hover:border-signal/30"}`}
          >
            🔍 Investigator
          </button>
          <button
            onClick={() => setRole("viewer")}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${role === "viewer" ? "border-amber/50 text-amber bg-amber/10" : "border-line text-muted hover:border-amber/30"}`}
          >
            👁 Viewer (Masked)
          </button>
        </div>
      </div>

      {c._masked && (
        <div className="mb-4 border border-amber/30 bg-amber/5 text-amber text-xs rounded px-3 py-2">
          🔒 <strong>Privacy Mode Active:</strong> Sensitive fields (sender identity, origin IP, classifier notes, attachment names) are redacted per PS 26106 data minimization requirements. Switch to <em>Investigator</em> view for full access.
        </div>
      )}

      <div className="flex items-start justify-between mt-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-100">{c.subject || "(no subject)"}</h1>
            {c.matches_known_bad_indicator && (
              <span className="text-xs font-semibold px-2 py-0.5 border border-crimson/50 text-crimson bg-crimson/10 rounded animate-pulse">
                ⚠ Known Threat Match
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-1">
            {c.from_display_name} &lt;{c.from_address}&gt;
          </p>
          {c.attribution_category && (
            <div className="mt-2 text-xs text-amber font-mono bg-amber/5 border border-amber/20 rounded px-2.5 py-1 inline-block">
              Attribution: <span className="font-bold uppercase tracking-wider">{c.attribution_category.replace(/_/g, " ")}</span>
            </div>
          )}
        </div>
        <ScoreBadge score={c.fraud_score} category={c.category} size="lg" />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <a
          href={reportUrl(c.id)}
          target="_blank"
          rel="noreferrer"
          className="text-xs border border-signal/40 text-signal bg-signal/10 rounded px-3 py-1.5 hover:bg-signal/20"
        >
          ⬇ Download forensic report (PDF)
        </a>
        <select
          value={c.status}
          disabled={updating}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="text-xs bg-panel border border-line rounded px-2 py-1.5 text-gray-300"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {c.campaign && (
          <Link
            to={`/campaigns/${c.campaign.id}`}
            className="text-xs border border-amber/40 text-amber bg-amber/10 rounded px-3 py-1.5 hover:bg-amber/20"
          >
            ◈ Linked to campaign ({c.campaign.case_count} cases)
          </Link>
        )}
        {c.retention_days && (
          <span className="text-xs text-muted border border-line rounded px-2 py-1.5">
            ⏱ Retention: {c.retention_days}d
          </span>
        )}
      </div>

      <Section title="Header fields">
        <Row label="Return-Path" value={c.return_path} />
        <Row label="Reply-To" value={c.reply_to} />
        <Row label="Message-ID" value={c.message_id} />
        <Row label="Sender domain" value={c.sender_domain} />
      </Section>

      <Section title="Authentication">
        <div className="grid grid-cols-3 gap-3">
          {["spf_result", "dkim_result", "dmarc_result"].map((k) => (
            <div key={k} className="border border-line rounded p-3">
              <p className="text-[10px] text-muted uppercase">{k.replace("_result", "")}</p>
              <p className={`font-bold mt-1 ${c[k] === "pass" ? "text-signal" : "text-crimson"}`}>{c[k]}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Header anomalies">
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted">None detected.</p>
        ) : (
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 border border-line rounded p-3">
                <SeverityTag severity={a.severity} />
                <div>
                  <p className="text-sm text-gray-200">{a.type.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted mt-0.5">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Origin Traceability & Geolocation">
        <div className="mb-4">
          <Row label="IP" value={c.origin_ip} />
          <Row label="Location" value={[c.origin_city, c.origin_region, c.origin_country].filter(Boolean).join(", ")} />
          <Row label="ISP" value={c.origin_isp} />
          <Row label="Likely proxy/hosting" value={c.is_likely_proxy_or_hosting ? "Yes" : "No"} warn={c.is_likely_proxy_or_hosting} />
          <Row label="Domain registrar" value={c.domain_registrar} />
          <Row label="Domain created" value={c.domain_created_at} />
        </div>
        <LocationMap
          lat={c.origin_lat}
          lon={c.origin_lon}
          city={c.origin_city}
          country={c.origin_country}
        />
      </Section>

      <Section title="Attachments">
        {(c.attachments || []).length === 0 ? (
          <p className="text-sm text-muted">No attachments present in email.</p>
        ) : (
          <div className="space-y-2">
            {c.attachments.map((att, i) => (
              <div key={i} className="flex items-center justify-between border border-line rounded p-3 text-sm">
                <span className="text-gray-200 font-medium">{att.filename}</span>
                <span className="text-xs text-muted font-mono">{att.mime_type}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Correlation indicators">
        {(c.indicators || []).length === 0 ? (
          <p className="text-sm text-muted">None extracted.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {c.indicators.map((ind) => (
              <span key={ind.id} className="text-xs border border-line rounded px-2 py-1 text-gray-300">
                {ind.type}: {ind.value}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Chain of Custody — PS 26106 evidence preservation & logging requirement */}
      <Section title="Chain of Custody">
        <p className="text-xs text-muted mb-4">
          Immutable audit trail of all actions taken on this case. Required for evidence admissibility and PS 26106 compliance.
        </p>
        {auditLog.length === 0 ? (
          <p className="text-sm text-muted">No audit events yet.</p>
        ) : (
          <ol className="relative border-l border-line ml-2 space-y-0">
            {auditLog.map((entry, i) => {
              const style = ACTION_STYLES[entry.action] || { label: entry.action.replace(/_/g, " "), color: "text-muted", icon: "·" };
              return (
                <li key={entry.id} className="ml-6 pb-5">
                  <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full border border-line bg-background text-[10px] text-signal">
                    {style.icon}
                  </span>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-semibold ${style.color}`}>{style.label}</p>
                      <p className="text-xs text-muted mt-0.5">
                        Actor: <span className="font-mono text-gray-300">{entry.actor || "system"}</span>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <span> · {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
                        )}
                      </p>
                    </div>
                    <time className="text-[10px] text-muted font-mono shrink-0 ml-4 mt-0.5">
                      {new Date(entry.created_at).toLocaleString()}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-line rounded-lg bg-panel p-6 mb-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, warn }) {
  return (
    <div className="flex justify-between border-b border-line/50 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={warn ? "text-amber font-medium" : "text-gray-300"}>{value || "—"}</span>
    </div>
  );
}
