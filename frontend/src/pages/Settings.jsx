import React, { useState, useEffect } from 'react';
import { Sliders, Cpu, Key, Check, Info, Shield, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

export default function Settings() {
  const [settingsData, setSettingsData] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const s = await api.getSettings();
        setSettingsData(s);
        if (s.current_model) setModel(s.current_model);
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    }
    load();
  }, []);

  async function handleSaveKey(e) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setSaving(true);
    try {
      await api.updateAISettings(apiKey, model);
      setSavedMsg('Gemini API key updated! Assistive AI analysis is now live.');
      const s = await api.getSettings();
      setSettingsData(s);
      setTimeout(() => setSavedMsg(''), 5000);
    } catch (err) {
      showToast('Failed to update AI key: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Platform Settings & AI Configuration</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Configure assistive generative AI services and review deterministic compliance invariants.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-200 border border-slate-200">
        
        {/* AI Configuration */}
        <div className="bg-white flex flex-col">
          <div className="p-8 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Cpu className="w-6 h-6 text-slate-900" />
              <div>
                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Generative AI Core</h3>
                <p className="text-xs text-slate-500 mt-1">Contextual explanation and remediation advice</p>
              </div>
            </div>
            
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 ${
              settingsData?.ai_active 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-slate-200 text-slate-700 border border-slate-300'
            }`}>
              {settingsData?.ai_provider || 'Deterministic Fallback Active'}
            </span>
          </div>
          
          <div className="p-8 space-y-8 flex-1">
            <form onSubmit={handleSaveKey} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Google Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Paste API Key here (or leave blank for deterministic fallback)..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-slate-900 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-mono transition-colors rounded-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Language Model Selection
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-50 border-b-2 border-slate-300 focus:border-slate-900 px-4 py-3 text-sm text-slate-900 focus:outline-none font-mono transition-colors cursor-pointer rounded-none"
                >
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Fast)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Reasoning)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving || !apiKey.trim()}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Validating Token...' : 'Inject Key & Activate AI'}</span>
              </button>

              {savedMsg && (
                <div className="flex items-center space-x-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold tracking-tight animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{savedMsg}</span>
                </div>
              )}
            </form>

            <div className="flex items-start space-x-4 p-5 bg-slate-900 text-slate-300">
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Strict Non-Negotiable Invariant</div>
                <p className="text-xs leading-relaxed">
                  The platform never crashes if an API key is missing. The system seamlessly activates a deterministic template-based explanation generator ensuring 100% demo reliability without external dependencies.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Metadata */}
        <div className="bg-white flex flex-col">
          <div className="p-8 border-b border-slate-200 bg-slate-50 flex items-center space-x-4">
            <Shield className="w-6 h-6 text-slate-900" />
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Platform Specifications</h3>
              <p className="text-xs text-slate-500 mt-1">Architectural invariants and limits</p>
            </div>
          </div>

          <div className="p-8 space-y-6 flex-1">
            <div className="space-y-px bg-slate-200 border border-slate-200">
              <div className="p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Architecture</span>
                <span className="text-sm font-bold text-slate-900 tracking-tight">AI-Driven Multi-Vendor Auditor</span>
              </div>
              
              <div className="p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deployment Scope</span>
                <span className="text-sm font-bold text-slate-900 tracking-tight">Enterprise Environment</span>
              </div>
              
              <div className="p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supported Parsers</span>
                <span className="text-sm font-bold text-slate-900 tracking-tight text-right">
                  Cisco (IOS-XE)<br/>
                  Fortinet (FortiOS)<br/>
                  Juniper (Junos)
                </span>
              </div>
              
              <div className="p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cryptographic Ledger</span>
                <span className="text-sm font-bold text-emerald-700 tracking-tight text-right">
                  SHA-256 Hash-Chained<br/>
                  Tamper-Evident Ledger
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
