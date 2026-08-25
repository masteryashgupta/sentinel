import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, Search, Network, Zap, ShieldAlert, Menu, X, Mail, LogOut } from "lucide-react";
import { listAlerts, fetchSystemStatus } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const navGroups = [
  {
    title: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analyze", label: "Analyze", icon: Activity },
      { to: "/gmail-sync", label: "Gmail Sync", icon: Mail },
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

function SystemStatus() {
  const [status, setStatus] = useState({ backend: "offline", ml_service: "offline", ai_engine: "offline" });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const data = await fetchSystemStatus();
      if (data) {
        setStatus(data);
      } else {
        setStatus({ backend: "offline", ml_service: "offline", ai_engine: "offline" });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const onlineCount = Object.values(status).filter((v) => v === "online").length;
  const isFullyOnline = onlineCount === 3;
  const pulseColor = isFullyOnline ? "bg-[var(--accent)]" : (onlineCount > 0 ? "bg-[var(--warning)]" : "bg-[var(--danger)]");
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.system-status-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div 
      className="system-status-container hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] relative cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className={`w-2 h-2 rounded-full ${pulseColor} animate-pulse`} />
      <span className="text-xs font-medium text-[var(--text-muted)] select-none">{onlineCount} services online</span>
      
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-56 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl p-3 z-50 animate-fade-in text-sm text-[var(--text-primary)] cursor-default" onClick={e => e.stopPropagation()}>
          <p className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] mb-2">System Status</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Backend API</span>
              <span className={`text-xs font-medium flex items-center gap-1.5 ${status.backend === "online" ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                {status.backend === "online" ? "● Online" : "○ Offline"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>ML Service</span>
              <span className={`text-xs font-medium flex items-center gap-1.5 ${status.ml_service === "online" ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                {status.ml_service === "online" ? "● Online" : "○ Offline"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>AI Engine</span>
              <span className={`text-xs font-medium flex items-center gap-1.5 ${status.ai_engine === "online" ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}>
                {status.ai_engine === "online" ? "● Online" : "○ Offline"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const [unackCount, setUnackCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

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

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-[var(--border)] flex flex-col justify-center h-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)] animate-pulse" />
          <span className="text-[var(--text-primary)] font-display font-bold tracking-widest text-lg">SENTINEL</span>
        </div>
        <p className="text-[10px] text-[var(--accent)] mt-1.5 leading-tight font-semibold tracking-wider">
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
        {user && (
          <button
            onClick={logout}
            className="w-full mt-2 group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-300 text-[var(--danger)] hover:bg-red-500/10"
          >
            <LogOut size={18} className="transition-transform duration-300 group-hover:scale-110" />
            <span className="font-medium tracking-wide">Logout</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-soft)] selection:text-[var(--accent)]">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[var(--border)] glass-panel flex-col z-20 relative shadow-[0_0_40px_rgba(0,0,0,0.5)]">
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
      <aside className={`fixed inset-y-0 left-0 w-64 glass-panel z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col border-r border-[var(--border)] shadow-[0_0_40px_rgba(0,0,0,0.5)] ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        
        {/* Top Bar */}
        <header className="h-20 border-b border-[var(--border)] glass-panel flex items-center justify-between px-4 md:px-8 shrink-0 z-10 sticky top-0">
          
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
            <span className="text-[var(--text-primary)] text-sm md:text-lg font-display font-bold tracking-wide uppercase">
              {currentTitle}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4 md:gap-6">
            {user && (
              <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block">
                {user.email}
              </span>
            )}
            <SystemStatus />
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto relative bg-transparent scroll-smooth">
          <div className="p-4 md:p-8 max-w-7xl mx-auto animate-page-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
