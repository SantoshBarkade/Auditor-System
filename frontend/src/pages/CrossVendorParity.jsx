import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers, Network, Shield, CheckCircle2, ArrowRight, ArrowDown,
  Play, RotateCcw, Loader2, AlertTriangle, GitMerge, Zap,
  ChevronRight, Lock, Wifi, Server, Eye, Code
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

// ─── Stage configuration ──────────────────────────────────────────────────────
const STAGES = [
  { id: 'IDLE',        label: 'Ready',       color: 'text-slate-400' },
  { id: 'LOADING',     label: 'Fetching',    color: 'text-slate-600' },
  { id: 'RAW',         label: 'Raw Syntax',  color: 'text-amber-600' },
  { id: 'PARSING',     label: 'Parsing',     color: 'text-indigo-600' },
  { id: 'NORMALIZING', label: 'Normalizing', color: 'text-purple-600' },
  { id: 'CONVERGING',  label: 'Converging',  color: 'text-slate-900'  },
  { id: 'EVALUATING',  label: 'Evaluating',  color: 'text-slate-900'  },
  { id: 'COMPLETE',    label: 'Complete',    color: 'text-emerald-600' },
];

// ─── Vendor palette ───────────────────────────────────────────────────────────
const VENDOR_META = {
  Cisco:    { accent: '#6366f1', accentBg: 'bg-indigo-50',  accentText: 'text-indigo-700', accentBorder: 'border-indigo-200', label: 'Cisco IOS-XE'  },
  Fortinet: { accent: '#e11d48', accentBg: 'bg-rose-50',    accentText: 'text-rose-700',   accentBorder: 'border-rose-200',   label: 'Fortinet FortiOS' },
  Juniper:  { accent: '#9333ea', accentBg: 'bg-purple-50',  accentText: 'text-purple-700', accentBorder: 'border-purple-200', label: 'Juniper JunOS' },
};

// ─── Severity color for a semantic state ─────────────────────────────────────
function stateColor(status) {
  const s = (status || '').toUpperCase();
  if (['VIOLATION', 'INSECURE', 'DISABLED', 'WEAK'].includes(s)) return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' };
  if (['ENABLED', 'STRONG', 'SECURE'].includes(s)) return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' };
}

