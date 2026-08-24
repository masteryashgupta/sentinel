import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCampaigns } from "../lib/api";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCampaigns().then(setCampaigns).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Campaigns</h1>
        <p className="text-sm text-muted mt-1">
          Cases automatically clustered by shared indicators (IP, domain, DKIM key).
        </p>
      </header>

      {loading && <p className="text-sm text-muted">Loading…</p>}

      {!loading && campaigns.length === 0 && (
        <div className="border border-line rounded-lg bg-panel p-10 text-center">
          <p className="text-sm text-muted">
            No campaigns detected yet. Campaigns form automatically once two or more
            analyzed emails share an origin IP, sender domain, or other indicator.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {campaigns.map((camp) => (
          <Link
            key={camp.id}
            to={`/campaigns/${camp.id}`}
            className="flex items-center justify-between border border-line rounded-lg bg-panel p-4 hover:border-amber/30 transition-colors"
          >
            <div>
              <p className="text-sm text-gray-200">{camp.name}</p>
              <p className="text-xs text-muted mt-0.5">
                Shared {camp.shared_indicator_type}: {camp.shared_indicator_value}
              </p>
            </div>
            <span className="text-xs border border-amber/30 text-amber bg-amber/5 rounded px-2 py-1">
              {camp.case_count} cases
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
