import React, { useState, useEffect } from 'react';
import {
  Blocks,
  Link2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bug,
  Shield,
  Clock,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

export default function BlockchainTrail() {
  const [blocks, setBlocks] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [tamperResult, setTamperResult] = useState(null);

  async function loadBlockchainData() {
    setLoading(true);
    try {
      const bList = await api.getBlockchain();
      const v = await api.verifyBlockchain();
      setBlocks(bList);
      setVerification(v);
    } catch (err) {
      console.error("Failed to load blockchain", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBlockchainData();
  }, []);

  async function handleVerifyChain() {
    try {
      const v = await api.verifyBlockchain();
      setVerification(v);
      showToast(v.message, v.is_valid ? 'success' : 'error');
    } catch (err) {
      showToast('Verification error: ' + err.message, 'error');
    }
  }

  async function handleTamperDemo() {
    setTamperLoading(true);
    try {
      const res = await api.tamperTestBlockchain();
      setTamperResult(res);
      await loadBlockchainData();
    } catch (err) {
      showToast('Tamper test error: ' + err.message, 'error');
    } finally {
      setTamperLoading(false);
    }
  }

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Cryptographic Ledger</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Immutable SHA-256 hash chaining anchoring every configuration change, security finding, and approval event.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleVerifyChain}
            className="flex items-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm uppercase tracking-widest transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Verify Integrity</span>
          </button>

          <button
            onClick={handleTamperDemo}
            disabled={tamperLoading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            <Bug className="w-4 h-4 text-rose-600" />
            <span>{tamperLoading ? 'Testing...' : 'Simulate Tampering'}</span>
          </button>
        </div>
      </div>

      {/* Integrity Status Banner */}
      <div className={`p-8 border ${
        verification?.is_valid
          ? 'border-emerald-900 bg-emerald-900 text-emerald-50'
          : 'border-rose-900 bg-rose-900 text-rose-50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <Shield className={`w-12 h-12 ${verification?.is_valid ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase mb-1 opacity-70">
                LEDGER INTEGRITY
              </div>
              <h2 className={`text-3xl font-bold tracking-tight uppercase ${verification?.is_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {verification?.is_valid ? 'Chain Verified Valid' : 'Tampering Detected'}
              </h2>
              <p className="text-sm mt-2 opacity-80">
                {verification?.message || 'Cryptographic SHA-256 hash chaining active.'}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-[10px] font-bold tracking-widest uppercase mb-2 opacity-70">Total Anchored Blocks</div>
            <div className="text-5xl font-mono font-bold">{blocks.length}</div>
          </div>
        </div>
      </div>

      {/* Tamper Demonstration Result Alert */}
      {tamperResult && (
        <div className="p-8 border border-slate-900 bg-slate-900 text-white animate-in fade-in duration-300">
          <div className="flex items-center space-x-3 text-emerald-400 mb-6">
            <Bug className="w-6 h-6" />
            <h3 className="text-xl font-bold uppercase tracking-tight">Live Cryptographic Tamper Test Execution Report</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-700 border border-slate-700 mb-6">
            <div className="p-5 bg-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">1. Initial State</span>
              <strong className="text-lg font-mono text-emerald-400">{tamperResult.before_status}</strong>
            </div>
            <div className="p-5 bg-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">2. Mutated Block #{tamperResult.tampered_block_index}</span>
              <strong className="text-lg font-mono text-rose-400">{tamperResult.during_status}</strong>
            </div>
            <div className="p-5 bg-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">3. Restored State</span>
              <strong className="text-lg font-mono text-emerald-400">{tamperResult.repaired_status}</strong>
            </div>
          </div>
          <p className="text-sm text-slate-300 bg-slate-950 p-4 font-mono leading-relaxed">
            {tamperResult.message}
          </p>
        </div>
      )}

      {/* Blockchain Blocks List */}
      <div className="space-y-8">
        <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-4">
          Block History
        </h3>
        {loading ? (
          <div className="py-12 text-center text-sm font-bold uppercase tracking-widest text-slate-500">Loading blockchain ledger...</div>
        ) : blocks.length > 0 ? (
          <div className="space-y-px bg-slate-200 border border-slate-200">
            {blocks.map((b) => (
              <div key={b.block_index} className="bg-white p-6 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-slate-900 text-white font-mono text-sm font-bold tracking-widest">
                      BLK-{String(b.block_index).padStart(4, '0')}
                    </span>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">{b.event_type}</span>
                  </div>

                  <div className="flex items-center space-x-8">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Actor</div>
                      <div className="text-sm font-bold text-slate-900">{b.actor}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Timestamp</div>
                      <div className="text-sm font-mono text-slate-600">{new Date(b.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-200 border border-slate-200">
                  <div className="p-5 bg-slate-50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Previous Hash Link</div>
                    <div className="font-mono text-xs text-slate-500 break-all">{b.previous_hash}</div>
                  </div>
                  <div className="p-5 bg-indigo-50/50">
                    <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest mb-2">Block Hash (SHA-256)</div>
                    <div className="font-mono text-xs font-bold text-indigo-900 break-all">{b.block_hash}</div>
                  </div>
                </div>

                <div className="p-5 bg-slate-900 text-slate-300">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Payload Data</div>
                  <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {JSON.stringify(b.event_data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-sm font-bold uppercase tracking-widest text-slate-500">
            No events anchored.
          </div>
        )}
      </div>
    </div>
  );
}
