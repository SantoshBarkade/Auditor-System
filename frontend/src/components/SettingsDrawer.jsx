import React, { useEffect, useState } from 'react';
import { X, Server, Sparkles, Database, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { showToast } from './Toast';

export default function SettingsDrawer({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings', err);
      showToast('Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0B0F19] border-l border-[#1E293B] h-full flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <div className="flex items-center space-x-2.5">
            <Server className="w-5 h-5 text-sky-400" />
            <h3 className="font-mono text-sm font-semibold tracking-wider text-slate-100 uppercase">
              System Settings & Health
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Security Engine */}
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 font-semibold uppercase">
                Deterministic Security Engine
              </span>
              <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>ONLINE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native multi-vendor parsers for Cisco IOS-XE, Fortinet FortiOS, and Juniper Junos. Evaluation engine strictly deterministic.
            </p>
          </div>

          {/* AI Advisory Layer */}
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 font-semibold uppercase">
                NVIDIA AI Advisory Service
              </span>
              <span className="text-[11px] font-mono text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 font-medium">
                ADVISORY ONLY
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#1E293B]">
                <span className="text-slate-400">Endpoint:</span>
                <span className="text-slate-200 text-right truncate max-w-[200px]">
                  {settings?.ai_base_url || 'https://integrate.api.nvidia.com/v1'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1E293B]">
                <span className="text-slate-400">Model:</span>
                <span className="text-sky-300">
                  {settings?.ai_model || 'meta/llama-3.2-11b-vision-instruct'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">API Key:</span>
                <span className="text-emerald-400">
                  {settings?.ai_key_masked || 'nvapi-••••••••••••'}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed font-sans">
              ⓘ AI layer is strictly non-authoritative and grounded via pgvector RAG. It cannot override deterministic findings.
            </div>
          </div>

          {/* Database Layer */}
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 font-semibold uppercase">
                Database & Knowledge Base
              </span>
              <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                <Database className="w-3 h-3" />
                <span>CONNECTED</span>
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <p className="text-slate-400">Supabase Hosted PostgreSQL</p>
              <p className="text-slate-400">pgvector (1536-dim embeddings): <span className="text-emerald-400">Active</span></p>
              <p className="text-slate-400">Blockchain Ledger: <span className="text-emerald-400">Tamper-Evident SHA-256</span></p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[#1E293B] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-200 text-xs font-mono transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}
