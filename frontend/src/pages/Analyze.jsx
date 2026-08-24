import React, { useState } from "react";
import { UploadCloud, File, AlertCircle, Shield, Check, X, ShieldAlert, Cpu } from "lucide-react";
import { analyzeEmail } from "../lib/api";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function Analyze() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await analyzeEmail(file);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analyze Email</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Upload a raw <code className="text-xs bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border)]">.eml</code> file. Runs header forensics, origin tracing, and fraud classification in one pass.
        </p>
      </header>

      <Card className="p-6 md:p-8 border-[var(--border)] shadow-sm">
        <label className="block w-full">
          <input
            type="file"
            accept=".eml,message/rfc822"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
          />
          <div
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
              file 
                ? "border-[var(--accent)] bg-[var(--accent)]/5" 
                : "border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-subtle)]"
            }`}
            onClick={() => document.getElementById("file-upload").click()}
          >
            {file ? (
              <File size={48} className="text-[var(--accent)] mb-4" />
            ) : (
              <UploadCloud size={48} className="text-[var(--text-muted)] mb-4" />
            )}
            
            <p className={`text-base font-medium mb-1 ${file ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              {file ? file.name : "Click to select a .eml file"}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {file ? (file.size / 1024).toFixed(2) + " KB" : "or drag and drop here"}
            </p>
          </div>
        </label>

        <Button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="w-full mt-6 py-3"
          icon={Shield}
        >
          {loading ? "Analyzing forensics..." : "Run forensic analysis"}
        </Button>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--danger-soft)] border border-[var(--danger)] flex items-start gap-3 text-[var(--danger)]">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </Card>

      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }) {
  const { analysis } = result;

  const getScoreBadge = (score, category) => {
    let variant = "success";
    if (score >= 80) variant = "danger";
    else if (score >= 40) variant = "warning";
    
    return (
      <div className="flex items-center gap-2">
        {category && <Badge variant="neutral">{category.replace(/_/g, ' ').toUpperCase()}</Badge>}
        <Badge variant={variant} className="text-sm px-3 py-1">Score: {score}</Badge>
      </div>
    );
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <Badge variant="danger">Critical</Badge>;
      case 'high': return <Badge variant="warning">High</Badge>;
      case 'medium': return <Badge variant="info">Medium</Badge>;
      case 'low': return <Badge variant="neutral">Low</Badge>;
      default: return <Badge variant="neutral">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6 mt-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl p-6">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Fraud assessment complete</p>
          <h2 className="text-lg font-bold text-[var(--text-primary)] truncate max-w-lg mb-1" title={analysis.email.subject}>
            {analysis.email.subject || "(no subject)"}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            From: <span className="font-medium text-[var(--text-primary)]">{analysis.email.from_display_name}</span> &lt;{analysis.email.from_address}&gt;
          </p>
        </div>
        {getScoreBadge(analysis.scoring.fraud_score, analysis.scoring.category)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield size={16} /> Authentication
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {["spf", "dkim", "dmarc"].map((k) => (
              <div key={k} className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg p-3 text-center">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">{k}</p>
                <p className="font-bold flex items-center justify-center gap-1 text-[var(--text-primary)]">
                  {analysis.authentication[k] === "pass" ? (
                    <><Check size={14} className="text-[var(--success)]" /> Pass</>
                  ) : (
                    <><X size={14} className="text-[var(--danger)]" /> Fail</>
                  )}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {analysis.detection.llm && !analysis.detection.llm.error && (
          <Card className="p-6 border-[var(--accent)]/30 bg-[var(--accent)]/5">
            <h3 className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu size={16} /> AI Classification
            </h3>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">
              {analysis.detection.llm.reasoning || "No reasoning provided."}
            </p>
            {analysis.detection.llm.flagged_phrases?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {analysis.detection.llm.flagged_phrases.map((p, i) => (
                  <Badge key={i} variant="warning" className="font-normal italic">
                    "{p}"
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
          <ShieldAlert size={16} /> Header Anomalies
        </h3>
        {analysis.header_anomalies.length === 0 ? (
          <div className="text-center py-6 bg-[var(--bg-subtle)] rounded-lg border border-dashed border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)]">No anomalies detected in headers.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.header_anomalies.map((a, i) => (
              <div key={i} className="flex items-start gap-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-4 shadow-sm">
                <div className="pt-0.5">{getSeverityBadge(a.severity)}</div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{a.type.replace(/_/g, " ")}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 overflow-hidden">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Origin Traceability
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-subtle)]">
          <Row label="IP Address" value={analysis.origin.ip} />
          <Row label="Country" value={analysis.origin.country} />
          <Row label="Region" value={analysis.origin.region} />
          <Row label="City" value={analysis.origin.city} />
          <Row label="ISP" value={analysis.origin.isp} />
          <Row label="Reverse DNS" value={analysis.origin.reverse_dns} />
          <Row
            label="Tor Exit Node"
            value={analysis.origin.is_tor_exit_node ? "Yes (Confirmed)" : "No"}
            warn={analysis.origin.is_tor_exit_node}
          />
          <Row
            label="Proxy/Hosting"
            value={analysis.origin.is_likely_proxy_or_hosting ? "Yes (Heuristic)" : "No"}
            warn={analysis.origin.is_likely_proxy_or_hosting}
          />
          <Row label="Domain Registrar" value={analysis.domain_intelligence?.registrar} />
          <Row
            label="Newly Registered"
            value={analysis.domain_intelligence?.is_newly_registered ? "Yes" : "No"}
            warn={analysis.domain_intelligence?.is_newly_registered}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Attachments
        </h3>
        {(analysis.email.attachments || []).length === 0 ? (
          <div className="text-center py-6 bg-[var(--bg-subtle)] rounded-lg border border-dashed border-[var(--border)]">
            <p className="text-sm text-[var(--text-secondary)]">No attachments present in email.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {analysis.email.attachments.map((att, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 text-sm">
                <span className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <File size={16} className="text-[var(--text-muted)]" /> {att.filename}
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-mono px-2 py-1 bg-[var(--bg-subtle)] rounded">{att.mime_type}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="text-sm text-center text-[var(--text-secondary)] bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg p-4">
        Case saved automatically. View it under <strong className="text-[var(--text-primary)]">Cases</strong> to download the full forensic PDF report or track investigation status.
      </div>
    </div>
  );
}

function Row({ label, value, warn }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] p-3 last:border-b-0 even:border-l even:border-[var(--border)]">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <span className={`text-sm ${warn ? "text-[var(--danger)] font-bold flex items-center gap-1" : "text-[var(--text-primary)]"}`}>
        {warn && <AlertCircle size={14} />}
        {value || "—"}
      </span>
    </div>
  );
}
