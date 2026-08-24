import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, Search, Network, Zap, ShieldAlert, Settings, Menu, X } from "lucide-react";
import { listAlerts } from "../lib/api";

const navGroups = [
  {
    title: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analyze", label: "Analyze", icon: Activity },
    ]
  },
  {
    title: "Investigation",
    items: [
      { to: "/cases", label: "Cases", icon: Search },
      { to: "/campaigns", label: "Campaigns", icon: Network },
      { to: "/alerts", label: "Alerts", icon: Zap, isAlerts: true },
      { to: "/blacklist", label: "Blacklist", icon: ShieldAlert },
    ]
  }
];

export default function Layout({ children }) {
  const [unackCount, setUnackCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchAlertsCount();
    const interval = setInterval(fetchAlertsCount, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close mobile menu on route change
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  function fetchAlertsCount() {
    listAlerts()
      .then((data) => {
        const count = data.filter((a) => !a.acknowledged).length;
        setUnackCount(count);
      })
      .catch(() => {});
  }

  // Determine current page title
  let currentTitle = "Detail";
  for (const group of navGroups) {
    const found = group.items.find(item => item.to === location.pathname);
    if (found) currentTitle = found.label;
  }
  if (location.pathname === "/settings") currentTitle = "Settings";

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-[var(--border)] flex flex-col justify-center h-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
          <span className="text-[var(--accent)] font-bold tracking-widest text-sm">SENTINEL</span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-tight font-semibold">
          EMAIL FORENSIC INTELLIGENCE
        </p>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6 relative">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `group flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? "text-[var(--accent)] bg-[var(--accent-soft)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
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
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] transition-transform duration-300 origin-left ${isActive ? 'scale-y-100' : 'scale-y-0'}`} />
                        
                        {item.isAlerts && unackCount > 0 && (
                          <span className="bg-[var(--danger)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                            {unackCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border)] shrink-0">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all duration-300 relative overflow-hidden ${
              isActive
                ? "text-[var(--accent)] bg-[var(--accent-soft)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-3 z-10">
                <Settings size={18} className={`transition-transform duration-300 ${isActive ? 'scale-110 rotate-45' : 'group-hover:scale-110 group-hover:rotate-45'}`} />
                <span className="font-medium tracking-wide">Settings</span>
              </div>
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] transition-transform duration-300 origin-left ${isActive ? 'scale-y-100' : 'scale-y-0'}`} />
            </>
          )}
        </NavLink>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono selection:bg-[var(--accent-soft)]">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[var(--border)] bg-[var(--bg-panel)] flex-col z-20 relative">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[var(--bg-panel)] z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col border-r border-[var(--border)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        
        {/* Top Bar */}
        <header className="h-20 border-b border-[var(--border)] bg-[var(--bg-panel)] flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          
          {/* Breadcrumb / Title & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[var(--text-muted)] text-sm font-medium tracking-wide uppercase">Sentinel</span>
              <span className="text-[var(--border)]">/</span>
            </div>
            <span className="text-[var(--text-primary)] text-sm md:text-base font-bold tracking-wide uppercase">
              {currentTitle}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 md:gap-6">
            
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)]">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--text-muted)]">3 services online</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto scanline relative bg-[var(--bg-primary)]">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
