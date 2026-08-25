import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Activity, Lock, Mail, Search, Zap, ChevronRight, Code } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[var(--accent-soft)]">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
            <span className="text-[var(--accent)] font-bold tracking-widest text-lg">SENTINEL</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log In</Link>
            <Link to="/signup">
              <Button variant="primary" className="px-4 py-1.5 text-sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center relative">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent)]/20 blur-[120px] rounded-full pointer-events-none" />
        
        <Badge />
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mt-6 mb-6 leading-tight">
          Next-Generation <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-emerald-300">
            Email Forensic Intelligence
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-3xl mb-10 leading-relaxed">
          Sentinel is an advanced threat analysis platform that automatically detects, isolates, and correlates sophisticated email-borne attacks, business email compromise, and phishing campaigns in real-time.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link to="/signup" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full text-lg px-8 py-4 flex items-center justify-center gap-2">
              Start Analyzing <ChevronRight size={20} />
            </Button>
          </Link>
          <a href="https://github.com/masteryashgupta/sentinel" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full text-lg px-8 py-4 flex items-center justify-center gap-2 border-white/20 text-white hover:bg-white/10">
              <Code size={20} /> View on GitHub
            </Button>
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-black/40 border-y border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Threat Hunting</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Built for security operation centers (SOCs) and incident responders to rapidly triage malicious emails and uncover coordinated attack infrastructure.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Search />}
              title="Deep Header Forensics"
              description="Automatically parse and validate DKIM, SPF, and DMARC alignments. Detect spoofing, freemail abuse, and suspicious routing."
            />
            <FeatureCard 
              icon={<Activity />}
              title="Machine Learning AI"
              description="Leverage a dedicated Python ML service to score fraud probability and classify threats based on text heuristics and known bad patterns."
            />
            <FeatureCard 
              icon={<Lock />}
              title="Row-Level Security"
              description="Zero-trust architecture ensuring absolute data isolation. Your investigations are cryptographically locked to your identity."
            />
            <FeatureCard 
              icon={<Zap />}
              title="Campaign Correlation"
              description="Automatically link isolated incidents into broader campaigns by pivoting on shared indicators like IP addresses and infrastructure."
            />
            <FeatureCard 
              icon={<Mail />}
              title="Gmail API Integration"
              description="Connect your workspace to passively monitor unread emails. Auto-analyze incoming threats before users interact with them."
            />
            <FeatureCard 
              icon={<Shield />}
              title="Real-time Alerts"
              description="Get instant notifications for high-risk threats (Score > 75). Maintain a full chain-of-custody audit log for compliance."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to secure your inbox?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">Join Sentinel today and get access to the most advanced email threat analysis tools available.</p>
        <Link to="/signup">
          <Button variant="primary" className="px-8 py-3 text-lg">Create Free Account</Button>
        </Link>
      </section>
      
      {/* Footer */}
      <footer className="py-8 border-t border-white/10 text-center text-sm text-gray-500">
        <p>© 2026 Sentinel Security. Open Source by Yash Gupta.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors duration-300">
      <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] mb-4">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function Badge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] text-sm font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
      </span>
      v2.0 Advanced Architecture
    </div>
  );
}
