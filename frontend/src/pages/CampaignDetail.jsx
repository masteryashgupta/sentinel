import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCampaign } from "../lib/api";
import ScoreBadge from "../components/ScoreBadge";

export default function CampaignDetail() {
  const { id } = useParams();
  const [camp, setCamp] = useState(null);

  useEffect(() => {
    getCampaign(id).then(setCamp);
  }, [id]);

  if (!camp) return <div className="p-8 text-muted text-sm">Loading…</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/campaigns" className="text-xs text-muted hover:text-signal">← Back to campaigns</Link>

      <div className="mt-4 mb-6">
        <h1 className="text-xl font-bold text-gray-100">{camp.name}</h1>
        <p className="text-sm text-muted mt-1">
          {camp.case_count} linked cases · shared {camp.shared_indicator_type}:{" "}
          <span className="text-amber">{camp.shared_indicator_value}</span>
        </p>
      </div>

      <div className="space-y-2">
        {(camp.cases || []).map((c) => (
          <Link
            key={c.id}
            to={`/cases/${c.id}`}
            className="flex items-center justify-between border border-line rounded-lg bg-panel p-4 hover:border-signal/30 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">{c.subject || "(no subject)"}</p>
              <p className="text-xs text-muted mt-0.5 truncate">{c.from_address}</p>
            </div>
            <ScoreBadge score={c.fraud_score} category={c.category} />
          </Link>
        ))}
      </div>
    </div>
  );
}
