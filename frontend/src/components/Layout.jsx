import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Activity, Search, ShieldAlert, Zap, Network, Sun, Moon } from "lucide-react";
import { listAlerts } from "../lib/api";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { to: "/", label: "Analyze", icon: Activity },
  { to: "/cases", label: "Cases", icon: Search },
  { to: "/campaigns", label: "Campaigns", icon: Network },
  { to: "/alerts", label: "Alerts", icon: Zap, isAlerts: true },
  { to: "/blacklist", label: "Blacklist", icon: ShieldAlert },
];

export default function Layout({ children }) {
  const [unackCount, setUnackCount] = useState(0);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchAlertsCount();
    const interval = setInterval(fetchAlertsCount, 10000);
    return () => clearInterval(interval);
  }, []);

  function fetchAlertsCount() {
    listAlerts()
      .then((data) => {
        const count = data.filter((a) => !a.acknowledged).length;
        setUnackCount(count);
      })
      .catch(() => {});
  }

  // Determine current page title from path
  const currentNav = navItems.find((n) => n.to === location.pathname) || { label: "Detail" };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono selection:bg-[var(--accent)] selection:bg-opacity-20">
      
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--bg-panel)] flex flex-col z-20 shadow-sm relative">
        <div className="px-6 py-6 border-b border-[var(--border)] flex flex-col justify-center h-20">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
            <span className="text-[var(--accent)] font-bold tracking-widest text-sm">SENTINEL</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-tight font-semibold">
            EMAIL FORENSIC INTELLIGENCE
          </p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-3 rounded-md text-sm transition-all duration-300 relative overflow-hidden ${
                    isActive
                      ? "text-[var(--accent)] bg-[var(--accent)] bg-opacity-10"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 z-10">
                      <Icon size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      <span className="font-medium tracking-wide">{item.label}</span>
                    </div>
                    {/* Active Indicator Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] transition-transform duration-300 origin-left ${isActive ? 'scale-x-100' : 'scale-x-0'}`} />
                    
                    {item.isAlerts && unackCount > 0 && (
                      <span className="bg-[var(--danger)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse z-10 shadow-md">
                        {unackCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)]">
          PS 26106 · AICTE Cyber Security Cell
          <br />
          <span className="opacity-75">SIH 2026</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Top Bar */}
        <header className="h-20 border-b border-[var(--border)] bg-[var(--bg-panel)] flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          
          {/* Breadcrumb / Title */}
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-muted)] text-sm font-medium tracking-wide uppercase">Sentinel</span>
            <span className="text-[var(--border)]">/</span>
            <span className="text-[var(--text-primary)] text-sm font-bold tracking-wide uppercase">
              {currentNav.label}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-6">
            
            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)]">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--text-muted)]">3 services online</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-50"
              aria-label="Toggle theme"
            >
              <div className="relative w-5 h-5 overflow-hidden">
                 {/* Sun moves up and out when dark, Moon moves in from bottom */}
                <Sun 
                  size={20} 
                  className={`absolute inset-0 transition-transform duration-500 ${theme === 'dark' ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`} 
                />
                <Moon 
                  size={20} 
                  className={`absolute inset-0 transition-transform duration-500 ${theme === 'dark' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`} 
                />
              </div>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto scanline relative bg-[var(--bg-primary)]">
          {/* Subtle page transition wrapper using a unique key based on pathname */}
          <div 
            key={location.pathname}
            className="animate-fade-slide-up p-8 max-w-7xl mx-auto"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
