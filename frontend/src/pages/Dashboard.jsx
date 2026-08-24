import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ShieldAlert, Network, Zap, ArrowRight, UploadCloud, Search } from "lucide-react";
import { listCases, listCampaigns, listAlerts } from "../lib/api";
import StatCard from "../components/ui/StatCard";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import DonutChart from "../components/ui/DonutChart";
import { formatDistanceToNow } from "../lib/utils";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    cases: [],
    campaigns: [],
    alerts: [],
    stats: {
      totalCases: 0,
      highRisk: 0,
      activeCampaigns: 0,
      unackAlerts: 0
    },
    riskDistribution: []
  });

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    setData({
      cases: [],
      campaigns: [],
      alerts: [],
      stats: { totalCases: 0, highRisk: 0, activeCampaigns: 0, unackAlerts: 0 },
      riskDistribution: []
    });

    try {
      const [casesRes, campaignsRes, alertsRes] = await Promise.all([
        listCases().catch(() => []),
        listCampaigns().catch(() => []),
        listAlerts().catch(() => [])
      ]);

      const cases = Array.isArray(casesRes) ? casesRes : [];
      const campaigns = Array.isArray(campaignsRes) ? campaignsRes : [];
      const alerts = Array.isArray(alertsRes) ? alertsRes : [];

      // Compute Stats
      const highRisk = cases.filter(c => c.fraud_score >= 50).length;
      const activeCampaigns = campaigns.length; // The endpoint returns active campaigns or we count all of them per instructions
      const unackAlerts = alerts.filter(a => !a.acknowledged).length;

      // Compute Risk Distribution
      const counts = {
        legitimate: 0,
        suspicious: 0,
        phishing: 0,
        business_email_compromise: 0
      };
      cases.forEach(c => {
        if (c.category && counts[c.category] !== undefined) {
          counts[c.category]++;
        }
      });

      const riskDistribution = [
        { label: "Legitimate", value: counts.legitimate, color: "var(--accent)" },
        { label: "Suspicious", value: counts.suspicious, color: "var(--warning)" },
        { label: "Phishing", value: counts.phishing, color: "var(--danger)" },
        { label: "BEC", value: counts.business_email_compromise, color: "var(--info)" },
      ];

      setData({
        cases: cases.slice(0, 5), // last 5
        campaigns,
        alerts,
        stats: {
          totalCases: cases.length,
          highRisk,
          activeCampaigns,
          unackAlerts
        },
        riskDistribution
      });
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getScoreBadge = (score) => {
    if (score >= 80) return <Badge variant="danger">High Risk ({score})</Badge>;
    if (score >= 40) return <Badge variant="warning">Suspicious ({score})</Badge>;
    return <Badge variant="success">Legitimate ({score})</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-48 mb-6" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center max-w-5xl mx-auto mt-8">
        <ShieldAlert className="mx-auto text-[var(--danger)] mb-4" size={32} />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Error loading dashboard</h3>
        <p className="text-[var(--text-secondary)] mb-6">{error}</p>
        <button onClick={loadDashboard} className="bg-[var(--accent)] text-white px-4 py-2 rounded font-medium hover:bg-[var(--accent-dim)]">
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top StatCards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Activity} 
          label="Total Cases Analyzed" 
          value={data.stats.totalCases} 
          trend="All time"
          trendUp={false}
        />
        <StatCard 
          icon={ShieldAlert} 
          label="High-Risk Cases" 
          value={data.stats.highRisk} 
          trend={`${data.stats.totalCases > 0 ? Math.round((data.stats.highRisk / data.stats.totalCases) * 100) : 0}% of total`}
          trendUp={true}
        />
        <StatCard 
          icon={Network} 
          label="Active Campaigns" 
          value={data.stats.activeCampaigns} 
        />
        <StatCard 
          icon={Zap} 
          label="Unacknowledged Alerts" 
          value={data.stats.unackAlerts} 
          className={data.stats.unackAlerts > 0 ? "border-[var(--warning)] bg-[var(--warning-soft)]" : ""}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column: Recent Cases */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Recent Cases</h2>
            <Link to="/cases" className="text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-dim)] flex items-center gap-1">
              View all <ArrowRight size={16} />
            </Link>
          </div>

          {data.cases.length === 0 ? (
            <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-4">
                <Search size={32} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No cases found</h3>
              <p className="text-[var(--text-secondary)] mb-6 max-w-sm">
                Get started by analyzing your first suspicious email to populate the dashboard.
              </p>
              <Link to="/analyze">
                <button className="bg-[var(--accent)] text-white px-6 py-2.5 rounded-md font-medium hover:bg-[var(--accent-dim)] transition-colors">
                  Analyze Email
                </button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.cases.map(caseItem => (
                <Link key={caseItem.id} to={`/cases/${caseItem.id}`}>
                  <Card hoverable className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-[var(--text-primary)] font-medium truncate mb-1">
                        {caseItem.subject || "No Subject"}
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)] truncate">
                        {caseItem.from_display_name || caseItem.from_address || "Unknown sender"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {getScoreBadge(caseItem.fraud_score)}
                      <span className="text-xs text-[var(--text-muted)] w-24 text-right">
                        {formatDistanceToNow(new Date(caseItem.created_at))} ago
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Column: CTA and Chart */}
        <div className="space-y-6">
          {/* CTA Card */}
          <Card className="p-6 bg-gradient-to-br from-[var(--bg-panel)] to-[var(--accent-soft)] border-[var(--accent-soft)]">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-[var(--accent)] text-white rounded-lg">
                <UploadCloud size={24} />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Analyze Email</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Upload an EML or MSG file for deep forensic analysis, fraud classification, and origin tracing.
            </p>
            <Link to="/analyze" className="block w-full">
              <button className="w-full bg-[var(--accent)] text-white py-2.5 rounded-md font-medium hover:bg-[var(--accent-dim)] transition-colors flex items-center justify-center gap-2">
                Start Analysis <ArrowRight size={18} />
              </button>
            </Link>
          </Card>

          {/* Risk Distribution Chart */}
          <Card className="p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-6">Risk Distribution</h3>
            <div className="flex flex-col items-center">
              <div className="mb-8">
                <DonutChart data={data.riskDistribution} size={160} strokeWidth={24} />
              </div>
              <div className="w-full space-y-3">
                {data.riskDistribution.map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[var(--text-secondary)]">{item.label}</span>
                    </div>
                    <span className="font-semibold text-[var(--text-primary)]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
