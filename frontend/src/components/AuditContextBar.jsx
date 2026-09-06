import React from 'react';
import { Check, Shield } from 'lucide-react';

const STAGES = [
  { id: 1, key: 'ingest',    num: '01', label: 'INGEST' },
  { id: 2, key: 'analyze',   num: '02', label: 'ANALYZE' },
  { id: 3, key: 'results',   num: '03', label: 'RESULTS' },
  { id: 4, key: 'proof',     num: '04', label: 'PROOF' },
  { id: 5, key: 'remediate', num: '05', label: 'REMEDIATE' },
  { id: 6, key: 'verify',    num: '06', label: 'VERIFY' },
  { id: 7, key: 'integrity', num: '07', label: 'INTEGRITY' },
];

export default function AuditContextBar({
  auditId = 'A-2026-0042',
  device = 'Cisco-CORE-01',
  vendor = 'Cisco IOS-XE',
  currentStage = 4,
  onStageClick,
}) {
  const activeIdx = typeof currentStage === 'number'
    ? currentStage
    : (STAGES.findIndex(s => s.key === currentStage) + 1 || 4);

  const displayAuditId = typeof auditId === 'number' ? `A-2026-00${auditId}` : auditId;

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg px-4 py-3 mb-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]/70">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-semibold text-xs text-sky-400 tracking-wider">
                AUDIT #{displayAuditId}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-medium text-slate-200">{device}</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-xs text-slate-400">{vendor}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Deterministic Audit Flow</span>
        </div>
      </div>

      {/* Contextual Workflow Steps */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3">
        {STAGES.map((s) => {
          const isDone = s.id < activeIdx;
          const isCurrent = s.id === activeIdx;
          const isFuture = s.id > activeIdx;

          return (
            <button
              key={s.id}
              disabled={isFuture || !onStageClick}
              onClick={() => onStageClick && onStageClick(s.id, s.key)}
              className={`flex flex-col items-center justify-center p-2 rounded transition-all text-center group ${
                isCurrent
                  ? 'bg-sky-500/10 border border-sky-500/40 text-sky-300 ring-1 ring-sky-500/30'
                  : isDone
                  ? 'text-slate-300 hover:bg-slate-800/60 border border-transparent cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed border border-transparent'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                {isDone ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full bg-sky-400 border border-sky-300 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B0F19]"></span>
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-mono tracking-wider font-semibold ${
                isCurrent ? 'text-sky-400' : isDone ? 'text-slate-300' : 'text-slate-600'
              }`}>
                {s.num} {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
