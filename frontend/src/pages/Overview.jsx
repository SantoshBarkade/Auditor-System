import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Plus,
  Terminal,
  Activity,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  HelpCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useLocation } from 'wouter';
import { api, ApiError } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';

export default function Overview({ onSelectAudit, onSelectFinding, onSelectCase }) {
  const [, setLocation] = useLocation();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError(err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAuditClick = (auditId) => {
    if (typeof onSelectAudit === 'function') onSelectAudit(auditId);
    setLocation(`/audits/${auditId}`);
  };

  const handleFindingClick = (findingId) => {
    if (typeof onSelectFinding === 'function') onSelectFinding(findingId);
    setLocation(`/findings/${findingId}`);
  };

  const handleCaseClick = (caseId) => {
    if (typeof onSelectCase === 'function') onSelectCase(caseId);
    setLocation(`/unresolved/${caseId}`);
  };

  // Honest metric extraction - never fabricated
  const hasAudits = summary && summary.total_audits > 0;
  const totalAudits = summary?.total_audits ?? 0;
  const postureScore = hasAudits ? summary.overall_compliance_pct : null;
  const passCount = hasAudits ? summary.pass_findings : 0;
  const failCount = hasAudits ? summary.fail_findings : 0;
  const unresolvedCount = summary?.unresolved_count ?? 0;
  const avgRisk = hasAudits ? summary.average_risk_score : 0;
  const recentAudits = summary?.recent_audits || [];
  const recentFindings = summary?.recent_findings || [];
  const isChainValid = summary?.blockchain_integrity ?? true;
  const totalBlocks = summary?.total_blockchain_blocks ?? 0;

  const PIPELINE_PILLARS = [
    { step: '01', title: 'Configuration', sub: hasAudits ? `${totalAudits} Ingested` : 'Awaiting Config', status: hasAudits ? 'PASS' : 'IDLE', route: '/audits' },
    { step: '02', title: 'Vendor Parser', sub: hasAudits ? 'Deterministic AST' : 'Idle', status: hasAudits ? 'PASS' : 'IDLE', route: '/audits' },
    { step: '03', title: 'Normalization', sub: hasAudits ? 'Vendor-Neutral Model' : 'Idle', status: hasAudits ? 'PASS' : 'IDLE', route: '/audits' },
    { step: '04', title: 'Security State', sub: failCount > 0 ? 'State Violations' : (hasAudits ? 'State Satisfied' : 'Idle'), status: failCount > 0 ? 'FAIL' : (hasAudits ? 'PASS' : 'IDLE'), route: '/findings' },
    { step: '05', title: 'Compliance Engine', sub: hasAudits ? `${postureScore}% Baseline` : 'Idle', status: failCount > 0 ? 'FAIL' : (hasAudits ? 'PASS' : 'IDLE'), route: '/audits' },
    { step: '06', title: 'Deterministic Verdict', sub: hasAudits ? `${passCount}P / ${failCount}F` : 'Idle', status: failCount > 0 ? 'FAIL' : (hasAudits ? 'PASS' : 'IDLE'), route: '/findings' },
    { step: '07', title: 'Risk Calculation', sub: hasAudits ? `Score ${avgRisk}/100` : 'Idle', status: avgRisk > 70 ? 'CRITICAL' : (avgRisk > 40 ? 'HIGH' : 'PASS'), route: '/findings' },
    { step: '08', title: 'Remediation', sub: failCount > 0 ? 'Sandbox Patches' : 'Baseline Verified', status: failCount > 0 ? 'AVAILABLE' : 'PASS', route: '/findings' },
    { step: '09', title: 'Blockchain Ledger', sub: `${totalBlocks} Blocks (SHA-256)`, status: isChainValid ? 'APPENDED' : 'FAIL', route: '/audits' },
    { step: '10', title: 'Audit Reports', sub: hasAudits ? 'PDF / CSV / JSON' : 'Pending Audit', status: hasAudits ? 'AVAILABLE' : 'PENDING', route: '/reports' },
  ];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header with primary actions */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Security posture & verification
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 font-semibold">
              AST DETERMINISTIC
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-300 mt-1 font-normal leading-relaxed">
            Deterministic network compliance auditor grounded in AST facts, sandbox patch verification, and cryptographic blockchain ledger.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => setLocation('/audits')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New audit</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm text-rose-300">Unable to load dashboard data</div>
              <div className="text-xs text-rose-400/90 mt-0.5 font-mono">{error.message || 'API connection failed'}</div>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 text-xs font-semibold bg-rose-800/40 hover:bg-rose-800/60 text-rose-100 rounded border border-rose-700/50 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && !summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-900/40 border border-slate-800/60 animate-pulse" />
            ))}
          </div>
          <div className="h-48 rounded-xl bg-slate-900/40 border border-slate-800/60 animate-pulse" />
        </div>
      )}

      {/* Empty Database State */}
      {!loading && !error && !hasAudits && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-10 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 flex items-center justify-center mx-auto">
            <FileCode className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-white">Your workspace is ready</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              No configuration audits have been executed yet. Run an audit on a Cisco, Fortinet, or Juniper configuration to see real deterministic posture, findings, and verification.
            </p>
          </div>
          <button
            onClick={() => setLocation('/audits')}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Run your first audit</span>
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards (Honest Real Data Only) */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Posture Score */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-4 transition-colors hover:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Baseline Posture</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-white font-mono mt-2">
              {postureScore !== null ? `${postureScore}%` : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {hasAudits ? `${totalAudits} audits evaluated` : 'No audits executed'}
            </div>
          </div>

          {/* Controls Pass / Fail */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-4 transition-colors hover:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Control Verdicts</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-white font-mono mt-2 flex items-baseline space-x-2">
              <span className="text-emerald-400">{passCount}</span>
              <span className="text-slate-600 text-lg font-normal">/</span>
              <span className="text-rose-400">{failCount}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {hasAudits ? `${passCount} pass | ${failCount} fail` : 'Zero findings recorded'}
            </div>
          </div>

          {/* Unresolved Cases */}
          <div
            onClick={() => setLocation('/unresolved')}
            className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-4 transition-colors hover:border-amber-500/40 cursor-pointer shadow-xs group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Unresolved Cases</span>
              <span className={`w-2 h-2 rounded-full ${unresolvedCount > 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
            </div>
            <div className="text-3xl font-bold tracking-tight text-amber-300 font-mono mt-2 flex items-center justify-between">
              <span>{unresolvedCount}</span>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              {unresolvedCount > 0 ? 'Human review queue' : 'No ambiguous syntax'}
            </div>
          </div>

          {/* Blockchain Ledger */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-4 transition-colors hover:border-slate-700/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Blockchain Ledger</span>
              <span className={`w-2 h-2 rounded-full ${isChainValid ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            </div>
            <div className="text-3xl font-bold tracking-tight text-white font-mono mt-2 flex items-baseline space-x-1.5">
              <span>{totalBlocks}</span>
              <span className="text-xs text-slate-400 font-normal">blocks</span>
            </div>
            <div className="text-xs text-emerald-400 mt-1 font-mono flex items-center space-x-1">
              <Lock className="w-3 h-3 shrink-0" />
              <span>{isChainValid ? 'SHA-256 Validated' : 'Tamper Detected'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Pipeline Invariant Banner */}
      <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-3.5 overflow-x-auto shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 uppercase tracking-wider font-semibold">Authoritative Analysis Pipeline (10 Stages)</span>
          <span className="text-slate-500 text-[11px]">Deterministic Engine · AI Advisory Only</span>
        </div>
        <div className="flex items-center min-w-max gap-3 py-1">
          {PIPELINE_PILLARS.map((p, idx) => (
            <React.Fragment key={p.step}>
              <button
                type="button"
                onClick={() => setLocation(p.route)}
                className="flex items-center space-x-2.5 px-3 py-2 rounded-lg bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-left transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                  {p.step}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-200">{p.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{p.sub}</div>
                </div>
              </button>
              {idx < PIPELINE_PILLARS.length - 1 && (
                <div className="text-slate-700 select-none text-xs">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 4. Recent Audits and Findings Side-by-Side */}
      {hasAudits && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Audits Table */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Recent Audits</span>
              </h2>
              <button
                onClick={() => setLocation('/audits')}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-2.5">Audit</th>
                    <th className="pb-2.5">Vendor</th>
                    <th className="pb-2.5">Score</th>
                    <th className="pb-2.5">Findings</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {recentAudits.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => handleAuditClick(a.id)}
                      className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 font-mono font-semibold text-cyan-400">
                        #{a.id}
                      </td>
                      <td className="py-3 text-slate-200 font-medium">
                        {a.vendor || 'Unknown'}
                      </td>
                      <td className="py-3 font-mono">
                        <span
                          className={`font-semibold ${
                            (a.compliance_score || 0) >= 80
                              ? 'text-emerald-400'
                              : (a.compliance_score || 0) >= 60
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {a.compliance_score !== null && a.compliance_score !== undefined
                            ? `${a.compliance_score}%`
                            : '—'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-400">
                        {a.findings_count ?? 0}
                      </td>
                      <td className="py-3 text-right">
                        <StatusBadge status={a.status || 'COMPLETED'} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Findings Table */}
          <div className="border border-slate-800/80 rounded-xl bg-slate-950/60 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Security Findings</span>
              </h2>
              <button
                onClick={() => setLocation('/findings')}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="pb-2.5">Severity</th>
                    <th className="pb-2.5">Rule / Title</th>
                    <th className="pb-2.5">Vendor</th>
                    <th className="pb-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {recentFindings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No open findings recorded.
                      </td>
                    </tr>
                  ) : (
                    recentFindings.map((f) => (
                      <tr
                        key={f.id}
                        onClick={() => handleFindingClick(f.id)}
                        className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                      >
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              f.severity === 'CRITICAL'
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : f.severity === 'HIGH'
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                : f.severity === 'MEDIUM'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {f.severity || 'INFO'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
                            {f.title || f.rule_id}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">{f.rule_id}</div>
                        </td>
                        <td className="py-3 text-slate-300 font-medium">
                          {f.vendor || 'Unknown'}
                        </td>
                        <td className="py-3 text-right">
                          <StatusBadge status={f.status || 'OPEN'} size="sm" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
