import { useState, useEffect } from "react";
// Triggers GitHub Actions redeploy again
import { Link } from "react-router-dom";
import { Network, Activity, Calendar, ShieldAlert } from "lucide-react";
import { listCampaigns } from "../lib/api";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import StatCard from "../components/ui/StatCard";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    setCampaigns([]);
    
    try {
      const data = await listCampaigns();
      setCampaigns(data);
    } catch (e) {
      console.error(e);
      setError("Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const activeCampaigns = campaigns.filter(c => c.status === "active" || !c.status).length;
  const totalCasesInCampaigns = campaigns.reduce((acc, c) => acc + (c.case_count || 0), 0);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center max-w-5xl mx-auto mt-8">
        <ShieldAlert className="mx-auto text-[var(--danger)] mb-4" size={32} />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error loading campaigns</h3>
        <p className="text-[var(--text-secondary)] mb-6">{error}</p>
        <button onClick={loadCampaigns} className="bg-[var(--accent)] text-white px-4 py-2 rounded font-medium hover:bg-[var(--accent-dim)]">
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Campaigns</h1>
        <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">
          Cases automatically clustered by shared indicators (IP, domain, DKIM key). Tracking campaigns helps identify organized adversaries.
        </p>
      </header>

      {/* Top StatCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          icon={Network} 
          label="Total Campaigns" 
          value={campaigns.length} 
          trend={`${activeCampaigns} active currently`}
          trendUp={true}
        />
        <StatCard 
          icon={Activity} 
          label="Cases in Campaigns" 
          value={totalCasesInCampaigns} 
        />
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-4">
            <Network size={32} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No campaigns detected</h3>
          <p className="text-[var(--text-secondary)] max-w-md">
            Campaigns form automatically once two or more analyzed emails share an origin IP, sender domain, or other indicator.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <Link key={camp.id} to={`/campaigns/${camp.id}`} className="block h-full">
              <Card hoverable className="h-full flex flex-col p-5">
                <div className="flex-1 min-w-0 mb-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-[var(--text-primary)] font-semibold truncate" title={camp.name}>
                      {camp.name}
                    </h4>
                    <Badge variant="info" className="shrink-0">
                      {camp.case_count} cases
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Shared <span className="font-semibold text-[var(--text-primary)]">{camp.shared_indicator_type}</span>
                  </p>
                  <p className="text-sm font-mono text-[var(--text-muted)] mt-1 truncate" title={camp.shared_indicator_value}>
                    {camp.shared_indicator_value}
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] mt-auto">
                  <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                    <Calendar size={14} /> Created {new Date(camp.created_at).toLocaleDateString()}
                  </span>
                  <Badge variant={camp.status === 'active' || !camp.status ? 'warning' : 'neutral'}>
                    {camp.status || 'Active'}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
