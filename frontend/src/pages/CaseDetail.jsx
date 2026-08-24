import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, ShieldAlert, Check, Clock, AlertTriangle } from "lucide-react";
import { getCase, updateCaseStatus, reportUrl, getCaseAuditLog } from "../lib/api";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import LocationMap from "../components/LocationMap";

const STATUSES = ["open", "reviewed", "escalated", "closed"];

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
      getCaseAuditLog(id).then(setAuditLog).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  const getScoreBadge = (score) => {
    if (score >= 80) return <Badge variant="danger">High Risk ({score})</Badge>;
    if (score >= 40) return <Badge variant="warning">Suspicious ({score})</Badge>;
    return <Badge variant="success">Legitimate ({score})</Badge>;
  };

  if (error) {
    return (
      <Card className="p-8 text-center max-w-5xl mx-auto mt-8">
        <ShieldAlert className="mx-auto text-[var(--danger)] mb-4" size={32} />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error loading case</h3>
        <p className="text-[var(--text-secondary)]">{error}</p>
        <Link to="/cases" className="mt-6 inline-block">
          <Button variant="secondary" icon={ArrowLeft}>Back to cases</Button>
        </Link>
      </Card>
    );
  }

  if (!c) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const anomalies = c.header_anomalies || [];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/cases" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors">
          <ArrowLeft size={16} /> Back to cases
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">View as:</span>
          <div className="flex bg-[var(--bg-subtle)] rounded-lg p-1 border border-[var(--border)]">
            <button
              onClick={() => setRole("investigator")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${role === "investigator" ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Investigator
            </button>
            <button
              onClick={() => setRole("viewer")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${role === "viewer" ? "bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              Viewer (Masked)
            </button>
          </div>
        </div>
      </div>

      {c._masked && (
        <div className="flex items-start gap-3 p-4 bg-[var(--warning-soft)] border border-[var(--warning)] rounded-xl text-[var(--warning)]">
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <p className="text-sm">
            <strong className="font-semibold">Privacy Mode Active:</strong> Sensitive fields (sender identity, origin IP, classifier notes, attachment names) are redacted per PS 26106 data minimization requirements. Switch to Investigator view for full access.
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 bg-[var(--bg-panel)] p-6 rounded-xl border border-[var(--border)] shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{c.subject || "(no subject)"}</h1>
            {c.matches_known_bad_indicator && (
              <Badge variant="danger" className="animate-pulse">⚠ Known Threat Match</Badge>
            )}
          </div>
          <p className="text-[var(--text-secondary)]">
            {c.from_display_name} &lt;{c.from_address}&gt;
          </p>
          {c.attribution_category && (
            <div className="pt-2">
              <span className="text-xs font-semibold text-[var(--info)] bg-[#e0f2fe] border border-[var(--info)] rounded-full px-2.5 py-1 uppercase tracking-wider">
                Attribution: {c.attribution_category.replace(/_/g, " ")}
              </span>
            </div>
          )}
        </div>
        <div className="shrink-0">
          {getScoreBadge(c.fraud_score)}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a href={reportUrl(c.id)} target="_blank" rel="noreferrer" className="inline-block">
          <Button variant="primary" icon={Download}>Download Report (PDF)</Button>
        </a>
        
        <div className="flex items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border)] rounded-md px-3 py-1.5 shadow-sm">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Status:</span>
          <select
            value={c.status}
            disabled={updating}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-sm font-medium text-[var(--text-primary)] bg-transparent focus:outline-none cursor-pointer disabled:opacity-50"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {c.campaign && (
          <Link to={`/campaigns/${c.campaign.id}`}>
            <Button variant="secondary" icon={Network}>
              Linked to Campaign ({c.campaign.case_count} cases)
            </Button>
          </Link>
        )}
        
        {c.retention_days && (
          <Badge variant="neutral" className="py-2 px-3 text-sm flex items-center gap-1.5">
            <Clock size={14} /> Retention: {c.retention_days}d
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Header fields</h3>
          <div className="space-y-3">
            <Row label="Return-Path" value={c.return_path} />
            <Row label="Reply-To" value={c.reply_to} />
            <Row label="Message-ID" value={c.message_id} />
            <Row label="Sender domain" value={c.sender_domain} />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Authentication</h3>
          <div className="grid grid-cols-3 gap-4">
            {["spf_result", "dkim_result", "dmarc_result"].map((k) => (
              <div key={k} className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg p-3 text-center">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{k.replace("_result", "")}</p>
                <p className={`font-bold ${c[k] === "pass" ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>{c[k]?.toUpperCase() || "NONE"}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 space-y-4 md:col-span-2">
          <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Header anomalies</h3>
          {anomalies.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No anomalies detected.</p>
          ) : (
            <div className="space-y-3">
              {anomalies.map((a, i) => (
                <div key={i} className="flex items-start gap-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg p-4">
                  <Badge variant={a.severity === 'high' ? 'danger' : (a.severity === 'medium' ? 'warning' : 'neutral')} className="shrink-0 mt-0.5">
                    {a.severity.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{a.type.replace(/_/g, " ")}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{a.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Origin Traceability</h3>
          <div className="space-y-3 mb-6">
            <Row label="IP" value={c.origin_ip} />
            <Row label="Location" value={[c.origin_city, c.origin_region, c.origin_country].filter(Boolean).join(", ")} />
            <Row label="ISP" value={c.origin_isp} />
            <Row label="Likely proxy/hosting" value={c.is_likely_proxy_or_hosting ? "Yes" : "No"} warn={c.is_likely_proxy_or_hosting} />
            <Row label="Domain registrar" value={c.domain_registrar} />
            <Row label="Domain created" value={c.domain_created_at} />
          </div>
          <div className="rounded-lg overflow-hidden border border-[var(--border)]">
            <LocationMap
              lat={c.origin_lat}
              lon={c.origin_lon}
              city={c.origin_city}
              country={c.origin_country}
            />
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Attachments</h3>
            {(c.attachments || []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-2 text-center">No attachments present.</p>
            ) : (
              <div className="space-y-2">
                {c.attachments.map((att, i) => (
                  <div key={i} className="flex items-center justify-between bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg p-3 text-sm">
                    <span className="text-[var(--text-primary)] font-medium truncate pr-4">{att.filename}</span>
                    <Badge variant="neutral" className="shrink-0">{att.mime_type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3">Correlation indicators</h3>
            {(c.indicators || []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-2 text-center">None extracted.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {c.indicators.map((ind) => (
                  <Badge key={ind.id} variant="neutral" className="py-1 px-2.5">
                    <span className="font-medium text-[var(--text-muted)] mr-1">{ind.type}:</span>
                    {ind.value}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Chain of Custody */}
        <Card className="p-6 space-y-4 md:col-span-2">
          <div className="border-b border-[var(--border)] pb-3 mb-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Chain of Custody</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Immutable audit trail required for evidence admissibility and PS 26106 compliance.
            </p>
          </div>
          
          {auditLog.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No audit events yet.</p>
          ) : (
            <ol className="relative border-l-2 border-[var(--bg-subtle)] ml-3 space-y-6">
              {auditLog.map((entry, i) => {
                const isCreated = entry.action === 'case_created';
                return (
                  <li key={entry.id} className="ml-8">
                    <span className={`absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ring-4 ring-[var(--bg-panel)] ${isCreated ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'}`}>
                      {isCreated ? <Check size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {entry.action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Actor: <span className="font-mono bg-[var(--bg-subtle)] px-1 py-0.5 rounded text-[var(--text-primary)]">{entry.actor || "system"}</span>
                          {entry.details && Object.keys(entry.details).length > 0 && (
                            <span className="ml-2 text-[var(--text-muted)]">· {Object.entries(entry.details).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>
                          )}
                        </p>
                      </div>
                      <time className="text-xs font-medium text-[var(--text-muted)] shrink-0">
                        {new Date(entry.created_at).toLocaleString()}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, warn }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[var(--bg-subtle)] last:border-0 text-sm">
      <span className="text-[var(--text-muted)] font-medium">{label}</span>
      <span className={`text-right max-w-[60%] truncate ${warn ? "text-[var(--warning)] font-semibold" : "text-[var(--text-primary)]"}`} title={value}>
        {value || "—"}
      </span>
    </div>
  );
}
