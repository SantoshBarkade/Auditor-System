import React, { useState } from 'react';
import {
  FileText,
  Search,
  Code,
  Layers,
  Database,
  ShieldAlert,
  Scale,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Lock,
  Wrench,
  Sparkles,
  UserCheck,
  FileSpreadsheet,
  ChevronRight,
  Info,
  X
} from 'lucide-react';

const STAGE_ICONS = {
  configuration: FileText,
  vendor_detection: Search,
  parser: Code,
  normalization: Layers,
  normalized_facts: Database,
  security_state: ShieldAlert,
  compliance_engine: Scale,
  verdict: AlertOctagon,
  evidence: Search,
  risk_engine: ShieldAlert,
  remediation: Wrench,
  ai_advisory: Sparkles,
  human_resolution: UserCheck,
  blockchain_ledger: Lock,
  reports: FileSpreadsheet
};

export default function AnalysisPipeline({
  stages = [],
  activeStageId = null,
  onSelectStage = null,
  className = ''
}) {
  const [selectedStage, setSelectedStage] = useState(null);

  if (!stages || stages.length === 0) {
    return null;
  }

  function getStatusStyle(status) {
    switch (status) {
      case 'PASS':
      case 'APPENDED':
      case 'RESOLVED':
      case 'AVAILABLE':
        return {
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          border: 'border-emerald-500/40 hover:border-emerald-500/60'
        };
      case 'FAIL':
      case 'CRITICAL':
        return {
          badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          border: 'border-rose-500/40 hover:border-rose-500/60'
        };
      case 'UNRESOLVED':
      case 'REQUIRED':
      case 'HIGH':
        return {
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          border: 'border-amber-500/40 hover:border-amber-500/60'
        };
      case 'CONFLICT':
      case 'MEDIUM':
        return {
          badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          dot: 'bg-purple-400',
          border: 'border-purple-500/40 hover:border-purple-500/60'
        };
      case 'N/A':
      case 'PENDING':
      case 'LOW':
      default:
        return {
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-500',
          border: 'border-slate-800 hover:border-slate-700'
        };
    }
  }

  function handleStageClick(stage) {
    setSelectedStage(stage);
    if (onSelectStage) {
      onSelectStage(stage);
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
          <h3 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-slate-200">
            Authoritative Analysis Pipeline (15 Stages)
          </h3>
        </div>
        <span className="text-xs sm:text-sm font-mono text-cyan-400 font-semibold bg-cyan-950/30 px-3 py-1 rounded-md border border-cyan-500/30">
          Deterministic Pipeline • Click any stage to inspect
        </span>
      </div>

      {/* Horizontal Pipeline Scroll Container with comfortable card size */}
      <div className="relative rounded-2xl border border-slate-800/90 bg-slate-950/80 p-4 sm:p-5 shadow-sm overflow-x-auto">
        <div className="flex items-center space-x-2.5 min-w-max pb-1">
          {stages.map((stage, idx) => {
            const Icon = STAGE_ICONS[stage.id] || Info;
            const style = getStatusStyle(stage.status);
            const isCurrent = activeStageId === stage.id || selectedStage?.id === stage.id;

            return (
              <React.Fragment key={stage.id || idx}>
                <button
                  type="button"
                  onClick={() => handleStageClick(stage)}
                  className={`group relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${style.border} ${
                    isCurrent
                      ? 'bg-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400'
                      : 'bg-slate-900/70 hover:bg-slate-900'
                  }`}
                  style={{ width: '195px' }}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-slate-200">
                      {stage.index}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${style.badge}`}
                    >
                      {stage.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-1.5">
                    <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-sm font-bold text-white truncate max-w-[145px]">
                      {stage.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {stage.description}
                  </p>
                </button>

                {idx < stages.length - 1 && (
                  <div className="text-slate-600 shrink-0 select-none">
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Detail Drawer */}
      {selectedStage && (
        <div className="rounded-2xl border border-cyan-500/40 bg-slate-950 p-5 space-y-4 shadow-lg animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <span className="text-sm sm:text-base font-mono text-cyan-300 font-bold">
                  Stage {selectedStage.index}: {selectedStage.label}
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                    getStatusStyle(selectedStage.status).badge
                  }`}
                >
                  {selectedStage.status}
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-normal">{selectedStage.description}</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStage(null)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-850 cursor-pointer transition-colors shrink-0"
              title="Close stage details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 border-t border-slate-800 text-sm font-mono">
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs uppercase font-semibold">Engine Authority</div>
              <div className="text-slate-100 font-bold truncate">
                {selectedStage.engine || 'Deterministic System'}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs uppercase font-semibold">Status Meaning</div>
              <div className="text-slate-100 font-bold truncate">
                {selectedStage.status === 'PASS'
                  ? 'Criteria Satisfied'
                  : selectedStage.status === 'FAIL'
                  ? 'Deterministic Violation'
                  : selectedStage.status === 'UNRESOLVED'
                  ? 'Ambiguous Evidence'
                  : selectedStage.status}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-slate-400 text-xs uppercase font-semibold">Provenance Link</div>
              <div className="text-cyan-400 font-bold truncate">
                Authoritative Backend Verified
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
