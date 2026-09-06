import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Play,
  Activity,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

const PPT_STAGES = [
  { num: 1,  title: 'Configuration Ingested',   desc: 'Raw vendor config received and SHA-256 hashed' },
  { num: 2,  title: 'Vendor Detection',          desc: 'Deterministic parser identified for config syntax' },
  { num: 3,  title: 'Fact Extraction',           desc: 'Security-relevant statements parsed from config' },
  { num: 4,  title: 'Normalization',             desc: 'Vendor syntax abstracted to universal state graph' },
  { num: 5,  title: 'Security State Mapping',    desc: 'Normalized facts mapped to security dimensions' },
  { num: 6,  title: 'Compliance Evaluation',     desc: 'Rules evaluated against NIST, CIS, ISO, PCI-DSS' },
  { num: 7,  title: 'Verdict & Risk Score',      desc: 'Deterministic PASS/FAIL verdict + risk formula applied' },
  { num: 8,  title: 'Remediation Synthesis',     desc: 'Vendor-specific patch commands generated per finding' },
  { num: 9,  title: 'Human Approval Gate',       desc: 'Human-in-the-loop authorization required' },
  { num: 10, title: 'Sandbox Verification',      desc: 'Patch applied in sandbox, re-audit validates fix' },
];

export default function AuditPipeline({ auditId, onSelectFinding, onNavigateTab }) {
  const [audit, setAudit] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const animIntervalRef = useRef(null);

  async function loadAuditData(skipAnim = false) {
    if (!auditId) return;
    setLoading(true);
    try {
      const a = await api.getAudit(auditId);
      const f = await api.getAuditFindings(auditId);
      setAudit(a);
      setFindings(f);

      // Determine final stage from audit state
      let finalStage = 5;
      if (a.stage === 'Compliance Achieved' || a.stage === 'Verification Performed') finalStage = 10;
      else if (a.stage === 'Remediation Recommended') finalStage = 8;
      else if (a.stage === 'Compliance Evaluated') finalStage = 6;

      if (skipAnim) {
        setActiveStageIndex(finalStage);
      } else {
        // Animate stages from 0 → finalStage
        setActiveStageIndex(0);
        setAnimating(true);
        let step = 0;
        clearInterval(animIntervalRef.current);
        animIntervalRef.current = setInterval(() => {
          step++;
          setActiveStageIndex(step);
          if (step >= finalStage) {
            clearInterval(animIntervalRef.current);
            setAnimating(false);
          }
        }, 380);
      }
    } catch (err) {
      console.error('Failed to load audit pipeline', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuditData();
    return () => clearInterval(animIntervalRef.current);
  }, [auditId]);

  async function handleApprove(findingId) {
    setActionLoading(true);
    try {
      await api.approveRemediation(findingId, 'Lead Security Auditor', 'Approved for sandboxed simulation');
      showToast('Remediation approved — ready for simulation.', 'success');
      await loadAuditData(true);
      setActiveStageIndex(9);
    } catch (err) {
      showToast('Approval failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(findingId) {
    setActionLoading(true);
    try {
      await api.rejectRemediation(findingId, 'Lead Security Auditor', 'Rejected due to operational exception');
      showToast('Remediation rejected. Finding marked REJECTED.', 'warning');
      await loadAuditData(true);
    } catch (err) {
      showToast('Rejection failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSimulate(findingId) {
    setActionLoading(true);
    try {
      const verif = await api.simulateRemediation(findingId, 'Lead Security Auditor');
      setVerificationResult(verif);
      showToast('Sandbox verification complete — patch validated!', 'success');
      await loadAuditData(true);
      setActiveStageIndex(10);
    } catch (err) {
      showToast('Simulation failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  if (!auditId) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50 border border-slate-200">
        <Activity className="w-12 h-12 text-slate-300" />
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold text-slate-900">No Audit Selected</h3>
          <p className="text-slate-500 leading-relaxed text-sm">
            Launch a configuration audit from the Dashboard to initialize the determinism pipeline.
          </p>
        </div>
        <button
          onClick={() => onNavigateTab('dashboard')}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-widest transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500 text-sm font-medium">
        <Loader2 className="w-5 h-5 animate-spin mr-3 text-slate-400" />
        Loading audit pipeline...
      </div>
    );
  }

  const allVerified = findings.length > 0 && findings.every(f => f.status === 'VERIFIED');

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-slate-200 pb-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Audit AUDIT-{String(audit?.id).padStart(4, '0')}
            </h2>
            <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 uppercase tracking-widest">
              {audit?.vendor}
            </span>
            {audit?.is_verification && (
              <span className="text-[10px] font-bold text-slate-900 bg-slate-200 px-3 py-1 uppercase tracking-widest">
                Verification Audit
              </span>
            )}
            {animating && (
              <span className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Live Execution</span>
              </span>
            )}
          </div>
          <p className="text-slate-500 text-lg flex items-center space-x-2">
            <span>Pipeline State:</span>
            <strong className="text-slate-900 font-bold">{audit?.stage}</strong>
          </p>
        </div>

        <div className="flex items-center space-x-12 shrink-0">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Deterministic Risk</div>
            <div className="text-3xl font-bold font-mono text-slate-900">{audit?.risk_score}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Compliance Rating</div>
            <div className="text-3xl font-bold font-mono text-slate-900">{audit?.compliance_score}%</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Violations</div>
            <div className="text-3xl font-bold font-mono text-slate-900">{findings.length}</div>
          </div>
        </div>
      </div>

      {/* 10-Stage Visual Pipeline */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">10-Stage Resolution Workflow</h3>
          {allVerified && (
            <span className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Compliance Achieved</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-200 border border-slate-200">
          {PPT_STAGES.map((s) => {
            const isDone = s.num <= activeStageIndex;
            const isCurrent = s.num === activeStageIndex && animating;
            return (
              <div
                key={s.num}
                className={`p-6 flex flex-col justify-between min-h-[140px] transition-all duration-300 ${
                  isCurrent
                    ? 'bg-slate-900 text-white'
                    : isDone
                    ? 'bg-white opacity-100'
                    : 'bg-white opacity-30 grayscale'
                }`}
              >
                <div className="flex items-start justify-between font-mono mb-4">
                  <span className={`font-bold text-xl ${isCurrent ? 'text-white' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                    {s.num.toString().padStart(2, '0')}
                  </span>
                  {isCurrent ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-slate-900" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <div>
                  <div className={`font-bold text-sm tracking-tight mb-1 leading-tight ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                    {s.title}
                  </div>
                  <div className={`text-xs leading-relaxed hidden lg:block ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Results Banner */}
      {verificationResult && (
        <div className="border border-slate-900 bg-slate-900 text-white p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div className="flex items-center space-x-4">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <h3 className="text-2xl font-bold tracking-tight uppercase">
                Verification: {verificationResult.verification_passed ? 'Passed' : 'Failed'}
              </h3>
            </div>
            <span className="text-xs font-bold uppercase tracking-widest px-4 py-2 border border-emerald-400 text-emerald-400 bg-emerald-900/30">
              Risk Reduced by {verificationResult.risk_reduction_pct}%
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800 border border-slate-800">
            <div className="p-6 bg-slate-900">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Fixed Findings</div>
              <div className="text-3xl font-bold font-mono text-emerald-400">
                {verificationResult.fixed_findings?.length ?? 0}
              </div>
            </div>
            <div className="p-6 bg-slate-900">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Remaining</div>
              <div className="text-3xl font-bold font-mono text-slate-100">
                {verificationResult.remaining_findings?.length ?? 0}
              </div>
            </div>
            <div className="p-6 bg-slate-900">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Risk Shift</div>
              <div className="text-3xl font-bold font-mono text-white flex items-center space-x-3">
                <span className="line-through text-slate-500">{verificationResult.risk_score_before}</span>
                <ArrowRight className="w-5 h-5 text-slate-600" />
                <span className="text-emerald-400">{verificationResult.risk_score_after}</span>
              </div>
            </div>
            <div className="p-6 bg-slate-900">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Compliance Shift</div>
              <div className="text-3xl font-bold font-mono text-white flex items-center space-x-3">
                <span className="text-slate-500">{verificationResult.compliance_score_before}%</span>
                <ArrowRight className="w-5 h-5 text-slate-600" />
                <span className="text-emerald-400">{verificationResult.compliance_score_after}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Findings List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Pipeline Violations</h3>
          <span className="text-sm font-bold font-mono text-slate-500 bg-slate-100 px-3 py-1">Count: {findings.length}</span>
        </div>

        {findings.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200">
            No findings for this audit.
          </div>
        ) : (
          <div className="space-y-px bg-slate-200 border border-slate-200">
            {findings.map((f) => {
              const isCrit = f.severity === 'CRITICAL';
              const isHigh = f.severity === 'HIGH';
              const isApproved = f.status === 'APPROVED';
              const isVerified = f.status === 'VERIFIED';
              const isRejected = f.status === 'REJECTED';

              return (
                <div key={f.id} className="bg-white p-6 space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        isCrit ? 'bg-slate-900 text-white' : isHigh ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {f.severity}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-500 border border-slate-200 px-2 py-1">{f.rule_id}</span>
                      <span className="text-lg font-bold text-slate-900 tracking-tight">{f.title}</span>
                    </div>

                    <div className="flex items-center space-x-6 shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk</span>
                        <span className="font-mono font-bold text-slate-900">{f.risk_score}</span>
                      </div>
                      <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                        isVerified  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        isApproved  ? 'bg-slate-900 text-white border-slate-900' :
                        isRejected  ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-white text-slate-600 border-slate-200'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-200 border border-slate-200">
                    <div className="bg-slate-900 p-5 space-y-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Configuration Evidence</div>
                      <code className="text-sm text-slate-300 block whitespace-pre-wrap font-mono leading-relaxed">{f.evidence}</code>
                    </div>
                    <div className="bg-slate-50 p-5 space-y-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target State Patch</div>
                      <code className="text-sm text-slate-900 font-bold block whitespace-pre-wrap font-mono leading-relaxed">{f.remediation_recommendation}</code>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      onClick={() => onSelectFinding(f.id)}
                      className="text-sm font-bold text-slate-900 hover:text-slate-600 uppercase tracking-widest flex items-center space-x-2 transition-colors w-full sm:w-auto"
                    >
                      <span>Inspect Finding Details</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      {!isVerified && !isApproved && !isRejected && (
                        <>
                          <button
                            onClick={() => handleApprove(f.id)}
                            disabled={actionLoading}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" /><span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(f.id)}
                            disabled={actionLoading}
                            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" /><span>Reject</span>
                          </button>
                        </>
                      )}

                      {isApproved && !isVerified && (
                        <button
                          onClick={() => handleSimulate(f.id)}
                          disabled={actionLoading}
                          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          <span>Simulate & Verify Patch</span>
                        </button>
                      )}

                      {isVerified && (
                        <span className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800 uppercase tracking-widest">
                          <CheckCircle2 className="w-4 h-4" /><span>Patch Applied</span>
                        </span>
                      )}

                      {isRejected && (
                        <span className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-rose-50 border border-rose-200 text-sm font-bold text-rose-800 uppercase tracking-widest">
                          <X className="w-4 h-4" /><span>Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
