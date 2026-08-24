import React from "react";

export default function Spinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-3 h-3 border-[1.5px]",
    md: "w-5 h-5 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div
      className={`inline-block rounded-full animate-spin border-t-[var(--accent)] border-r-[var(--accent)] border-b-[var(--accent-soft)] border-l-[var(--accent-soft)] ${sizeClasses[size]} ${className}`}
      role="status"
    />
  );
}
