import React, { useEffect, useState } from 'react';
import { Shield, Cpu, Link2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { api } from '../services/api';

export default function Header() {
  const [chainValid, setChainValid] = useState(true);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const v = await api.verifyBlockchain();
        setChainValid(v.is_valid);
        const h = await api.getHealth();
        setHealth(h);
      } catch (err) {
        console.error('Status load error', err);
      }
    }
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Branding */}
      <div className="flex items-center space-x-4">
        <Shield className="w-5 h-5 text-slate-900" />
        <span className="font-bold text-sm tracking-widest uppercase text-slate-900">
          NEXORA
        </span>
        <span className="hidden md:block text-[10px] font-bold tracking-widest uppercase text-slate-400 border-l border-slate-200 pl-4">
          SIH 2026 · SIH26155 · WeirdBits
        </span>
      </div>

      {/* Right: Status Indicators */}
      <div className="flex items-center space-x-6 text-xs font-medium">
        {/* System Status */}
        <div className="flex items-center space-x-2 text-slate-600">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">System Operational</span>
        </div>

        {/* AI Engine Status */}
        <div className="flex items-center space-x-2 text-slate-600">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">
            Engine: <span className="text-slate-900 font-bold">{health?.ai_mode || 'Deterministic'}</span>
          </span>
        </div>

        {/* Blockchain Ledger Status */}
        <div className="flex items-center space-x-1.5 text-slate-600">
          <Link2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Ledger:</span>
          {chainValid ? (
            <span className="flex items-center space-x-1 text-emerald-600 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-red-600 font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Tampered</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
