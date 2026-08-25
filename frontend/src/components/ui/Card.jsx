import React from "react";

export default function Card({ children, className = "", hoverable = false, ...props }) {
  const hoverStyles = hoverable 
    ? "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_var(--shadow-hover)] cursor-pointer" 
    : "";

  return (
    <div 
      className={`glass-card rounded-xl overflow-hidden ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
