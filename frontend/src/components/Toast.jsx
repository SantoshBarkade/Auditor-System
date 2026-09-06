import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

// Global toast state (module-level singleton)
let _toastListeners = [];
let _toastIdCounter = 0;

export function showToast(message, type = 'info', duration = 4000) {
  const id = ++_toastIdCounter;
  const toast = { id, message, type, duration };
  _toastListeners.forEach(fn => fn({ action: 'add', toast }));
  return id;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handler({ action, toast }) {
      if (action === 'add') {
        setToasts(prev => [...prev, toast]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, toast.duration);
      }
    }
    _toastListeners.push(handler);
    return () => {
      _toastListeners = _toastListeners.filter(fn => fn !== handler);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const configs = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-emerald-900',
      border: 'border-emerald-700',
      iconColor: 'text-emerald-400',
      textColor: 'text-emerald-100',
    },
    error: {
      icon: XCircle,
      bg: 'bg-rose-900',
      border: 'border-rose-700',
      iconColor: 'text-rose-400',
      textColor: 'text-rose-100',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-amber-900',
      border: 'border-amber-700',
      iconColor: 'text-amber-400',
      textColor: 'text-amber-100',
    },
    info: {
      icon: Info,
      bg: 'bg-slate-900',
      border: 'border-slate-700',
      iconColor: 'text-blue-400',
      textColor: 'text-slate-100',
    },
  };

  const c = configs[toast.type] || configs.info;
  const Icon = c.icon;

  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 px-5 py-4 border
        ${c.bg} ${c.border} ${c.textColor}
        shadow-2xl min-w-[280px] max-w-sm
        animate-in slide-in-from-right-4 fade-in duration-300
      `}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${c.iconColor}`} />
      <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
