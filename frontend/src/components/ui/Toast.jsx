import React, { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export default function Toast({ message, type = "info", onClose }) {
  const [isClosing, setIsClosing] = useState(false);

  const icons = {
    success: <CheckCircle className="text-[var(--accent)]" size={20} />,
    error: <AlertCircle className="text-[var(--danger)]" size={20} />,
    info: <Info className="text-[var(--info)]" size={20} />
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // match transition duration
  };

  useEffect(() => {
    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`
        flex items-start gap-3 p-4 bg-[var(--bg-panel)] border border-[var(--border)] 
        rounded-lg shadow-[0_4px_12px_var(--shadow-hover)] w-80 max-w-[calc(100vw-2rem)]
        pointer-events-auto transition-all duration-300 ease-in-out
        ${isClosing ? 'opacity-0 translate-x-8' : 'animate-toast-in'}
      `}
    >
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <p className="flex-1 text-sm font-medium text-[var(--text-primary)] leading-tight">{message}</p>
      <button 
        onClick={handleClose}
        className="shrink-0 p-1 -mr-1 -mt-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
