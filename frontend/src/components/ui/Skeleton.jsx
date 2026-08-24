import React from "react";

export default function Skeleton({ className = "", rounded = "rounded-md" }) {
  return (
    <div 
      className={`bg-[var(--bg-subtle)] animate-pulse ${rounded} ${className}`} 
      aria-hidden="true"
    />
  );
}
