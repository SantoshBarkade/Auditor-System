import React, { useEffect, useState, useRef } from 'react';
import {
  ShieldAlert,
  Server,
  Activity,
  CheckCircle2,
  Play,
  ArrowRight,
  Shield,
  Clock,
  AlertTriangle,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

const DEMO_STEPS = [
  'Initializing audit engine...',
  'Parsing vendor configuration...',
  'Extracting security facts...',
  'Normalizing to vendor-neutral graph...',
  'Evaluating deterministic rule set...',
  'Calculating risk vectors...',
  'Mapping compliance frameworks...',
  'Building cryptographic audit trail...',
  'Generating remediation patches...',
  'Finalizing findings register...',
];

export default function Dashboard({ onSelectAudit, onNavigateTab }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState('');
  const [demoVendor, setDemoVendor] = useState(null);
  const stepIntervalRef = useRef(null);

  async function loadData() {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Dashboard load failed', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleTriggerDemo(vendor) {
    if (demoRunning) return;
    setDemoRunning(true);
    setDemoVendor(vendor);

    // Cycle through demo steps for UX
    let stepIdx = 0;
    setDemoStep(DEMO_STEPS[0]);
    stepIntervalRef.current = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, DEMO_STEPS.length - 1);
      setDemoStep(DEMO_STEPS[stepIdx]);
    }, 600);

    try {
      const res = await api.runVendorDemo(vendor);
      clearInterval(stepIntervalRef.current);
      setDemoStep('');
      await loadData();

      if (res?.audit_id) {
        showToast(`${vendor} audit complete — ${res.findings_count ?? '?'} findings detected.`, 'success');
        if (onSelectAudit) onSelectAudit(res.audit_id);
        // onSelectAudit already navigates to pipeline tab in App.jsx
      } else {
        showToast('Demo completed.', 'info');
      }
    } catch (err) {
      clearInterval(stepIntervalRef.current);
      setDemoStep('');
      showToast('Demo failed: ' + err.message, 'error');
    } finally {
      setDemoRunning(false);
      setDemoVendor(null);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 font-medium text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-3 text-slate-400" />
        Initializing Intelligence Feeds...
      </div>
    );
  }

  const criticalHigh = (summary?.critical_findings || 0) + (summary?.high_findings || 0);
  const totalFindings =
    (summary?.critical_findings || 0) +
    (summary?.high_findings || 0) +
    (summary?.medium_findings || 0) +
    (summary?.low_findings || 0);

  const severityBars = [
    { label: 'Critical', count: summary?.critical_findings || 0, color: 'bg-slate-900', textColor: 'text-red-600' },
    { label: 'High',     count: summary?.high_findings     || 0, color: 'bg-amber-600', textColor: 'text-amber-600' },
    { label: 'Medium',   count: summary?.medium_findings   || 0, color: 'bg-amber-400', textColor: 'text-amber-500' },
    { label: 'Low',      count: summary?.low_findings      || 0, color: 'bg-slate-300', textColor: 'text-blue-600' },
  ];
  const maxSev = Math.max(...severityBars.map(s => s.count), 1);

  const vendorBars = ['Cisco', 'Fortinet', 'Juniper'].map(v => ({
    label: v,
    count: summary?.vendor_distribution?.[v] || 0,
  }));
  const maxVendor = Math.max(...vendorBars.map(v => v.count), 1);

  const DEMO_VENDORS = [
    { key: 'Cisco',    label: 'Execute Cisco Baseline',   primary: true  },
    { key: 'Fortinet', label: 'Fortinet Edge',             primary: false },
    { key: 'Juniper',  label: 'Juniper Core',              primary: false },
  ];

  return (
    <div className="space-y-12 pb-16 max-w-[1400px] mx-auto">

      {/* SECTION A: POSTURE HERO */}
      <section className="editorial-section border-b-2 border-slate-900 pb-12 pt-4">
        <div className="flex flex-col xl:flex-row justify-between items-start gap-12">
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Global Network Security Posture
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              Real-time cryptographic evaluation of multi-vendor configurations.
              Deterministic rules engines identify policy deviations while AI generates remediation patches.
            </p>

            {/* Demo Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {DEMO_VENDORS.map(({ key, label, primary }) => (
                <button
                  key={key}
                  onClick={() => handleTriggerDemo(key)}
                  disabled={demoRunning}
                  className={`inline-flex items-center space-x-2 px-6 py-3 font-medium transition-colors disabled:opacity-60 ${
                    primary
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'border border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {demoRunning && demoVendor === key ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Live demo progress */}
            {demoRunning && demoStep && (
              <div className="flex items-center space-x-3 text-sm font-mono text-slate-600 bg-slate-50 border border-slate-200 px-5 py-3 animate-pulse">
                <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                <span>{demoStep}</span>
              </div>
            )}
          </div>

          {/* Hero Metrics */}
          <div className="flex flex-row xl:flex-col gap-12 xl:gap-8 shrink-0 xl:text-right w-full xl:w-auto border-t xl:border-t-0 border-slate-200 pt-8 xl:pt-0">
            <div>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Global Risk Index</p>
              <div className="text-6xl font-bold tracking-tighter text-slate-900">
                {summary?.average_risk_score ?? 0}
                <span className="text-2xl text-slate-400 font-normal">/100</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-2">Compliance State</p>
              <div className={`text-3xl font-semibold tracking-tight ${
                totalFindings === 0 ? 'text-slate-400' :
                (summary?.overall_compliance_pct || 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {totalFindings === 0 ? '—' : `${summary?.overall_compliance_pct ?? 0}%`}
              </div>
              {totalFindings === 0 && (
                <p className="text-xs text-slate-400 mt-1">Run a demo to populate</p>
              )}
            </div>
          </div>
        </div>

        {/* 5-CATEGORY FLOW METRIC CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-8">
          <div className="bg-white border border-slate-200 p-5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configurations</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{summary?.total_configurations ?? 0}</p>
            <span className="text-xs text-slate-500">Multi-Vendor Repos</span>
          </div>

          <div className="bg-white border border-slate-200 p-5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Audits</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{summary?.total_audits ?? 0}</p>
            <span className="text-xs text-slate-500">Cryptographic Runs</span>
          </div>

          <div className="bg-white border border-slate-200 p-5 space-y-1">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Violations (FAIL)</span>
            <p className="text-2xl font-bold font-mono text-rose-600">{totalFindings}</p>
            <span className="text-xs text-rose-600/70">Deterministic Findings</span>
          </div>

          <div 
            onClick={() => onNavigateTab && onNavigateTab('unresolved')}
            className="bg-white border border-amber-300 p-5 space-y-1 cursor-pointer hover:bg-amber-50/40 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Unresolved (Flow B)</span>
              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">RAG + Review</span>
            </div>
            <p className="text-2xl font-bold font-mono text-amber-700">{summary?.unresolved_count ?? 0}</p>
            <span className="text-xs text-amber-700 font-semibold group-hover:underline flex items-center gap-1">
              Inspect Cases <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-5 space-y-1">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Blockchain Ledger</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{summary?.total_blockchain_blocks ?? 0}</p>
            <span className="text-xs text-emerald-700 font-medium">SHA-256 Valid</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

        {/* SECTION B: ATTENTION REQUIRED */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-xl font-semibold tracking-tight">Attention Required</h2>
            <button
              onClick={() => onNavigateTab('findings')}
              className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center space-x-1"
            >
              <span>View All Findings</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {criticalHigh > 0 ? (
              <div className="p-6 bg-red-50 border-l-4 border-red-600 space-y-2">
                <div className="flex items-center space-x-2 text-red-700 font-semibold">
                  <ShieldAlert className="w-5 h-5" />
                  <span>{criticalHigh} Critical/High Violations Detected</span>
                </div>
                <p className="text-sm text-red-600/80 max-w-2xl">
                  Immediate remediation required for configurations violating core security invariants.
                </p>
                <button
                  onClick={() => onNavigateTab('findings')}
                  className="text-sm font-bold text-red-700 underline mt-2 inline-block"
                >
                  Investigate now
                </button>
              </div>
            ) : totalFindings === 0 ? (
              <div className="p-12 border border-dashed border-slate-300 text-center space-y-4">
                <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                <div>
                  <p className="text-slate-600 font-medium">No audit data yet.</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Execute a vendor baseline above to begin analysis.
                  </p>
                </div>
                <button
                  onClick={() => handleTriggerDemo('Cisco')}
                  disabled={demoRunning}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Cisco Demo</span>
                </button>
              </div>
            ) : (
              <div className="p-8 bg-emerald-50 border border-emerald-200 flex items-center space-x-4">
                <Shield className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-emerald-800 font-semibold">No critical posture deviations.</p>
                  <p className="text-emerald-700/70 text-sm mt-0.5">All active findings are medium/low severity.</p>
                </div>
              </div>
            )}
          </div>

          {/* Severity Distribution Visual */}
          {totalFindings > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                Severity Distribution
              </h3>
              <div className="space-y-3">
                {severityBars.map(({ label, count, color, textColor }) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="w-16 text-xs font-bold text-slate-600 uppercase tracking-wider shrink-0">{label}</span>
                    <div className="flex-1 h-2 bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-700`}
                        style={{ width: `${(count / maxSev) * 100}%` }}
                      />
                    </div>
                    <span className={`w-8 text-right font-mono font-bold text-sm ${textColor}`}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECTION C: RIGHT COLUMN */}
        <aside className="lg:col-span-4 space-y-12">

          {/* Vendor Distribution */}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight border-b border-slate-200 pb-4">Vendor Posture</h2>
            {vendorBars.every(v => v.count === 0) ? (
              <p className="text-sm text-slate-400 italic">No audit data. Run a demo.</p>
            ) : (
              <div className="space-y-4">
                {vendorBars.map(({ label, count }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700">{label}</span>
                      <span className="text-slate-500 font-mono text-xs">{count} findings</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-900 transition-all duration-700"
                        style={{ width: `${(count / maxVendor) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Compliance Ring */}
          {totalFindings > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold tracking-tight border-b border-slate-200 pb-4">Overall Compliance</h2>
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={summary?.overall_compliance_pct >= 80 ? '#10b981' : '#f59e0b'}
                      strokeWidth="3"
                      strokeDasharray={`${summary?.overall_compliance_pct || 0}, 100`}
                      strokeLinecap="butt"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {summary?.overall_compliance_pct ?? 0}%
                    </span>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Passing Controls</p>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* SECTION D: FORENSIC ACTIVITY LOG */}
      <section className="pt-8">
        <h2 className="text-xl font-semibold tracking-tight border-b border-slate-200 pb-4 mb-6">Forensic Activity Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-slate-400 font-bold text-xs uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="py-4 pr-6 font-medium">Audit ID</th>
                <th className="py-4 px-6 font-medium">Vendor</th>
                <th className="py-4 px-6 font-medium">Type</th>
                <th className="py-4 px-6 font-medium text-right">Risk Score</th>
                <th className="py-4 px-6 font-medium text-right">Compliance</th>
                <th className="py-4 pl-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {summary?.recent_audits?.length > 0 ? (
                summary.recent_audits.map((a) => (
                  <tr key={a.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 pr-6 font-mono font-medium text-slate-900">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-slate-300" />
                        <span>AUDIT-{String(a.id).padStart(4, '0')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-700">{a.vendor}</td>
                    <td className="py-4 px-6 text-slate-500">
                      {a.is_verification ? 'Verification Run' : 'Baseline Audit'}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold">
                      <span className={a.risk_score >= 70 ? 'text-red-600' : a.risk_score >= 45 ? 'text-amber-600' : 'text-emerald-600'}>
                        {a.risk_score}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-emerald-600">{a.compliance_score}%</td>
                    <td className="py-4 pl-6 text-right">
                      <button
                        onClick={() => onSelectAudit(a.id)}
                        className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                    No audits executed. The ledger is clean.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
