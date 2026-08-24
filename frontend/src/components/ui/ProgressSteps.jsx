import React from "react";
import { Check } from "lucide-react";

export default function ProgressSteps({ steps = [] }) {
  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const isDone = step.status === "done";
        const isActive = step.status === "active";
        const isPending = step.status === "pending";

        return (
          <div key={idx} className="flex items-center gap-4">
            {/* Step Indicator */}
            <div className="relative flex items-center justify-center shrink-0">
              <div 
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                  ${isDone ? "bg-[var(--accent)] text-white" : ""}
                  ${isActive ? "bg-[var(--accent-soft)] text-[var(--accent)] border-2 border-[var(--accent)]" : ""}
                  ${isPending ? "bg-[var(--bg-subtle)] text-[var(--text-muted)] border-2 border-[var(--border)]" : ""}
                `}
              >
                {isDone ? (
                  <Check size={16} strokeWidth={3} className="animate-in zoom-in duration-300" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
              
              {/* Active Pulse Glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-20" />
              )}
            </div>

            {/* Step Label */}
            <div className="flex-1">
              <p 
                className={`
                  font-medium transition-colors duration-300
                  ${isDone ? "text-[var(--text-primary)]" : ""}
                  ${isActive ? "text-[var(--accent)]" : ""}
                  ${isPending ? "text-[var(--text-muted)]" : ""}
                `}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
