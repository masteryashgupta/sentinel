import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCases } from "../lib/api";
import ScoreBadge from "../components/ScoreBadge";

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    listCases()
      .then(setCases)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredCases = cases.filter((c) => {
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      (c.subject || "").toLowerCase().includes(query) ||
      (c.from_address || "").toLowerCase().includes(query) ||
      (c.sender_domain || "").toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === "all" || c.category === categoryFilter;
    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Cases</h1>
        <p className="text-sm text-muted mt-1">All analyzed emails, most recent first.</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <input
            type="text"
            placeholder="Search subject, sender, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-panel border border-line rounded px-3 py-2 text-sm text-gray-200 placeholder-muted/60"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-panel border border-line rounded px-3 py-2 text-sm text-gray-200"
          >
            <option value="all">All Categories</option>
            <option value="phishing">Phishing</option>
            <option value="business_email_compromise">Business Email Compromise (BEC)</option>
            <option value="impersonated">Impersonated</option>
            <option value="suspicious">Suspicious</option>
            <option value="impersonation_risk">Impersonation Risk</option>
            <option value="legitimate">Legitimate</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-panel border border-line rounded px-3 py-2 text-sm text-gray-200"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="escalated">Escalated</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-crimson">{error}</p>}

      {!loading && filteredCases.length === 0 && (
        <div className="border border-line rounded-lg bg-panel p-10 text-center">
          <p className="text-sm text-muted">No cases match your filters.</p>
        </div>
      )}

      <div className="space-y-2">
        {filteredCases.map((c) => (
          <Link
            key={c.id}
            to={`/cases/${c.id}`}
            className="flex items-center justify-between border border-line rounded-lg bg-panel p-4 hover:border-signal/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">{c.subject || "(no subject)"}</p>
              <p className="text-xs text-muted mt-0.5 truncate">
                {c.from_display_name} &lt;{c.from_address}&gt;
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0 ml-4">
              <span className="text-xs text-muted uppercase">{c.status}</span>
              <ScoreBadge score={c.fraud_score} category={c.category} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
