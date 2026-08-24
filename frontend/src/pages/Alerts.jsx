import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, ShieldAlert, Check, ArrowRight } from "lucide-react";
import { listAlerts, acknowledgeAlert } from "../lib/api";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    setAlerts([]);
    
    try {
      const data = await listAlerts();
      setAlerts(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

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

  const getScoreBadge = (score) => {
    if (score >= 80) return <Badge variant="danger">High Risk ({score})</Badge>;
    if (score >= 40) return <Badge variant="warning">Suspicious ({score})</Badge>;
    return <Badge variant="success">Legitimate ({score})</Badge>;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4 pt-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center max-w-5xl mx-auto mt-8">
        <ShieldAlert className="mx-auto text-[var(--danger)] mb-4" size={32} />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error loading alerts</h3>
        <p className="text-[var(--text-secondary)] mb-6">{error}</p>
        <button onClick={loadAlerts} className="bg-[var(--accent)] text-white px-4 py-2 rounded font-medium hover:bg-[var(--accent-dim)]">
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Real-Time Threat Alerts</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          High-confidence threat detections (Fraud Score ≥ 75) requiring analyst review.
        </p>
      </header>

      {alerts.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-4">
            <Zap size={32} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No high-risk alerts</h3>
          <p className="text-[var(--text-secondary)]">All clear! No critical threats detected recently.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <Card 
              key={a.id}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                a.acknowledged
                  ? "bg-[var(--bg-primary)] opacity-70 border-[var(--border)]"
                  : "bg-[var(--warning-soft)] border-[var(--warning)] shadow-sm"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Badge 
                    variant={a.acknowledged ? "neutral" : "danger"} 
                    className={a.acknowledged ? "" : "animate-pulse"}
                  >
                    {a.acknowledged ? "ACKNOWLEDGED" : "UNACKNOWLEDGED THREAT"}
                  </Badge>
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                
                <p className="text-base font-semibold text-[var(--text-primary)] mb-2 line-clamp-2">
                  {a.message}
                </p>
                
                {a.cases && (
                  <Link
                    to={`/cases/${a.case_id}`}
                    className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-dim)] flex items-center gap-1 w-fit"
                  >
                    View Case <ArrowRight size={14} />
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-4 shrink-0 sm:flex-col sm:items-end">
                {a.cases && getScoreBadge(a.cases.fraud_score)}
                
                {!a.acknowledged && (
                  <Button 
                    variant="primary"
                    onClick={() => handleAck(a.id)}
                    icon={Check}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