// ─── Helper: pick top N states from a vendor ─────────────────────────────────
function topStates(states = [], n = 5) {
  // Sort: violations first, then alphabetically
  return [...states]
    .sort((a, b) => {
      const aVio = ['VIOLATION','INSECURE','WEAK','DISABLED'].includes((a.status||'').toUpperCase()) ? 0 : 1;
      const bVio = ['VIOLATION','INSECURE','WEAK','DISABLED'].includes((b.status||'').toUpperCase()) ? 0 : 1;
      return aVio - bVio || a.key.localeCompare(b.key);
    })
    .slice(0, n);
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimCounter({ target, active, className }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let cur = 0;
    const step = Math.ceil(target / 20);
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [active, target]);
  return <span className={className}>{val}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CrossVendorParity() {
  const [stage, setStage]         = useState('IDLE');
  const [data, setData]           = useState(null);           // from API
  const [viewMode, setViewMode]   = useState('RAW');          // RAW | MEANING
  const [focusVendor, setFocusVendor] = useState('Cisco');    // for swap demo
  const [parseChecks, setParseChecks] = useState({});         // { Cisco: false, Fortinet: false, Juniper: false }
  const [showGraph, setShowGraph] = useState(false);
  const [animCount, setAnimCount] = useState(false);
  const stageTimers = useRef([]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => stageTimers.current.forEach(clearTimeout);
  }, []);

  function clearTimers() {
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = [];
  }

  function delay(ms, cb) {
    const t = setTimeout(cb, ms);
    stageTimers.current.push(t);
    return t;
  }

  const runConvergence = useCallback(async () => {
    clearTimers();
    setStage('LOADING');
    setShowGraph(false);
    setAnimCount(false);
    setParseChecks({});
    setViewMode('RAW');

    try {
      const result = await api.getConvergenceDemo();
      setData(result);

      // Stage 1 — highlight raw syntax cards
      setStage('RAW');
      delay(1200, () => {
        // Stage 2 — parsing, reveal vendor checkmarks one by one
        setStage('PARSING');
        delay(600,  () => setParseChecks(p => ({ ...p, Cisco: true })));
        delay(1100, () => setParseChecks(p => ({ ...p, Fortinet: true })));
        delay(1600, () => setParseChecks(p => ({ ...p, Juniper: true })));

        delay(2000, () => {
          // Stage 3 — normalizing
          setStage('NORMALIZING');
          delay(1200, () => {
            // Stage 4 — converging
            setStage('CONVERGING');
            delay(1000, () => {
              // Stage 5 — evaluating
              setStage('EVALUATING');
              setAnimCount(true);
              delay(1400, () => {
                // Stage 6 — complete
                setStage('COMPLETE');
                setShowGraph(true);
                setViewMode('MEANING');
              });
            });
          });
        });
      });

    } catch (err) {
      showToast('Convergence fetch failed: ' + err.message, 'error');
      setStage('IDLE');
    }
  }, []);

  function reset() {
    clearTimers();
    setStage('IDLE');
    setShowGraph(false);
    setAnimCount(false);
    setParseChecks({});
    setViewMode('RAW');
    setFocusVendor('Cisco');
  }

  const isRunning = !['IDLE', 'COMPLETE'].includes(stage);
  const isComplete = stage === 'COMPLETE';
  const vendors = ['Cisco', 'Fortinet', 'Juniper'];
  const universalStates = data?.universal_states || [];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-16 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-slate-200 pb-8">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Core Innovation · Semantic Normalization Engine
            </span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            Semantic Convergence
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed font-medium">
            Different syntax.{' '}
            <span className="text-slate-900 font-bold">Same security meaning.</span>
          </p>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
            NEXORA converts proprietary network configurations into a vendor-neutral
            security state graph before deterministic compliance evaluation. One rule
            engine. Three vendors. Zero duplication.
          </p>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-4 shrink-0">
          {stage === 'IDLE' && (
            <button
              onClick={runConvergence}
              className="flex items-center space-x-3 px-8 py-4 bg-slate-900 hover:bg-slate-700 text-white font-bold text-sm uppercase tracking-widest transition-all duration-200 group"
            >
              <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Run Semantic Convergence</span>
            </button>
          )}

          {isRunning && (
            <button disabled className="flex items-center space-x-3 px-8 py-4 bg-slate-900 text-white font-bold text-sm uppercase tracking-widest opacity-80 cursor-not-allowed">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{STAGES.find(s => s.id === stage)?.label}...</span>
            </button>
          )}

          {isComplete && (
            <div className="flex items-center gap-3">
              <div className="flex items-center space-x-2 px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" />
                <span>Semantic Convergence Verified</span>
              </div>
              <button
                onClick={reset}
                className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-widest transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Run Again</span>
              </button>
            </div>
          )}

          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {stage === 'IDLE' ? '● Ready to Analyze' :
             isComplete ? '● Analysis Complete' :
             `● ${STAGES.find(s => s.id === stage)?.label || '...'}`}
          </div>
        </div>
      </div>

      {/* ── STAGE PROGRESS BAR ────────────────────────────────────────────────── */}
      {stage !== 'IDLE' && (
        <div className="border border-slate-200 bg-white p-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Convergence Pipeline
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${STAGES.find(s => s.id === stage)?.color}`}>
              {STAGES.find(s => s.id === stage)?.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {['RAW','PARSING','NORMALIZING','CONVERGING','EVALUATING','COMPLETE'].map((s, i, arr) => {
              const stageIdx = arr.indexOf(stage);
              const isDone   = i < stageIdx;
              const isCur    = i === stageIdx;
              return (
                <React.Fragment key={s}>
                  <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    isDone ? 'bg-slate-900' :
                    isCur  ? 'bg-slate-900 animate-pulse' :
                    'bg-slate-200'
                  }`} />
                  {i < arr.length - 1 && <div className="w-1" />}
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {['RAW SYNTAX','PARSING','NORMALIZING','CONVERGING','EVALUATING','COMPLETE'].map((l, i) => (
              <span key={l} className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hidden sm:block"
                style={{ width: `${100/6}%`, textAlign: i === 0 ? 'left' : i === 5 ? 'right' : 'center' }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── PARSING STATUS (Stage 2) ──────────────────────────────────────────── */}
      {(stage === 'PARSING' || stage === 'NORMALIZING') && (
        <div className="border border-slate-900 bg-slate-900 text-white p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center space-x-3 mb-6">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <h3 className="font-bold uppercase tracking-widest text-sm">
              {stage === 'PARSING' ? 'Parsing Vendor Syntax' : 'Normalizing to Semantic States'}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-px bg-slate-700 border border-slate-700">
            {vendors.map(v => (
              <div key={v} className="bg-slate-800 p-5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    {v}
                  </div>
                  <div className="text-sm font-mono text-slate-300">
                    {stage === 'PARSING' ? 'Tokenizing...' : 'Building state graph...'}
                  </div>
                </div>
                {parseChecks[v] ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CONVERGENCE VISUAL (Stage 4+) ─────────────────────────────────────── */}
      {(stage === 'CONVERGING' || stage === 'EVALUATING' || isComplete) && (
        <div className="border border-slate-200 bg-white p-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="flex flex-col items-center space-y-8">

            {/* 3 → 1 Funnel */}
            <div className="w-full max-w-3xl">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {vendors.map((v, i) => (
                  <div key={v} className="flex flex-col items-center space-y-3">
                    <div
                      className="w-full p-4 border-2 text-center font-bold text-sm uppercase tracking-widest transition-all duration-700"
                      style={{
                        borderColor: VENDOR_META[v].accent,
                        color: VENDOR_META[v].accent,
                        boxShadow: `0 0 20px ${VENDOR_META[v].accent}22`,
                        animation: `pulse-vendor-${i} 2s ease-in-out infinite`,
                      }}
                    >
                      {v}
                      <div className="text-[10px] font-normal mt-1 opacity-70">
                        {data?.vendors?.[v]?.line_count || '–'} lines parsed
                      </div>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-px h-8 bg-slate-300" />
                      <ArrowDown className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">
                      {data?.vendors?.[v]?.semantic_states?.length || 0} semantic facts
                    </div>
                  </div>
                ))}
              </div>

              {/* Merge point */}
              <div className="relative flex items-center justify-center">
                <div className="absolute left-1/6 right-1/6 top-1/2 h-px bg-slate-300 -translate-y-1/2" />
                <div className="flex flex-col items-center z-10 bg-white px-4">
                  <div
                    className="w-20 h-20 bg-slate-900 flex items-center justify-center shadow-2xl transition-all duration-500"
                    style={isComplete ? { boxShadow: '0 0 40px rgba(15,23,42,0.3)' } : {}}
                  >
                    <GitMerge className="w-10 h-10 text-white" />
                  </div>
                  <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-900 text-center">
                    Semantic Engine
                  </div>
                  <div className="text-[10px] text-slate-400 text-center mt-1">
                    Token-rule normalization
                  </div>
                </div>
              </div>

              {/* Output */}
              <div className="flex flex-col items-center mt-6 space-y-2">
                <div className="w-px h-8 bg-slate-300" />
                <div className="border-2 border-slate-900 bg-white px-8 py-4 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Universal Security State
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-900">
                    <AnimCounter target={universalStates.length || (data?.total_unique_states || 0)} active={animCount} className="" />
                    {' '}<span className="text-base text-slate-500">canonical facts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 → 1 Metric */}
            {(stage === 'EVALUATING' || isComplete) && (
              <div className="w-full max-w-lg border border-slate-200 animate-in fade-in duration-500">
                <div className="grid grid-cols-3 gap-px bg-slate-200">
                  <div className="bg-white p-6 text-center">
                    <div className="text-5xl font-bold font-mono text-slate-900">
                      <AnimCounter target={3} active={animCount} className="" />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Vendor Dialects</div>
                  </div>
                  <div className="bg-slate-900 p-6 text-center flex items-center justify-center">
                    <ArrowRight className="w-8 h-8 text-white" />
                  </div>
                  <div className="bg-white p-6 text-center">
                    <div className="text-5xl font-bold font-mono text-emerald-600">1</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Security Language</div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
                  <span className="text-xs text-slate-500 font-medium">
                    Vendor-independent deterministic evaluation
                  </span>
                </div>
              </div>
            )}

            {/* Equivalence banner */}
            {isComplete && (
              <div className="w-full flex items-center justify-center space-x-4 p-6 bg-emerald-900 border border-emerald-900 animate-in fade-in zoom-in-95 duration-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-center">
                  <div className="text-emerald-400 font-bold uppercase tracking-widest text-sm">
                    Semantic Equivalence Detected
                  </div>
                  <div className="text-emerald-200 text-xs mt-1">
                    Vendor syntax disappears. Security meaning remains.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TOGGLE BAR ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 border border-slate-200 bg-white p-1">
          {[['RAW', <Code className="w-3.5 h-3.5" />, 'Raw Syntax'], ['MEANING', <Eye className="w-3.5 h-3.5" />, 'Security Meaning']].map(([m, icon, label]) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              disabled={!data}
              className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-40 ${
                viewMode === m
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {viewMode === 'MEANING' && data && (
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-4 py-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Showing canonical security states</span>
          </div>
        )}
      </div>

      {/* ── THREE VENDOR CARDS ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
        {vendors.map(vendorName => {
          const meta   = VENDOR_META[vendorName];
          const vdata  = data?.vendors?.[vendorName];
          const states = vdata?.semantic_states || [];
          const displayStates = topStates(states, 7);
          const isHighlighted = stage === 'RAW' || stage === 'PARSING';

          return (
            <div
              key={vendorName}
              className={`bg-white flex flex-col transition-all duration-500 ${
                isHighlighted ? 'ring-2 ring-inset' : ''
              }`}
              style={isHighlighted ? { '--tw-ring-color': meta.accent + '44' } : {}}
            >
              {/* Card header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                  <div>
                    <div className="font-bold text-slate-900 text-sm tracking-tight">{vendorName}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{meta.label}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {vdata?.device?.hostname && (
                    <span className="text-[10px] font-mono text-slate-500">{vdata.device.hostname}</span>
                  )}
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 ${
                    viewMode === 'MEANING'
                      ? `${meta.accentBg} ${meta.accentText} border ${meta.accentBorder}`
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {viewMode === 'RAW' ? 'RAW' : 'NORMALIZED'}
                  </span>
                </div>
              </div>

              {/* RAW SYNTAX view */}
              {viewMode === 'RAW' && (
                <div className="flex-1 flex flex-col">
                  <div className="px-6 pt-4 pb-2">
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">
                      Proprietary Syntax
                    </span>
                  </div>
                  <div className="mx-6 mb-6 bg-slate-900 p-4 font-mono text-xs text-slate-300 flex-1 min-h-[200px] overflow-auto">
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {vdata?.raw_content
                        ? vdata.raw_content.split('\n').slice(0, 18).join('\n')
                        : stage === 'IDLE'
                          ? '! Press ▶ Run Semantic Convergence to load...'
                          : '! Loading...'}
                    </pre>
                  </div>

                  {vdata && (
                    <div className="px-6 pb-4">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{vdata.line_count} lines</span>
                        <span className="flex items-center space-x-1 text-amber-600">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{states.filter(s => ['VIOLATION','INSECURE','WEAK'].includes(s.status?.toUpperCase())).length} issues detected</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECURITY MEANING view */}
              {viewMode === 'MEANING' && (
                <div className="flex-1 flex flex-col">
                  <div className="px-6 pt-4 pb-2">
                    <span className="text-[10px] uppercase text-slate-900 font-bold tracking-widest">
                      Canonical Security States
                    </span>
                  </div>

                  {displayStates.length === 0 ? (
                    <div className="mx-6 mb-6 p-4 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      {stage === 'IDLE' ? 'Run convergence to see semantic states' : 'Loading...'}
                    </div>
                  ) : (
                    <div className="mx-6 mb-4 space-y-1.5 flex-1">
                      {displayStates.map((s, i) => {
                        const sc = stateColor(s.status);
                        const isUniversal = universalStates.some(u => u.key === s.key);
                        return (
                          <div
                            key={`${s.key}-${i}`}
                            className={`flex items-center justify-between px-3 py-2.5 border text-xs ${sc.bg} ${sc.border} animate-in fade-in duration-300`}
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                              <code className={`font-mono font-bold truncate ${sc.text}`}>{s.key}</code>
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                              {isUniversal && (
                                <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-900 text-white px-1.5 py-0.5">
                                  UNIVERSAL
                                </span>
                              )}
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${sc.bg} ${sc.text} border ${sc.border}`}>
                                {s.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {states.length > 7 && (
                        <div className="text-[10px] text-slate-400 font-medium text-center py-2">
                          +{states.length - 7} more states
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw provenance */}
                  {displayStates[0] && (
                    <div className="mx-6 mb-4 p-3 bg-slate-900 border border-slate-800">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        Raw Statement → Semantic Fact
                      </div>
                      <code className="text-[10px] font-mono text-slate-400 block">
                        {displayStates[0].raw_statement || '—'}
                      </code>
                      <div className="flex items-center space-x-2 mt-2">
                        <ArrowDown className="w-3 h-3 text-slate-600" />
                        <code className="text-[10px] font-mono font-bold text-emerald-400">
                          {displayStates[0].key}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Parser status footer */}
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Parser Status
                </div>
                <div className="flex items-center space-x-1.5">
                  {parseChecks[vendorName] || isComplete ? (
                    <span className="flex items-center space-x-1 text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Complete</span>
                    </span>
                  ) : stage === 'PARSING' ? (
                    <span className="flex items-center space-x-1 text-indigo-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Parsing</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {stage === 'IDLE' ? 'Idle' : 'Queued'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SEMANTIC EQUIVALENCE CALLOUT ──────────────────────────────────────── */}
      {viewMode === 'MEANING' && data && (
        <div className="border border-slate-200 bg-white p-8 animate-in fade-in duration-500">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Semantic Equivalence</h3>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">
                States present in all three vendors → same rule, same evaluation
              </p>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200 px-3 py-1.5">
              {universalStates.length} Universal States
            </div>
          </div>

          {universalStates.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 text-center text-sm text-slate-400">
              No universal states found — run convergence to detect equivalences.
            </div>
          ) : (
            <div className="space-y-px bg-slate-200 border border-slate-200">
              {universalStates.map((us, i) => {
                const sc = stateColor('VIOLATION'); // most universal states are violations
                return (
                  <div key={us.key} className="bg-white p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

                    {/* State key */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Canonical State</div>
                      <code className="font-mono font-bold text-slate-900 text-sm">{us.key}</code>
                      <div className="flex items-center space-x-1 mt-2">
                        {['Cisco','Fortinet','Juniper'].map(v => (
                          <span key={v} className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 border"
                            style={{ borderColor: VENDOR_META[v].accent, color: VENDOR_META[v].accent }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Semantically equivalent badge */}
                    <div className="flex items-center justify-center">
                      <div className="text-center space-y-1">
                        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Same intent across vendors</div>
                        <div className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Semantically Equivalent</span>
                        </div>
                      </div>
                    </div>

                    {/* Compliance mappings */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Compliance Controls</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(us.compliance || []).length === 0 ? (
                          <span className="text-xs text-slate-400">No direct mapping</span>
                        ) : us.compliance.map(c => (
                          <span key={c} className="text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white px-2 py-1">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── UNIVERSAL SECURITY STATE GRAPH ────────────────────────────────────── */}
      {showGraph && data && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-600">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">
              Universal Security State Graph
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">
              Deterministic evaluation target — vendor-agnostic facts from real normalization
            </p>
          </div>

          {/* Central graph visual */}
          <div className="border border-slate-900 bg-slate-900 p-8 text-white">
            {/* Root node */}
            <div className="flex flex-col items-center space-y-6">
              <div className="px-8 py-3 border border-white/20 bg-white/10 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-1">Evaluation Target</div>
                <div className="font-bold uppercase tracking-widest text-white text-sm">Universal Security State</div>
              </div>

              {/* Connector */}
              <div className="w-px h-6 bg-white/20" />

              {/* State nodes grid */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {(data.total_unique_states > 0
                    ? (() => {
                        // Aggregate all unique states across all vendors
                        const seen = new Map();
                        vendors.forEach(v => {
                          (data.vendors?.[v]?.semantic_states || []).forEach(s => {
                            if (!seen.has(s.key)) seen.set(s.key, s);
                          });
                        });
                        return [...seen.values()].sort((a,b) => a.key.localeCompare(b.key));
                      })()
                    : []
                ).map((s, i) => {
                  const sc = stateColor(s.status);
                  const isUniversal = universalStates.some(u => u.key === s.key);
                  return (
                    <div
                      key={s.key}
                      className={`p-3 border text-center animate-in fade-in duration-300 ${
                        isUniversal
                          ? 'border-emerald-500/50 bg-emerald-900/30'
                          : 'border-white/10 bg-white/5'
                      }`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <code className="text-[10px] font-mono font-bold text-white/90 block leading-tight">
                        {s.key}
                      </code>
                      <div className="mt-1.5 flex items-center justify-center space-x-1">
                        {isUniversal && (
                          <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-400">
                            ✓ ALL VENDORS
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Connector to rules */}
              <div className="w-px h-6 bg-white/20" />

              {/* Deterministic rules */}
              <div className="w-full">
                <div className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">
                  Deterministic Rule Engine
                </div>
                <div className="grid grid-cols-3 gap-px bg-white/10 border border-white/10">
                  {['NIST 800-53', 'PCI-DSS 4.0', 'ISO 27001'].map(fw => (
                    <div key={fw} className="bg-white/5 p-5 text-center">
                      <Shield className="w-5 h-5 text-white/40 mx-auto mb-2" />
                      <div className="text-[11px] font-bold uppercase tracking-widest text-white/70">{fw}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VENDOR SWAP DEMO ──────────────────────────────────────────────────── */}
      {data && (
        <div className="border border-slate-200 bg-white animate-in fade-in duration-500">
          <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">
                What Happens When the Vendor Changes?
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium uppercase tracking-widest">
                Switch vendor — the security evaluation logic never changes
              </p>
            </div>
            <Zap className="w-5 h-5 text-slate-400" />
          </div>

          {/* Vendor selector */}
          <div className="px-8 pt-6 pb-4">
            <div className="flex items-center space-x-1 border border-slate-200 bg-slate-50 p-1 w-fit">
              {vendors.map(v => (
                <button
                  key={v}
                  onClick={() => setFocusVendor(v)}
                  className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                    focusVendor === v
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-200 border border-slate-200">

              {/* Left — vendor-specific */}
              <div className="bg-white p-6 space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {focusVendor} Proprietary Command
                </div>
                <div className="bg-slate-900 p-4 font-mono text-xs text-slate-300">
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {(data.vendors?.[focusVendor]?.semantic_states || [])
                      .filter(s => s.raw_statement)
                      .slice(0, 4)
                      .map(s => s.raw_statement)
                      .join('\n') || '—'}
                  </pre>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Vendor: <strong className="text-slate-900">{focusVendor}</strong> ·{' '}
                  Lines: <strong className="text-slate-900">{data.vendors?.[focusVendor]?.line_count || 0}</strong>
                </div>
              </div>

              {/* Right — universal */}
              <div className="bg-slate-50 p-6 space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-900">
                  Same Evaluation Logic Applied
                </div>
                <div className="space-y-2">
                  {[
                    'Same security intent',
                    'Same normalized state model',
                    'Same compliance logic',
                    'Same evidence model',
                  ].map(item => (
                    <div key={item} className="flex items-center space-x-3 p-3 bg-white border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-medium text-slate-900">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-slate-900 text-white text-xs font-mono">
                  <span className="text-slate-500">// Rule: </span>
                  <span className="text-emerald-400">evaluate(UNIVERSAL_STATE)</span>
                  <br />
                  <span className="text-slate-500">// No vendor-specific branch.</span>
                  <br />
                  <span className="text-slate-500">// No regex per vendor.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IDLE CONCEPT EXPLAINER (visible before first run) ─────────────────── */}
      {stage === 'IDLE' && !data && (
        <div className="p-8 bg-slate-50 border border-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="p-4 bg-slate-900 shrink-0">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-slate-900 tracking-tight">Universal Deterministic Evaluation</h4>
              <p className="text-slate-600 leading-relaxed max-w-3xl">
                A single security rule (e.g.{' '}
                <code className="text-slate-900 font-bold font-mono text-sm bg-slate-100 px-1.5 py-0.5">require_ssh_only</code>)
                is evaluated against the <em>normalized state</em> — not the raw configuration. This guarantees
                mathematical consistency across the entire network fabric regardless of underlying hardware vendor.
              </p>
              <div className="flex flex-wrap gap-4">
                {['No vendor-specific rule forks', 'One evaluation engine', 'Deterministic verdicts', 'Cross-vendor parity'].map(item => (
                  <div key={item} className="flex items-center space-x-2 bg-white p-3 border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-medium text-slate-900">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
