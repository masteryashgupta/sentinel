import { useState } from "react";
import { analyzeEmail } from "../lib/api";
import ScoreBadge from "../components/ScoreBadge";
import SeverityTag from "../components/SeverityTag";

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
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-xl font-bold text-gray-100">Analyze an email</h1>
        <p className="text-sm text-muted mt-1">
          Upload a raw <code className="text-signal">.eml</code> file. Runs header forensics,
          origin tracing, and fraud classification in one pass.
        </p>
      </header>

      <div className="border border-line rounded-lg bg-panel p-6">
        <label className="block">
          <input
            type="file"
            accept=".eml,message/rfc822"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
          />
          <div
            className="border-2 border-dashed border-line hover:border-signal/40 rounded-lg p-10 text-center cursor-pointer transition-colors"
            onClick={() => document.getElementById("file-upload").click()}
          >
            <div className="text-3xl text-signal/60 mb-2">⤒</div>
            <p className="text-sm text-gray-300">
              {file ? file.name : "Click to select a .eml file"}
            </p>
            <p className="text-xs text-muted mt-1">or drag and drop</p>
          </div>
        </label>

        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="mt-4 w-full bg-signal/10 border border-signal/40 text-signal font-semibold py-2.5 rounded hover:bg-signal/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing…" : "Run forensic analysis"}
        </button>

        {error && (
          <div className="mt-4 text-sm text-crimson border border-crimson/30 bg-crimson/5 rounded p-3">
            {error}
          </div>
        )}
      </div>

      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }) {
  const { analysis } = result;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between border border-line rounded-lg bg-panel p-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">Fraud assessment</p>
          <p className="text-gray-200 mt-1">{analysis.email.subject || "(no subject)"}</p>
          <p className="text-sm text-muted mt-0.5">
            From: {analysis.email.from_display_name} &lt;{analysis.email.from_address}&gt;
          </p>
        </div>
        <ScoreBadge score={analysis.scoring.fraud_score} category={analysis.scoring.category} size="lg" />
      </div>

      <Section title="Authentication">
        <div className="grid grid-cols-3 gap-3">
          {["spf", "dkim", "dmarc"].map((k) => (
            <div key={k} className="border border-line rounded p-3">
              <p className="text-[10px] text-muted uppercase">{k}</p>
              <p className={`font-bold mt-1 ${analysis.authentication[k] === "pass" ? "text-signal" : "text-crimson"}`}>
                {analysis.authentication[k]}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Header anomalies">
        {analysis.header_anomalies.length === 0 ? (
          <p className="text-sm text-muted">None detected.</p>
        ) : (
          <div className="space-y-2">
            {analysis.header_anomalies.map((a, i) => (
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

      <Section title="Origin traceability">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Row label="IP" value={analysis.origin.ip} />
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
            label="Likely proxy/hosting"
            value={analysis.origin.is_likely_proxy_or_hosting ? "Yes (Heuristic)" : "No"}
            warn={analysis.origin.is_likely_proxy_or_hosting}
          />
          <Row label="Domain registrar" value={analysis.domain_intelligence?.registrar} />
          <Row
            label="Newly registered domain"
            value={analysis.domain_intelligence?.is_newly_registered ? "Yes" : "No"}
            warn={analysis.domain_intelligence?.is_newly_registered}
          />
        </div>
      </Section>

      <Section title="Attachments">
        {(analysis.email.attachments || []).length === 0 ? (
          <p className="text-sm text-muted">No attachments present in email.</p>
        ) : (
          <div className="space-y-2">
            {analysis.email.attachments.map((att, i) => (
              <div key={i} className="flex items-center justify-between border border-line rounded p-3 text-sm">
                <span className="text-gray-200 font-medium">{att.filename}</span>
                <span className="text-xs text-muted font-mono">{att.mime_type}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {analysis.detection.llm && !analysis.detection.llm.error && (
        <Section title="AI classification">
          <p className="text-sm text-gray-300">
            {analysis.detection.llm.reasoning || "—"}
          </p>
          {analysis.detection.llm.flagged_phrases?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.detection.llm.flagged_phrases.map((p, i) => (
                <span key={i} className="text-xs border border-amber/30 text-amber bg-amber/5 rounded px-2 py-1">
                  "{p}"
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      <div className="text-xs text-muted border border-line rounded p-3">
        Case saved. View it under <strong className="text-gray-300">Cases</strong> to download the forensic report or track investigation status.
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-line rounded-lg bg-panel p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, warn }) {
  return (
    <div className="flex justify-between border-b border-line/50 py-1.5">
      <span className="text-muted">{label}</span>
      <span className={warn ? "text-amber font-medium" : "text-gray-300"}>{value || "—"}</span>
    </div>
  );
}
