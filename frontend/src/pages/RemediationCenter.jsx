import React, { useEffect, useState } from 'react';
import {
  GitCompare, Play, CheckCircle2, ShieldAlert, ArrowRight,
  X, Filter, Loader2, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

const STATUS_FILTERS = [
  { label: 'All',        value: 'ALL'      },
  { label: 'Open',       value: 'OPEN'     },
  { label: 'Approved',   value: 'APPROVED' },
  { label: 'Verified',   value: 'VERIFIED' },
  { label: 'Rejected',   value: 'REJECTED' },
];

export default function RemediationCenter() {
  const [audits, setAudits]             = useState([]);
  const [findings, setFindings]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('OPEN');
  const [actionLoading, setActionLoading] = useState(null); // findingId being acted on
  const [simResults, setSimResults]     = useState({});     // findingId → result
  const [expandedId, setExpandedId]     = useState(null);

  async function loadData() {
    try {
      const auditList = await api.getAudits();
      setAudits(auditList);

      // Gather all findings from all audits
      const allFindings = [];
      for (const a of auditList.slice(0, 5)) {
        try {
          const f = await api.getAuditFindings(a.id);
          f.forEach(finding => {
            finding._vendor = a.vendor;
            finding._audit_id = a.id;
          });
          allFindings.push(...f);
        } catch (_) {}
      }
      setFindings(allFindings);
    } catch (err) {
      console.error('RemediationCenter load failed', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleApprove(findingId) {
    setActionLoading(findingId);
    try {
      await api.approveRemediation(findingId, 'Security Administrator', 'Approved for sandboxed simulation');
      showToast('Remediation approved. Ready for simulation.', 'success');
      await loadData();
    } catch (err) {
      showToast('Approval failed: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(findingId) {
    setActionLoading(findingId);
    try {
      await api.rejectRemediation(findingId, 'Security Administrator', 'Rejected by security administrator');
      showToast('Remediation rejected.', 'warning');
      await loadData();
    } catch (err) {
      showToast('Rejection failed: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSimulate(findingId) {
    setActionLoading(findingId);
    try {
      const result = await api.simulateRemediation(findingId, 'Security Administrator');
      setSimResults(prev => ({ ...prev, [findingId]: result }));
      showToast('Sandbox verification complete. Patch validated!', 'success');
      await loadData();
    } catch (err) {
      showToast('Simulation failed: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = filter === 'ALL'
    ? findings
    : findings.filter(f => f.status === filter);

  const countByStatus = (s) => findings.filter(f => f.status === s).length;
  const verifiedCount = countByStatus('VERIFIED');
  const openCount     = countByStatus('OPEN');
  const approvedCount = countByStatus('APPROVED');

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-slate-200 pb-6">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Remediation Sandbox</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Human-in-the-loop approval gateway. Review, authorize, and sandbox-verify patches before production deployment.
          </p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-slate-400 shrink-0" />}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-px bg-slate-200 border border-slate-200">
        <div className="p-6 bg-white text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Awaiting Review</div>
          <div className="text-4xl font-bold font-mono text-amber-600">{openCount}</div>
        </div>
        <div className="p-6 bg-white text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Approved / Pending Sim</div>
          <div className="text-4xl font-bold font-mono text-slate-900">{approvedCount}</div>
        </div>
        <div className="p-6 bg-white text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Verified & Closed</div>
          <div className="text-4xl font-bold font-mono text-emerald-600">{verifiedCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
              filter === f.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.label}
            {f.value !== 'ALL' && (
              <span className="ml-2 font-mono opacity-70">
                ({f.value === 'OPEN' ? openCount : f.value === 'APPROVED' ? approvedCount : f.value === 'VERIFIED' ? verifiedCount : countByStatus(f.value)})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Findings List */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          <span className="font-medium text-sm">Loading remediation queue...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-slate-300 bg-white">
          <ShieldCheck className="w-12 h-12 text-emerald-300" />
          <div>
            <p className="font-bold text-slate-900 text-lg">
              {filter === 'VERIFIED' ? 'No verified patches yet.' : filter === 'OPEN' ? 'No open violations.' : `No ${filter.toLowerCase()} findings.`}
            </p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">
              {findings.length === 0 ? 'Run a vendor audit from the Dashboard to populate the remediation queue.' : 'Change the filter above to view other finding states.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-px bg-slate-200 border border-slate-200">
          {filtered.map(f => {
            const isCrit     = f.severity === 'CRITICAL';
            const isHigh     = f.severity === 'HIGH';
            const isApproved = f.status === 'APPROVED';
            const isVerified = f.status === 'VERIFIED';
            const isRejected = f.status === 'REJECTED';
            const isActing   = actionLoading === f.id;
            const simResult  = simResults[f.id];
            const isExpanded = expandedId === f.id;

            return (
              <div key={f.id} className="bg-white">

                {/* Finding Row */}
                <button
                  className="w-full text-left p-6 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                >
                  <div className="flex flex-wrap items-center gap-4 justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${
                        isCrit ? 'bg-slate-900' : isHigh ? 'bg-amber-600' : 'bg-slate-400'
                      }`}>
                        {f.severity}
                      </span>
                      <span className="font-mono text-xs text-slate-500 border border-slate-200 px-2 py-1">{f.rule_id}</span>
                      <span className="font-bold text-slate-900">{f.title}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-slate-400 font-medium">{f._vendor}</span>
                      <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                        isVerified  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        isApproved  ? 'bg-slate-900 text-white border-slate-900' :
                        isRejected  ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {f.status}
                      </span>
                      <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">

                    {/* Diff View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200">
                      <div className="bg-slate-900 p-6 space-y-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Current State (Vulnerable)</span>
                        </div>
                        <code className="text-sm text-rose-300 block whitespace-pre-wrap font-mono leading-relaxed">
                          {f.remediation_diff?.current_statement || f.evidence || 'N/A'}
                        </code>
                      </div>
                      <div className="bg-slate-50 p-6 space-y-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Target State (Hardened)</span>
                        </div>
                        <code className="text-sm text-emerald-700 font-bold block whitespace-pre-wrap font-mono leading-relaxed">
                          {f.remediation_diff?.recommended_statement || f.remediation_recommendation || 'N/A'}
                        </code>
                      </div>
                    </div>

                    {/* Action Strip */}
                    <div className="p-6 bg-white flex flex-wrap items-center gap-4">
                      {!isApproved && !isVerified && !isRejected && (
                        <>
                          <button
                            onClick={() => handleApprove(f.id)}
                            disabled={isActing}
                            className="flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Authorize Patch</span>
                          </button>
                          <button
                            onClick={() => handleReject(f.id)}
                            disabled={isActing}
                            className="flex items-center space-x-2 px-6 py-3 bg-white border border-slate-200 text-slate-900 text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50 hover:bg-slate-50"
                          >
                            <X className="w-4 h-4" /><span>Reject</span>
                          </button>
                        </>
                      )}

                      {isApproved && !isVerified && (
                        <button
                          onClick={() => handleSimulate(f.id)}
                          disabled={isActing}
                          className="flex items-center space-x-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                          {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          <span>Run Sandbox Simulation</span>
                        </button>
                      )}

                      {isVerified && (
                        <span className="flex items-center space-x-2 px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold uppercase tracking-widest">
                          <ShieldCheck className="w-4 h-4" /><span>Patch Deployed & Verified</span>
                        </span>
                      )}

                      {isRejected && (
                        <span className="flex items-center space-x-2 px-6 py-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold uppercase tracking-widest">
                          <X className="w-4 h-4" /><span>Rejected — No Action Taken</span>
                        </span>
                      )}
                    </div>

                    {/* Simulation Result Inline */}
                    {simResult && (
                      <div className="bg-slate-900 text-white px-8 py-6 flex flex-wrap items-center gap-8 text-sm font-mono">
                        <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                          <ShieldCheck className="w-5 h-5" />
                          <span>Verification {simResult.verification_passed ? 'PASSED' : 'FAILED'}</span>
                        </div>
                        <span className="text-slate-400">Risk: <strong className="text-white">{simResult.risk_score_before} → {simResult.risk_score_after}</strong></span>
                        <span className="text-slate-400">Compliance: <strong className="text-white">{simResult.compliance_score_before}% → {simResult.compliance_score_after}%</strong></span>
                        <span className="text-emerald-400 font-bold">−{simResult.risk_reduction_pct}% Risk Reduction</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
