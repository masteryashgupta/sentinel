import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Network, Calendar, Clock, ArrowRight } from "lucide-react";
import { getCampaign } from "../lib/api";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import { formatDistanceToNow } from "../lib/utils";

export default function CampaignDetail() {
  const { id } = useParams();
  const [camp, setCamp] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCampaign(id).then(setCamp).catch(e => setError(e.message));
  }, [id]);

  const getScoreBadge = (score) => {
    if (score >= 80) return <Badge variant="danger">High Risk ({score})</Badge>;
    if (score >= 40) return <Badge variant="warning">Suspicious ({score})</Badge>;
    return <Badge variant="success">Legitimate ({score})</Badge>;
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return <Badge variant="warning">Open</Badge>;
      case 'reviewed': return <Badge variant="info">Reviewed</Badge>;
      case 'escalated': return <Badge variant="danger">Escalated</Badge>;
      case 'closed': return <Badge variant="neutral">Closed</Badge>;
      default: return <Badge variant="neutral">{status || 'Unknown'}</Badge>;
    }
  };

  if (error) {
    return (
      <Card className="p-8 text-center max-w-5xl mx-auto mt-8">
        <ShieldAlert className="mx-auto text-[var(--danger)] mb-4" size={32} />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error loading campaign</h3>
        <p className="text-[var(--text-secondary)]">{error}</p>
        <Link to="/campaigns" className="mt-6 inline-block">
          <button className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-dim)] flex items-center gap-2">
            <ArrowLeft size={16} /> Back to campaigns
          </button>
        </Link>
      </Card>
    );
  }

  if (!camp) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-6 w-32" />
        <Card className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96" />
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link to="/campaigns" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors w-fit">
        <ArrowLeft size={16} /> Back to campaigns
      </Link>

      <Card className="p-6 md:p-8 border-[var(--border)] shadow-sm bg-[var(--bg-panel)] relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Network size={160} />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{camp.name}</h1>
            <Badge variant={camp.status === 'active' || !camp.status ? 'warning' : 'neutral'} className="w-fit text-sm py-1 px-3">
              {camp.status || 'Active Campaign'}
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Linked Cases:</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">{camp.case_count}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Shared {camp.shared_indicator_type}:</span>
              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{camp.shared_indicator_value}</span>
            </div>

            <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Created:</span>
              <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar size={14} /> {new Date(camp.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          Linked Cases <Badge variant="neutral" className="font-normal">{camp.cases?.length || 0}</Badge>
        </h2>
        
        {(camp.cases || []).length === 0 ? (
          <Card className="p-8 text-center text-[var(--text-muted)] border-dashed">
            No cases currently linked to this campaign.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(camp.cases || []).map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="block h-full">
                <Card hoverable className="h-full flex flex-col p-4">
                  <div className="flex-1 min-w-0 mb-4">
                    <h4 className="text-[var(--text-primary)] font-semibold truncate mb-1" title={c.subject}>
                      {c.subject || "(no subject)"}
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)] truncate" title={c.from_address}>
                      {c.from_address || "Unknown sender"}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-auto">
                    <div className="flex items-center gap-2">
                      {getScoreBadge(c.fraud_score)}
                      {getStatusBadge(c.status)}
                    </div>
                    <div className="flex items-center gap-1 text-[var(--accent)] font-medium text-xs">
                      View <ArrowRight size={14} />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
