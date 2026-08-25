import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import Toast from "../components/ui/Toast";
import { getGmailAuthUrl, getGmailStatus, disconnectGmail, fetchGmailInbox, analyzeGmailMessage } from "../lib/api";
import { Mail, Unplug, CheckCircle, Play, FileSearch } from "lucide-react";

export default function GmailSync() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [fetchingInbox, setFetchingInbox] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const autoAnalyzeRef = React.useRef(autoAnalyze);
  
  useEffect(() => {
    autoAnalyzeRef.current = autoAnalyze;
  }, [autoAnalyze]);

  const location = useLocation();

  useEffect(() => {
    // Check if coming back from OAuth
    const params = new URLSearchParams(location.search);
    if (params.get("connected") === "true") {
      setToast({ message: "Gmail connected successfully!", type: "success" });
      window.history.replaceState({}, document.title, location.pathname);
    } else if (params.get("error")) {
      setToast({ message: "Failed to connect to Gmail.", type: "error" });
      window.history.replaceState({}, document.title, location.pathname);
    }

    fetchStatus();
  }, [location]);
  
  useEffect(() => {
     let interval;
     if (status?.connected) {
         loadInbox(); // initial load
         interval = setInterval(loadInbox, 30000); // 30s auto-refresh
     }
     return () => clearInterval(interval);
  }, [status?.connected]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await getGmailStatus();
      setStatus(data);
    } catch (e) {
      console.error(e);
      setToast({ message: "Failed to load Gmail status", type: "error" });
    }
    setLoading(false);
  };

  const loadInbox = async () => {
     try {
       setFetchingInbox(true);
       const data = await fetchGmailInbox();
       setInbox(data);
       
       if (autoAnalyzeRef.current) {
           data.forEach(msg => {
               if (!msg.analyzed) {
                   handleAnalyze(msg.id);
               }
           });
       }
     } catch (e) {
       console.error("Inbox fetch failed", e);
       if (e.message.toLowerCase().includes("revoked") || e.message.toLowerCase().includes("invalid")) {
           setStatus({ connected: false });
       }
     } finally {
       setFetchingInbox(false);
     }
  };

  const handleConnect = () => {
    window.location.href = getGmailAuthUrl();
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGmail();
      setStatus({ connected: false });
      setInbox([]);
      setToast({ message: "Disconnected successfully", type: "success" });
    } catch (e) {
      setToast({ message: "Disconnect failed", type: "error" });
    }
  };

  const handleAnalyze = async (id) => {
      // Prevent duplicate analysis if already analyzing
      let isAlreadyAnalyzing = false;
      setAnalyzingIds(prev => {
          if (prev.has(id)) {
              isAlreadyAnalyzing = true;
              return prev;
          }
          return new Set(prev).add(id);
      });
      
      if (isAlreadyAnalyzing) return;

      try {
          const res = await analyzeGmailMessage(id);
          setToast({ message: `Analyzed! Score: ${res.case.fraud_score}`, type: "success" });
          // Update the list to show as analyzed
          setInbox(prev => prev.map(msg => msg.id === id ? { ...msg, analyzed: true, caseId: res.case.id } : msg));
      } catch (e) {
          setToast({ message: e.message || "Analysis failed", type: "error" });
      } finally {
          setAnalyzingIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
          });
      }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Gmail Integration</h1>
        <p className="text-[var(--text-secondary)]">
          Connect your Google Workspace or Gmail account to view unread emails and analyze them for threats on demand.
        </p>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <Card className="flex items-center justify-center h-48">
          <Spinner />
        </Card>
      ) : status?.connected ? (
        <div className="space-y-6">
            <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                <div className="p-3 bg-[var(--accent-soft)] rounded-full">
                    <Mail className="text-[var(--accent)]" size={24} />
                </div>
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                    Connected Account
                    <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle size={12} /> Active
                    </Badge>
                    </h3>
                    <p className="text-[var(--text-secondary)] text-sm">{status.email}</p>
                </div>
                </div>
                <div className="flex items-center gap-3">
                <Button variant="danger" onClick={handleDisconnect}>
                    <Unplug size={16} /> Disconnect
                </Button>
                </div>
            </div>
            </Card>

            <Card>
                <div className="p-4 border-b border-[var(--border)] flex flex-col md:flex-row md:justify-between md:items-center bg-[var(--bg-elevated)] gap-4">
                    <h3 className="font-semibold flex items-center gap-2"><Mail size={18} /> Unread Inbox</h3>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Auto-Analyze</span>
                            <div 
                                className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${autoAnalyze ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                                onClick={() => setAutoAnalyze(!autoAnalyze)}
                            >
                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${autoAnalyze ? 'translate-x-5' : ''}`}></div>
                            </div>
                        </label>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            {fetchingInbox && <Spinner size="sm" />}
                            <span className="animate-pulse">Auto-refreshing</span>
                        </div>
                    </div>
                </div>
                <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
                    {inbox.length === 0 && !fetchingInbox && (
                        <div className="p-8 text-center text-[var(--text-secondary)]">
                            No unread emails found.
                        </div>
                    )}
                    {inbox.map((msg) => (
                        <div key={msg.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--bg-elevated)] transition-colors">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-[var(--text-primary)] truncate">{msg.subject}</h4>
                                <p className="text-sm text-[var(--text-secondary)] truncate">{msg.from}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(msg.date).toLocaleString()}</p>
                            </div>
                            <div className="shrink-0">
                                {msg.analyzed ? (
                                    <Link to={`/cases/${msg.caseId}`}>
                                        <Button variant="outline" className="w-full md:w-auto">
                                            <FileSearch size={16} /> View Case
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button 
                                        variant="primary" 
                                        onClick={() => handleAnalyze(msg.id)}
                                        disabled={analyzingIds.has(msg.id)}
                                        className="w-full md:w-auto min-w-[120px]"
                                    >
                                        {analyzingIds.has(msg.id) ? <Spinner size="sm" /> : <Play size={16} />} 
                                        {analyzingIds.has(msg.id) ? "Analyzing..." : "Analyze"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
      ) : (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-4 border border-[var(--border)]">
              <Mail className="text-[var(--text-muted)]" size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Account Connected</h3>
            <p className="text-[var(--text-secondary)] max-w-md mb-6">
              Connect your Gmail account to enable automatic inbox polling and one-click forensic analysis.
            </p>
            <Button variant="primary" onClick={handleConnect} className="px-8">
              <Mail size={18} /> Connect Gmail
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
