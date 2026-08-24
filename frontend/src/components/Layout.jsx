import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { listAlerts } from "../lib/api";

const navItems = [
  { to: "/", label: "Analyze", icon: "▲" },
  { to: "/cases", label: "Cases", icon: "▣" },
  { to: "/campaigns", label: "Campaigns", icon: "◈" },
  { to: "/alerts", label: "Alerts", icon: "⚡", isAlerts: true },
  { to: "/blacklist", label: "Blacklist", icon: "⬡" },
];

export default function Layout({ children }) {
  const [unackCount, setUnackCount] = useState(0);

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

  return (
    <div className="min-h-screen flex scanline">
      <aside className="w-60 border-r border-line bg-panel flex flex-col">
        <div className="px-5 py-6 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-signal shadow-glow animate-pulse" />
            <span className="text-signal font-bold tracking-widest text-sm">SENTINEL</span>
          </div>
          <p className="text-[10px] text-muted mt-1 leading-tight">
            EMAIL FORENSIC INTELLIGENCE
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-signal/10 text-signal border border-signal/30"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-xs opacity-70">{item.icon}</span>
                {item.label}
              </div>
              {item.isAlerts && unackCount > 0 && (
                <span className="bg-crimson text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {unackCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-line text-[10px] text-muted">
          PS 26106 · AICTE Cyber Security Cell
          <br />
          SIH 2026
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
