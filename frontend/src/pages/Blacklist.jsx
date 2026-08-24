import React, { useEffect, useState } from "react";
import { Shield, Plus, Lock, ListFilter, Calendar } from "lucide-react";
import { listBlacklist, addBlacklist } from "../lib/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";

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

  if (loading && entries.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
        <Card className="p-6">
          <Skeleton className="h-32" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-64" />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Known Threat Blacklist</h1>
        <p className="text-[var(--text-secondary)] mt-2 max-w-3xl">
          Manage known malicious IPs, domains, DKIM keys, and URLs. Analyzed emails matching any entry will be immediately flagged as high risk.
        </p>
      </header>

      <Card className="p-6 md:p-8 border-[var(--border)] shadow-sm">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <Plus size={20} className="text-[var(--accent)]" /> Add Threat Indicator
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all cursor-pointer"
            >
              <option value="ip">IP Address</option>
              <option value="domain">Domain</option>
              <option value="dkim_key">DKIM Key</option>
              <option value="url">URL</option>
            </select>
          </div>

          <div className="flex-[2]">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Indicator Value</label>
            <input
              type="text"
              placeholder="e.g. 198.51.100.20 or paypa1-secure.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
          </div>

          <div className="flex-[1.5]">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Intel Source (Optional)</label>
            <input
              type="text"
              placeholder="e.g. SIH Threat Intel"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
          </div>

          <div className="mt-4 md:mt-0">
            <Button
              type="submit"
              variant="danger"
              disabled={submitting || !value.trim()}
              className="w-full md:w-auto py-2"
              icon={Shield}
            >
              {submitting ? "Adding…" : "Add to Blacklist"}
            </Button>
          </div>
        </form>

        {error && <p className="text-sm font-medium text-[var(--danger)] mt-4">{error}</p>}
      </Card>

      <Card className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ListFilter size={20} className="text-[var(--text-muted)]" /> Blacklisted Indicators
          </h2>
          <Badge variant="neutral">{entries.length} entries</Badge>
        </div>
        
        {entries.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-xl">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-4">
              <Lock size={32} />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">No blacklisted indicators found. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg p-4 gap-4 transition-colors hover:border-[var(--danger)]">
                <div className="flex items-center gap-3">
                  <Badge variant="danger" className="uppercase font-mono w-24 justify-center">
                    {entry.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-[var(--text-primary)] font-mono font-medium truncate max-w-[200px] md:max-w-md" title={entry.value}>
                    {entry.value}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-muted)]">Source:</span> {entry.source || "analyst_entry"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                    <Calendar size={14} /> {new Date(entry.added_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
