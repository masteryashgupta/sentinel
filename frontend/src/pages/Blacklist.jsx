import { useEffect, useState } from "react";
import { listBlacklist, addBlacklist } from "../lib/api";

export default function Blacklist() {
  const [entries, setEntries] = useState([]);
  const [type, setType] = useState("ip");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadList();
  }, []);

  function loadList() {
    listBlacklist()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await addBlacklist(type, value.trim(), source.trim() || "analyst_entry");
      setValue("");
      setSource("");
      loadList();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Known Threat Blacklist</h1>
        <p className="text-sm text-muted mt-1">
          Manage known malicous IPs, domains, DKIM keys, and URLs. Analyzed emails matching any entry will be flagged.
        </p>
      </header>

      <div className="border border-line rounded-lg bg-panel p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Add Threat Indicator</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs text-muted mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-background border border-line rounded px-3 py-2 text-sm text-gray-200"
            >
              <option value="ip">IP Address</option>
              <option value="domain">Domain</option>
              <option value="dkim_key">DKIM Key</option>
              <option value="url">URL</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Indicator Value</label>
            <input
              type="text"
              placeholder="e.g. 198.51.100.20 or paypa1-secure.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-background border border-line rounded px-3 py-2 text-sm text-gray-200 placeholder-muted/50"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1">Intel Source / Note</label>
            <input
              type="text"
              placeholder="e.g. SIH Threat Intel / Incident #104"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-background border border-line rounded px-3 py-2 text-sm text-gray-200 placeholder-muted/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="bg-crimson/20 border border-crimson/40 text-crimson font-semibold py-2 px-4 rounded hover:bg-crimson/30 transition-colors disabled:opacity-40"
          >
            {submitting ? "Adding…" : "Add to Blacklist"}
          </button>
        </form>

        {error && <p className="text-xs text-crimson mt-3">{error}</p>}
      </div>

      <div className="border border-line rounded-lg bg-panel p-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Blacklisted Indicators ({entries.length})</h2>
        {loading && <p className="text-sm text-muted">Loading blacklist…</p>}
        {!loading && entries.length === 0 && (
          <p className="text-sm text-muted">No blacklisted indicators found. Add one above.</p>
        )}

        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border border-line/50 rounded p-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase px-2 py-0.5 border border-line rounded text-muted font-mono">{entry.type}</span>
                <span className="text-gray-200 font-mono font-medium">{entry.value}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <span>{entry.source || "analyst_entry"}</span>
                <span>{new Date(entry.added_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
