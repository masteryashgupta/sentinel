import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, ShieldAlert, Activity, Network, Clock } from "lucide-react";
import { listCases, listCampaigns } from "../lib/api";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import StatCard from "../components/ui/StatCard";
import { formatDistanceToNow } from "../lib/utils";

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, highRisk: 0, campaigns: 0 });
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    setCases([]);
    setStats({ total: 0, highRisk: 0, campaigns: 0 });

    try {
      const [data, campaignsData] = await Promise.all([
        listCases(),
        listCampaigns().catch(() => [])
      ]);
      setCases(data);
      setStats({
        total: data.length,
        highRisk: data.filter(c => c.fraud_score >= 50).length,
        campaigns: campaignsData.length
      });
    } catch (e) {
      console.error(e);
      setError("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const filteredCases = cases.filter(c => {
    if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
    if (statusFilter !== "all" && (c.status || "open") !== statusFilter) return false;
    if (search && !c.subject?.toLowerCase().includes(search.toLowerCase()) && 
        !c.from_address?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getScoreBadge = (score, category) => {
    let variant = "success";
    if (score >= 80) variant = "danger";
    else if (score >= 40) variant = "warning";
    
    return (
      <div className="flex flex-col items-end gap-1">
        {category && (
          <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] mb-1 block text-right">
            {category.replace(/_/g, ' ')}
          </span>
        )}
        <Badge variant={variant} className="whitespace-nowrap">Score: {score}/100</Badge>
      </div>
    );
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


  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <ShieldAlert className="mx-auto text-[var(--danger)] mb-4" size={32} />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error loading cases</h3>
        <p className="text-[var(--text-secondary)]">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top StatCards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={Activity} 
          label="Total Cases Analyzed" 
          value={stats.total} 
        />
        <StatCard 
          icon={ShieldAlert} 
          label="High-Risk Cases" 
          value={stats.highRisk} 
          trend={`${stats.total > 0 ? Math.round((stats.highRisk / stats.total) * 100) : 0}% of total`}
          trendUp={true}
        />
        <StatCard 
          icon={Network} 
          label="Active Campaigns" 
          value={stats.campaigns} 
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border)] shadow-[0_2px_8px_var(--shadow)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search subject, sender, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
          />
        </div>

        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="phishing">Phishing</option>
              <option value="business_email_compromise">BEC</option>
              <option value="impersonated">Impersonated</option>
              <option value="suspicious">Suspicious</option>
              <option value="legitimate">Legitimate</option>
            </select>
          </div>

          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="escalated">Escalated</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-4">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No cases match your filters</h3>
          <p className="text-[var(--text-secondary)]">Try adjusting your search criteria or filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCases.map((c) => (
            <Link key={c.id} to={`/cases/${c.id}`} className="block h-full">
              <Card hoverable className="h-full flex flex-col p-5">
                <div className="flex-1 min-w-0 mb-4">
                  <h4 className="text-[var(--text-primary)] font-semibold truncate mb-1" title={c.subject}>
                    {c.subject || "(no subject)"}
                  </h4>
                  <p className="text-sm text-[var(--text-secondary)] truncate" title={`${c.from_display_name} <${c.from_address}>`}>
                    {c.from_display_name || c.from_address || "Unknown sender"}
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Risk Score</span>
                    {getScoreBadge(c.fraud_score, c.category)}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(c.status)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(c.created_at))} ago
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
