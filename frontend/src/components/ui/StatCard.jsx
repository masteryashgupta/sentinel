import React from "react";
import Card from "./Card";

export default function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  sublabel, 
  trend, 
  trendUp = true,
  className = "" 
}) {
  return (
    <Card className={`p-6 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">{label}</p>
          <h3 className="text-4xl font-display font-bold text-[var(--text-primary)]">{value}</h3>
        </div>
        {Icon && (
          <div className="p-3 bg-[var(--accent-soft)] rounded-xl text-[var(--accent)] shadow-glow">
            <Icon size={24} strokeWidth={2.5} />
          </div>
        )}
      </div>
      
      {(sublabel || trend) && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {trend && (
            <span className={`font-medium ${trendUp ? "text-[var(--danger)]" : "text-[var(--accent)]"}`}>
              {trendUp ? "↑" : "↓"} {trend}
            </span>
          )}
          {sublabel && (
            <span className="text-[var(--text-muted)]">{sublabel}</span>
          )}
        </div>
      )}
    </Card>
  );
}
