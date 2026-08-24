import React from "react";

export default function Badge({ children, variant = "neutral", className = "" }) {
  const variants = {
    success: "bg-[var(--accent-soft)] text-[var(--accent-dim)] border-[var(--accent-soft)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-soft)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-soft)]",
    info: "bg-[#e0f2fe] text-[var(--info)] border-[#e0f2fe]", // Light blue for info
    neutral: "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)]",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
