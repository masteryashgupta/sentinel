import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAlerts, acknowledgeAlert } from "../lib/api";
import ScoreBadge from "../components/ScoreBadge";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  function loadAlerts() {
    listAlerts()
      .then(setAlerts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function handleAck(id) {
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Real-Time Threat Alerts</h1>
        <p className="text-sm text-muted mt-1">
          High-confidence threat detections (Fraud Score ≥ 75) requiring analyst review.
        </p>
      </header>

      {loading && <p className="text-sm text-muted">Loading alerts…</p>}
      {error && <p className="text-sm text-crimson mb-4">{error}</p>}

      {!loading && alerts.length === 0 && (
        <div className="border border-line rounded-lg bg-panel p-10 text-center">
          <p className="text-sm text-muted">No high-risk threat alerts detected yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`border rounded-lg p-5 flex items-center justify-between transition-colors ${
              a.acknowledged
                ? "border-line bg-panel opacity-60"
                : "border-crimson/40 bg-crimson/5 shadow-glow"
            }`}
          >
            <div className="min-w-0 pr-4">
              <div className="flex items-center gap-3 mb-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    a.acknowledged
                      ? "bg-line text-muted"
                      : "bg-crimson/20 text-crimson animate-pulse"
                  }`}
                >
                  {a.acknowledged ? "ACKNOWLEDGED" : "UNACKNOWLEDGED THREAT"}
                </span>
                <span className="text-xs text-muted">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-100 truncate">{a.message}</p>
              {a.cases && (
                <Link
                  to={`/cases/${a.case_id}`}
                  className="text-xs text-signal hover:underline mt-1 inline-block"
                >
                  View Case →
                </Link>
              )}
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {a.cases && (
                <ScoreBadge score={a.cases.fraud_score} category={a.cases.category} />
              )}
              {!a.acknowledged && (
                <button
                  onClick={() => handleAck(a.id)}
                  className="text-xs border border-signal/40 text-signal bg-signal/10 px-3 py-1.5 rounded hover:bg-signal/20 font-semibold"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
