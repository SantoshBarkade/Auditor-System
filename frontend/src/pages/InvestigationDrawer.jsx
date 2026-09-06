import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  Code,
  AlertTriangle,
  Cpu,
  Layers,
  RefreshCw,
  FileText,
  ArrowRight,
  CheckCircle2,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

export default function InvestigationDrawer({ findingId, isOpen, onClose, onRefresh }) {
  const [finding, setFinding] = useState(null);
  const [evidenceData, setEvidenceData] = useState(null);
  const [activeTab, setActiveTab] = useState('evidence'); // evidence, risk, compliance, ai, remediation
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewer, setReviewer] = useState('Security Administrator');
  const [approvalNote, setApprovalNote] = useState('Approved for sandboxed simulation');
  const [actionLoading, setActionLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  useEffect(() => {
    async function loadDetail() {
      if (!findingId || !isOpen) return;
      setLoading(true);
      try {
        const f = await api.getFinding(findingId);
        const ev = await api.getFindingEvidence(findingId);
        setFinding(f);
        setEvidenceData(ev);
      } catch (err) {
        console.error("Failed to load finding detail", err);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [findingId, isOpen]);

  async function handleTriggerAI() {
    setAiLoading(true);
    try {
      const exp = await api.triggerAIExplain(findingId);
      setFinding((prev) => ({ ...prev, ai_explanation: exp }));
    } catch (err) {
      showToast('AI explanation failed: ' + err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleApprove() {
    setActionLoading(true);
    try {
      await api.approveRemediation(findingId, reviewer, approvalNote);
      setFinding((prev) => ({ ...prev, status: 'APPROVED' }));
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('Approval failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    setActionLoading(true);
    try {
      await api.rejectRemediation(findingId, reviewer, approvalNote);
      setFinding((prev) => ({ ...prev, status: 'REJECTED' }));
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('Rejection failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSimulate() {
    setActionLoading(true);
    try {
      const sim = await api.simulateRemediation(findingId, reviewer);
      setSimulationResult(sim);
      setFinding((prev) => ({ ...prev, status: 'VERIFIED' }));
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast('Simulation failed: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300 ease-in-out translate-x-0">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-start justify-between shrink-0">
          <div className="space-y-4 max-w-lg">
            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span className={`px-2 py-1 text-white ${finding?.severity === 'CRITICAL' ? 'bg-slate-900' : finding?.severity === 'HIGH' ? 'bg-amber-600' : 'bg-slate-500'}`}>
                {finding?.severity || 'HIGH'}
              </span>
              <span className="border border-slate-200 px-2 py-1 text-slate-700">
                RULE: {finding?.rule_id}
              </span>
              <span className="border border-slate-200 px-2 py-1 text-slate-700">
                {finding?.vendor}
              </span>
              <span className={`border px-2 py-1 ${finding?.status === 'VERIFIED' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-slate-200 text-slate-600'}`}>
                {finding?.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">
              {finding?.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Tabs (Editorial style) */}
        <div className="flex border-b border-slate-200 px-8 shrink-0 bg-white">
          {[
            { id: 'evidence', label: 'Evidence', icon: Code },
            { id: 'risk', label: 'Risk Model', icon: AlertTriangle },
            { id: 'compliance', label: 'Compliance', icon: ShieldAlert },
            { id: 'ai', label: 'AI Context', icon: Cpu },
            { id: 'remediation', label: 'Remediation', icon: Layers },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-4 mr-8 border-b-2 text-sm font-semibold tracking-wide uppercase transition-all flex items-center space-x-2 ${
                  isActive
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <div className="text-sm font-medium uppercase tracking-widest">Loading Forensic Data...</div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* TAB 1: EVIDENCE */}
              {activeTab === 'evidence' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Configuration Artifact</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        File: <span className="font-mono text-slate-900">{evidenceData?.filename || 'Unknown'}</span>
                      </p>
                    </div>
                    <div className="text-sm font-medium text-slate-500 mt-2 sm:mt-0 border border-slate-200 px-3 py-1 bg-white">
                      Lines: <span className="font-mono font-bold text-slate-900">{evidenceData?.line_numbers?.join(', ') || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-none overflow-hidden shadow-lg border border-slate-800">
                    <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-500">RAW CONFIGURATION EXCERPT</span>
                    </div>
                    <div className="p-4 font-mono text-sm space-y-1 overflow-x-auto">
                      {evidenceData?.code_snippet?.map((line) => (
                        <div
                          key={line.line_number}
                          className={`flex items-start space-x-4 px-2 py-0.5 ${
                            line.is_highlighted
                              ? 'bg-rose-900/30 text-rose-300 border-l-2 border-rose-500'
                              : 'text-slate-400'
                          }`}
                        >
                          <span className="w-8 text-slate-600 select-none text-right shrink-0">{line.line_number}</span>
                          <span className="whitespace-pre">{line.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RISK */}
              {activeTab === 'risk' && (
                <div className="space-y-8">
                  <div className="flex items-end justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Deterministic Risk Score</h3>
                      <p className="text-sm text-slate-500 mt-1">Calculated via quantitative vectors.</p>
                    </div>
                    <div className={`text-5xl font-bold font-mono ${finding?.risk_score >= 70 ? 'text-slate-900' : 'text-slate-500'}`}>
                      {finding?.risk_score}<span className="text-2xl text-slate-300">/100</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200">
                    {[
                      { label: 'Severity (35%)', val: finding?.severity_score },
                      { label: 'Exposure (25%)', val: finding?.exposure_score },
                      { label: 'Impact (20%)', val: finding?.impact_score },
                      { label: 'Exploitability (20%)', val: finding?.exploitability_score },
                    ].map((metric, i) => (
                      <div key={i} className="p-6 bg-white text-center flex flex-col justify-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{metric.label}</div>
                        <div className="text-3xl font-bold font-mono text-slate-900">{metric.val} <span className="text-xl text-slate-300">/4</span></div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-slate-200 p-6">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Technical Impact Statement
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {finding?.impact}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: COMPLIANCE */}
              {activeTab === 'compliance' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">Regulatory Mappings</h3>
                    <p className="text-sm text-slate-500 mt-1">Frameworks affected by this violation.</p>
                  </div>
                  
                  <div className="space-y-4">
                    {finding?.compliance_mappings?.map((m, i) => (
                      <div
                        key={i}
                        className="bg-white border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">
                              {m.framework}
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">{m.control_id}</span>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">{m.name}</p>
                        </div>
                        <div className="shrink-0 text-xs font-bold uppercase tracking-widest border border-slate-200 px-3 py-1 bg-slate-50 text-slate-600">
                          {finding.status === 'VERIFIED' ? 'SATISFIED' : 'GAP DETECTED'}
                        </div>
                      </div>
                    ))}
                    {(!finding?.compliance_mappings || finding.compliance_mappings.length === 0) && (
                      <div className="p-8 text-center text-slate-500 text-sm border border-slate-200 border-dashed bg-white">
                        No direct regulatory mappings identified.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: AI CONTEXT */}
              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <div className="flex items-end justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Generative Context</h3>
                      <p className="text-sm text-slate-500 mt-1">Non-authoritative analysis layer.</p>
                    </div>
                    <button
                      onClick={handleTriggerAI}
                      disabled={aiLoading}
                      className="flex items-center space-x-2 border border-slate-900 px-4 py-2 text-sm font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                      <span>{aiLoading ? 'Synthesizing...' : 'Generate Context'}</span>
                    </button>
                  </div>

                  {finding?.ai_explanation?.summary ? (
                    <div className="space-y-px bg-slate-200 border border-slate-200">
                      <div className="bg-white p-6">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Executive Summary</h5>
                        <p className="text-slate-800 text-sm leading-relaxed">{finding.ai_explanation.summary}</p>
                      </div>
                      <div className="bg-white p-6">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Core Principle</h5>
                        <p className="text-slate-800 text-sm leading-relaxed font-semibold">{finding.ai_explanation.security_principle}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-px">
                        <div className="bg-white p-6 flex-1">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Business Impact</h5>
                          <p className="text-slate-800 text-sm leading-relaxed">{finding.ai_explanation.potential_impact}</p>
                        </div>
                        <div className="bg-white p-6 flex-1">
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Why It Matters</h5>
                          <p className="text-slate-800 text-sm leading-relaxed">{finding.ai_explanation.why_it_matters}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-white border border-slate-200 border-dashed">
                      <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 font-medium text-sm">Context generation pending.</p>
                      <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">Click "Generate Context" to run the LLM analysis chain against this deterministic finding.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: REMEDIATION */}
              {activeTab === 'remediation' && (
                <div className="space-y-8">
                  <div className="border-b border-slate-200 pb-4">
                    <h3 className="text-lg font-bold text-slate-900">Remediation Patch</h3>
                    <p className="text-sm text-slate-500 mt-1">Proposed configuration changes to clear violation.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Diff View */}
                    <div className="bg-white border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                        <div className="flex flex-col">
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
                            <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Current State</span>
                          </div>
                          <div className="p-4 bg-rose-50/50 flex-1 overflow-x-auto">
                            <code className="text-rose-700 text-sm font-mono whitespace-pre-wrap block">
                              {finding?.remediation_diff?.current_statement || finding?.evidence}
                            </code>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
                            <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Target State</span>
                          </div>
                          <div className="p-4 bg-emerald-50/50 flex-1 overflow-x-auto">
                            <code className="text-emerald-700 text-sm font-mono whitespace-pre-wrap block">
                              {finding?.remediation_diff?.recommended_statement || finding?.remediation_recommendation}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Block */}
                    <div className="bg-white border border-slate-200 p-6 space-y-6">
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Execution Approval Workflow
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Reviewer ID</label>
                          <input
                            type="text"
                            value={reviewer}
                            onChange={(e) => setReviewer(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors font-mono"
                            disabled={finding?.status === 'VERIFIED'}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Authorization Note</label>
                          <input
                            type="text"
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors"
                            disabled={finding?.status === 'VERIFIED'}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4">
                        {finding?.status !== 'APPROVED' && finding?.status !== 'VERIFIED' && (
                          <>
                            <button
                              onClick={handleApprove}
                              disabled={actionLoading}
                              className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Authorize Patch</span>
                            </button>
                            <button
                              onClick={handleReject}
                              disabled={actionLoading}
                              className="flex items-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {finding?.status === 'APPROVED' && (
                          <button
                            onClick={handleSimulate}
                            disabled={actionLoading}
                            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 text-sm font-bold uppercase tracking-widest transition-colors disabled:opacity-50 w-full md:w-auto justify-center"
                          >
                            <Play className="w-4 h-4" />
                            <span>Run Verification Simulation</span>
                          </button>
                        )}

                        {finding?.status === 'VERIFIED' && (
                          <div className="flex items-center w-full md:w-auto space-x-3 px-6 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold uppercase tracking-widest">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Patch Deployed & Verified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
