import React, { useState } from 'react';
import { User, Bell, Shield, Key, Database, Cpu, Monitor, Moon, Sun, Trash2, CheckCircle2, ChevronRight, Save } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState('system');
  const [aiModel, setAiModel] = useState('gpt-oss-20b');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage your account, preferences, and system configurations.</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm font-medium text-[var(--success)] flex items-center gap-1.5"><CheckCircle2 size={16} /> Preferences saved</span>}
          <Button variant="primary" icon={Save} onClick={handleSave}>Save Changes</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation (Visual Only) */}
        <div className="hidden lg:block space-y-1">
          <NavItem icon={User} label="My Profile" active />
          <NavItem icon={Monitor} label="Appearance" />
          <NavItem icon={Cpu} label="AI Engine" />
          <NavItem icon={Database} label="Data Retention" />
          <NavItem icon={Shield} label="Security" />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Profile Section */}
          <Card className="p-6 md:p-8 border-[var(--border)] shadow-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
              <User className="text-[var(--accent)]" size={20} /> Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Full Name</label>
                <input type="text" defaultValue="Yash Gupta" className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email Address</label>
                <input type="email" defaultValue="admin@sentinel.local" className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                <select className="w-full bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors">
                  <option>Lead Investigator</option>
                  <option>SOC Analyst</option>
                  <option>Viewer</option>
                </select>
              </div>
            </div>
          </Card>

          {/* AI Configuration */}
          <Card className="p-6 md:p-8 border-[var(--border)] shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 mb-1">
                  <Cpu className="text-[var(--accent)]" size={20} /> AI Analysis Engine
                </h2>
                <p className="text-sm text-[var(--text-muted)]">Configure the LLM used for forensic report summaries and zero-shot classification.</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Default Model</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ModelSelect active={aiModel === 'gpt-oss-20b'} onClick={() => setAiModel('gpt-oss-20b')} name="GPT-OSS 20B" provider="Groq" speed="Ultra-fast" />
                  <ModelSelect active={aiModel === 'qwen3.6-27b'} onClick={() => setAiModel('qwen3.6-27b')} name="Qwen 3.6 27B" provider="Groq" speed="Reasoning" />
                  <ModelSelect active={aiModel === 'gemini-2.0'} onClick={() => setAiModel('gemini-2.0')} name="Gemini 2.0 Flash" provider="Google" speed="Balanced" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">API Key Override (Local)</label>
                <div className="flex gap-2">
                  <input type="password" placeholder="sk-..." className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors font-mono" />
                  <Button variant="secondary">Verify</Button>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">Leave blank to use the server's default environment variables.</p>
              </div>
            </div>
          </Card>

          {/* Appearance & Notification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6 border-[var(--border)] shadow-sm">
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Monitor className="text-[var(--accent)]" size={18} /> Appearance
              </h2>
              <div className="space-y-3">
                <ThemeToggle active={theme === 'light'} onClick={() => setTheme('light')} icon={Sun} label="Light Mode" />
                <ThemeToggle active={theme === 'dark'} onClick={() => setTheme('dark')} icon={Moon} label="Dark Mode" />
                <ThemeToggle active={theme === 'system'} onClick={() => setTheme('system')} icon={Monitor} label="System Default" />
              </div>
            </Card>

            <Card className="p-6 border-[var(--border)] shadow-sm">
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Bell className="text-[var(--accent)]" size={18} /> Notifications
              </h2>
              <div className="space-y-4">
                <ToggleRow label="Email Alerts" description="Receive emails for critical threats (Score > 80)" defaultChecked />
                <ToggleRow label="Weekly Digest" description="Summary of analyzed campaigns" />
                <ToggleRow label="Slack Integration" description="Post alerts to #soc-alerts" defaultChecked />
              </div>
            </Card>
          </div>

          {/* Danger Zone */}
          <Card className="p-6 border-red-500/20 bg-red-500/5 shadow-sm">
            <h2 className="text-base font-bold text-red-500 mb-4 flex items-center gap-2">
              <Trash2 size={18} /> Danger Zone
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Purge all forensic data</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Permanently delete all cases, logs, and indicators. This action cannot be undone.</p>
              </div>
              <button className="shrink-0 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Purge Database
              </button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

// Subcomponents

function NavItem({ icon: Icon, label, active }) {
  return (
    <button className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold" 
        : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
    }`}>
      <span className="flex items-center gap-3">
        <Icon size={18} className={active ? "text-[var(--accent)]" : "opacity-70"} />
        {label}
      </span>
      {active && <ChevronRight size={16} />}
    </button>
  );
}

function ModelSelect({ name, provider, speed, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer border rounded-xl p-4 transition-all duration-200 ${
        active 
          ? "border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]" 
          : "border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[var(--text-muted)]"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className={`text-sm font-bold ${active ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>{name}</span>
        {active && <CheckCircle2 size={16} className="text-[var(--accent)]" />}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-muted)] flex items-center justify-between">Provider: <span className="font-medium text-[var(--text-secondary)]">{provider}</span></span>
        <span className="text-xs text-[var(--text-muted)] flex items-center justify-between">Profile: <span className="font-medium text-[var(--text-secondary)]">{speed}</span></span>
      </div>
    </div>
  );
}

function ThemeToggle({ icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
        active 
          ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]" 
          : "border-transparent hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      <span className="flex items-center gap-3 font-medium text-sm">
        <Icon size={18} /> {label}
      </span>
      {active && <CheckCircle2 size={16} />}
    </button>
  );
}

function ToggleRow({ label, description, defaultChecked }) {
  const [checked, setChecked] = useState(defaultChecked || false);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
      </div>
      <button 
        onClick={() => setChecked(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}
