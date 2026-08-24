import React from "react";

export default function Card({ children, className = "", hoverable = false, ...props }) {
  const hoverStyles = hoverable 
    ? "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_var(--shadow-hover)] cursor-pointer" 
    : "";

  return (
    <div 
      className={`bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-[0_2px_8px_var(--shadow)] overflow-hidden ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
