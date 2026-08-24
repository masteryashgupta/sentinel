import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import Card from '../components/ui/Card';

export default function Settings() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-secondary)] mt-1">Manage your account and preferences.</p>
      </header>

      <Card className="p-12 border-[var(--border)] shadow-sm flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-[var(--bg-subtle)] rounded-full flex items-center justify-center mb-4">
          <SettingsIcon size={32} className="text-[var(--text-muted)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Settings Coming Soon</h2>
        <p className="text-[var(--text-secondary)] max-w-md">
          Configuration options for AI models, API keys, notifications, and user preferences are currently in development and will be available in a future update.
        </p>
      </Card>
    </div>
  );
}
