import React from "react";
import Spinner from "./Spinner";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className = "",
  disabled,
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-md";
  
  const variants = {
    primary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-dim)] border border-transparent shadow-sm",
    secondary: "bg-transparent text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-hover)]",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] border border-transparent",
    danger: "bg-[var(--danger)] text-white hover:bg-[#b71c1c] border border-transparent shadow-sm", // slightly darker than danger
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" className={variant === "secondary" || variant === "ghost" ? "!border-t-[var(--text-primary)] !border-r-[var(--text-primary)]" : "!border-t-white !border-r-white"} />}
      {!loading && Icon && <Icon size={iconSizes[size]} />}
      {children}
    </button>
  );
}
