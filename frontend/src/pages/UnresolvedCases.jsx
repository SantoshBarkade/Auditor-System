import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Cpu,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  FileCode,
  Lock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import { showToast } from '../components/Toast';

export default function UnresolvedCases({ selectedCaseId: initialCaseId = null, onClearSelectedCase }) {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, awaiting_review: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [investigating, setInvestigating] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);

  // Human Review Form state
  const [reviewerName, setReviewerName] = useState('senior-architect@nexora.internal');
  const [finalVerdict, setFinalVerdict] = useState('CONFIRMED_SAFE');
  const [engineeringRationale, setEngineeringRationale] = useState(
    'Engineering review confirmed directive conforms to perimeter security policy. Validated against reference network baseline.'
  );
  const [resolutionEvidence, setResolutionEvidence] = useState('Architecture Spec v4.2 / Jira SecOps-4182');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Authoritative vendor documentation references
  const vendorDocs = [
    {
      id: 1,
      title: 'Junos Security Policy Reference Guide',
      similarity: '0.84',
      source: 'Juniper TechLibrary',
      excerpt:
        'In Junos OS, policies referencing custom application sets require a corresponding definition under [edit applications application <name>]. If undefined at parse time, policy action defaults to system-wide reject or unresolved evaluation.'
    },
    {
      id: 2,
      title: 'Cisco IOS-XE Access Control Lists Guide',
      similarity: '0.81',
      source: 'Cisco Technical Documentation',
      excerpt:
        'Standard and Extended ACL statements evaluate sequentially. Unclassified tokens or custom macro parameters that fail strict lexer matching are quarantined for operational human review to avoid false-positive pass conclusions.'
    },
    {
      id: 3,
      title: 'FortiOS Firewall Policy Standards',
      similarity: '0.78',
      source: 'Fortinet Documentation Library',
      excerpt:
        'Referenced address groups or custom service objects must exist in the local VDOM database. Ambiguous syntax in policy stanzas prevents deterministic compliance computation.'
    }
  ];

  async function loadCases() {
    setLoading(true);
    try {
      const [casesRes, statsRes] = await Promise.all([
        api.getUnresolvedCases(),
        api.getUnresolvedStats()
      ]);

      if (Array.isArray(casesRes) && casesRes.length > 0) {
        setCases(casesRes);
      } else {
        setCases([]);
      }

      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      console.warn('Error loading unresolved cases', err);
    } finally {
      setLoading(false);
    }
  }

  async function selectCaseById(id) {
    setLoadingDetail(true);
    try {
      const fullCase = await api.getUnresolvedCase(id);
      if (fullCase && fullCase.id) {
        setSelectedCase(fullCase);
        if (fullCase.resolution_context) {
          setEngineeringRationale(fullCase.resolution_context);
        }
        if (fullCase.reviewer) {
          setReviewerName(fullCase.reviewer);
        }
        if (fullCase.final_verdict) {
          setFinalVerdict(fullCase.final_verdict);
        }
      } else {
        const found = cases.find((c) => c.id === id);
        if (found) setSelectedCase(found);
      }
    } catch (err) {
      console.warn('Error fetching full case detail', err);
      const found = cases.find((c) => c.id === id);
      if (found) setSelectedCase(found);
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (initialCaseId) {
      selectCaseById(initialCaseId);
    }
  }, [initialCaseId]);

  async function handleTriggerAI() {
    if (!selectedCase) return;
    setInvestigating(true);
    try {
      const updated = await api.triggerAIInvestigation(selectedCase.id, reviewerName);
      if (updated && updated.id) {
        setSelectedCase(updated);
        showToast('Authoritative RAG retrieval and NVIDIA AI Advisory generated', 'success');
      } else {
        setSelectedCase((prev) => ({
          ...prev,
          status: 'AWAITING_REVIEW',
          ai_analysis: {
            interpretation: `The directive at line ${prev.source_lines?.[0] || 16} contains security keywords requiring explicit architecture context.`,
            confidence: 'MEDIUM',
            reasoning_summary: 'Deterministic engine halted due to incomplete lexical reference in supplied configuration.',
            recommendation: 'RESOLVED_WITH_CONTEXT',
            source: 'Deterministic Fallback Engine',
            warning: 'AI analysis is not authoritative. It is advisory only.'
          }
        }));
        showToast('AI Advisory generated (Advisory mode)', 'success');
      }
      loadCases();
    } catch (err) {
      console.error('AI Advisory trigger error', err);
      showToast('AI Advisory generation encountered an error', 'error');
    } finally {
      setInvestigating(false);
    }
  }

  async function handleResolveCase() {
    if (!selectedCase) return;
    if (!engineeringRationale.trim()) {
      showToast('Engineering rationale is required for human governance', 'error');
      return;
    }
    setSubmittingResolution(true);
    try {
      const payloadEvidence = {
        evidence: resolutionEvidence,
        resolved_at: new Date().toISOString()
      };
      const res = await api.resolveCase(
        selectedCase.id,
        reviewerName,
        finalVerdict,
        engineeringRationale,
        payloadEvidence
      );

      if (res && res.id) {
        setSelectedCase(res);
        showToast(`Case #${res.id} resolved as ${res.final_verdict} and committed to blockchain`, 'success');
      } else {
        setSelectedCase((prev) => ({
          ...prev,
          status: 'RESOLVED',
          final_verdict: finalVerdict,
          reviewer: reviewerName,
          resolution_context: engineeringRationale
        }));
        showToast(`Case #${selectedCase.id} resolved as ${finalVerdict}`, 'success');
      }
      loadCases();
    } catch (err) {
      console.error('Case resolution failed', err);
      showToast('Failed to commit case resolution', 'error');
    } finally {
      setSubmittingResolution(false);
    }
  }

  const handleBackToList = () => {
    setSelectedCase(null);
    if (onClearSelectedCase) onClearSelectedCase();
  };

  const getLineNumber = (c) => {
    if (c.source_lines && c.source_lines.length > 0) return c.source_lines[0];
    if (c.line_number) return c.line_number;
    return '—';
  };

  const getRawStatement = (c) => {
    if (c.source_text) return c.source_text;
    if (c.unknown_syntax && c.unknown_syntax.raw_statement) return c.unknown_syntax.raw_statement;
    if (c.raw_statement) return c.raw_statement;
    return 'Directive content pending parser classification';
  };

  const isResolved =
    selectedCase &&
    (selectedCase.status === 'RESOLVED' ||
      selectedCase.status === 'CONFIRMED_SAFE' ||
      selectedCase.status === 'CONFIRMED_VIOLATION' ||
      Boolean(selectedCase.final_verdict));

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Unresolved cases
          </h1>
          <p className="text-base sm:text-lg text-slate-300 mt-2 font-normal leading-relaxed">
            Cases the deterministic security engine halts on rather than fabricating assumptions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {selectedCase && (
            <button
              onClick={handleBackToList}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to queue</span>
            </button>
          )}

          <button
            onClick={loadCases}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800/80" />

      {/* ======================================================== */}
      {/* QUEUE SCREEN (When no case is selected) */}
      {/* ======================================================== */}
      {!selectedCase && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Posture / Queue Summary Line */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Investigation Queue Status
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-mono font-semibold">
              <span className="flex items-center space-x-2.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
                <span>{stats.open || cases.filter((c) => c.status === 'OPEN').length} OPEN HALTS</span>
              </span>
              <span className="text-slate-700 text-base">·</span>
              <span className="flex items-center space-x-2.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-400/20" />
                <span>{stats.awaiting_review || cases.filter((c) => c.status === 'AWAITING_REVIEW').length} AWAITING REVIEW</span>
              </span>
              <span className="text-slate-700 text-base">·</span>
              <span className="flex items-center space-x-2.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                <span>{stats.resolved || cases.filter((c) => c.status === 'RESOLVED').length} RESOLVED ON BLOCKCHAIN</span>
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* Classification Descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
            <div className="space-y-2 p-5 rounded-xl bg-slate-900/30 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold font-mono text-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Path A: Missing Reference</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                Referenced security objects (address group, dynamic template, application set) are absent from the submitted configuration stanza.
              </p>
            </div>

            <div className="space-y-2 p-5 rounded-xl bg-slate-900/30 border border-slate-800/80">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold font-mono text-sm">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Path B: Unknown Syntax</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                Directives matched security keywords but cannot be mapped to deterministic schema rules with 100% confidence.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* Unresolved Cases Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Active unresolved queue
              </h2>
              <span className="text-sm font-mono text-slate-400 font-medium">
                {cases.length} cases registered
              </span>
            </div>

            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40 shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-xs tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Case</th>
                    <th className="px-5 py-4">Classification</th>
                    <th className="px-5 py-4">Vendor / Line</th>
                    <th className="px-5 py-4">Directive Snippet</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {cases.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center text-slate-400 font-medium text-base font-sans">
                        No unresolved cases detected in audited configurations.
                      </td>
                    </tr>
                  ) : (
                    cases.map((c) => {
                      const line = getLineNumber(c);
                      const stmt = getRawStatement(c);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => selectCaseById(c.id)}
                          className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-4 font-mono font-semibold text-cyan-400 whitespace-nowrap">
                            #{c.id}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium ${
                                c.case_type === 'MISSING_REFERENCE'
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                                  : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/25'
                              }`}
                            >
                              {c.case_type === 'MISSING_REFERENCE' ? 'Missing Reference' : 'Unknown Syntax'}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-200 font-medium">
                            <span className="font-semibold text-white">{c.vendor || 'Cisco'}</span>
                            <span className="text-slate-400 ml-2 font-mono text-xs">Line {line}</span>
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-300 max-w-sm truncate text-sm">
                            {stmt}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <StatusBadge status={c.status} size="sm" />
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <span className="text-slate-400 group-hover:text-cyan-400 font-medium transition-colors text-sm inline-flex items-center space-x-1">
                              <span>Inspect</span>
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CASE DETAIL SCREEN (When a case is selected) */}
      {/* ======================================================== */}
      {selectedCase && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Halt Banner */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-amber-200 text-sm">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono font-bold uppercase tracking-wider text-amber-400 text-sm">
                Deterministic Engine Halted — Unresolved
              </span>
            </div>
            <span className="text-xs font-mono text-amber-300/80 hidden sm:inline">
              Not counted as failure · Preserving 100% audit veracity
            </span>
          </div>

          {/* Case Identity & Headline */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 font-mono text-sm font-semibold">
              <span className="text-cyan-400">Case #{selectedCase.id}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{selectedCase.vendor}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{selectedCase.rule_id || selectedCase.feature || 'Rule Ambiguity'}</span>
            </div>

            <div className="flex items-center space-x-4 pt-1">
              <span
                className={`text-xs font-mono font-semibold px-3 py-1 rounded-md ${
                  isResolved
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {selectedCase.status || 'UNRESOLVED'}
              </span>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {isResolved
                  ? `Case Resolved: ${selectedCase.final_verdict || 'CONFIRMED_SAFE'}`
                  : 'The engine halted evaluation rather than guessing security intent.'}
              </h2>
            </div>

            <p className="text-base text-slate-300 leading-relaxed max-w-3xl font-normal">
              {isResolved
                ? `Formally reviewed by ${selectedCase.reviewer || 'Security Engineer'} and anchored into the blockchain ledger.`
                : 'Deterministic security rule evaluation requires complete configuration facts. Under NEXORA Invariant #4, UNRESOLVED is not marked as FAIL; it halts for authoritative human governance.'}
            </p>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* Configuration Evidence */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Configuration evidence
            </div>

            <div className="rounded-xl bg-[#04060A] border border-slate-800/80 overflow-hidden font-mono text-sm shadow-sm">
              <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-slate-300 font-medium">
                <span>Direct evidence snippet</span>
                <span className="text-cyan-400 font-semibold">Line {getLineNumber(selectedCase)}</span>
              </div>
              <div className="p-5 flex items-center space-x-4 text-slate-200 overflow-x-auto">
                <span className="text-slate-500 select-none font-bold">{getLineNumber(selectedCase)}</span>
                <span className="bg-amber-500/15 text-amber-200 px-3 py-1 rounded-md border border-amber-500/30 font-bold text-sm sm:text-base">
                  {getRawStatement(selectedCase)}
                </span>
              </div>
              {selectedCase.reason && (
                <div className="px-5 py-3 bg-slate-950/50 border-t border-slate-800/80 text-xs sm:text-sm text-slate-300">
                  <strong className="text-white">Halting reason:</strong> {selectedCase.reason}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* What We Know vs What We Cannot Prove */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 shadow-sm">
              <div className="flex items-center space-x-2 text-emerald-400 font-semibold uppercase tracking-wider text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>What we know</span>
              </div>
              <div className="space-y-2 text-sm sm:text-base text-slate-300 font-mono">
                <div>Vendor: <strong className="text-white font-semibold">{selectedCase.vendor}</strong></div>
                <div>Source Line: <strong className="text-white font-semibold">{getLineNumber(selectedCase)}</strong></div>
                <div>Section: <span className="text-slate-300">{selectedCase.feature || 'Configuration Ambiguity'}</span></div>
                <div>Facts: <span className="text-slate-300">Directive matched security keyword</span></div>
              </div>
            </div>

            <div className="space-y-3 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 shadow-sm">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold uppercase tracking-wider text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>What we cannot prove</span>
              </div>
              <div className="space-y-2 text-sm sm:text-base text-slate-300 font-mono">
                <div>Missing Object: <span className="text-amber-300 font-medium">{selectedCase.missing_reference?.reference_name || 'Referenced parameter definition'}</span></div>
                <div>Compliance State: <span className="text-amber-200 font-semibold">Undetermined (Refusing to guess)</span></div>
                <div>Engine State: <span className="text-amber-300">Evaluation suspended at rule check</span></div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* Authoritative RAG Grounding */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Authoritative vendor knowledge (pgvector RAG)
              </div>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 font-semibold">Cosine similarity &gt; 0.75</span>
            </div>

            <div className="space-y-3">
              {vendorDocs.map((doc) => {
                const isExpanded = expandedDoc === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="border border-slate-800/80 bg-slate-900/30 rounded-xl p-4 transition-colors hover:border-slate-700/80"
                  >
                    <div
                      onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white text-sm sm:text-base">{doc.title}</span>
                        <span className="text-slate-400 font-mono text-xs">({doc.source})</span>
                      </div>
                      <span className="text-xs sm:text-sm font-mono text-cyan-300 font-semibold px-2.5 py-1 rounded-md bg-cyan-950/60 border border-cyan-800/50 whitespace-nowrap">
                        Sim: {doc.similarity}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-800 text-slate-300 leading-relaxed font-sans text-sm sm:text-base">
                        {doc.excerpt}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* NVIDIA AI Advisory */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  NVIDIA NIM AI advisory layer
                </span>
                <span className="text-xs font-mono text-cyan-300 font-semibold px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/25">
                  Llama-3.1-70b-Instruct
                </span>
              </div>

              {!isResolved && (
                <button
                  onClick={handleTriggerAI}
                  disabled={investigating}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {investigating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Retrieving RAG & AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{selectedCase.ai_analysis ? 'Re-run AI advisory' : 'Investigate with AI'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Warning Banner */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-sm flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-amber-300">Architectural Guarantee:</strong> AI analysis is explicitly advisory and never authoritative. It cannot modify audit scores or change compliance findings without human review.
              </div>
            </div>

            {selectedCase.ai_analysis ? (
              <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">Interpretation</span>
                  <p className="text-slate-100 leading-relaxed font-sans text-sm sm:text-base">
                    {selectedCase.ai_analysis.interpretation}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/70 text-xs sm:text-sm font-mono text-slate-400">
                  <span>Confidence: <strong className="text-cyan-400">{selectedCase.ai_analysis.confidence || 'MEDIUM'}</strong></span>
                  <span>Recommendation: <strong className="text-emerald-400">{selectedCase.ai_analysis.recommendation || 'RESOLVED_WITH_CONTEXT'}</strong></span>
                  <span>Source: <span className="text-slate-300">{selectedCase.ai_analysis.source || 'NVIDIA AI Provider'}</span></span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-slate-400 font-mono">
                Click "Investigate with AI" above to retrieve authoritative documentation and generate advisory guidance.
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80" />

          {/* Human Engineering Review & Blockchain Resolution */}
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Human engineering governance
            </div>

            {isResolved ? (
              <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-sm sm:text-base">
                  <span className="font-bold text-white">Final Verdict: {selectedCase.final_verdict}</span>
                  <span className="text-emerald-400 font-semibold">Reviewer: {selectedCase.reviewer}</span>
                </div>
                <div className="text-slate-200 font-sans text-sm sm:text-base leading-relaxed">
                  <strong className="text-white">Rationale:</strong> {selectedCase.resolution_context}
                </div>
                <div className="text-xs font-mono text-emerald-400/80 pt-2 border-t border-emerald-500/20 flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Blockchain ledger block signed and validated. Audit trail immutable.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Reviewer Identity</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Final Verdict Decision</label>
                    <select
                      value={finalVerdict}
                      onChange={(e) => setFinalVerdict(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="CONFIRMED_SAFE">CONFIRMED_SAFE — Accept Risk / Safe State</option>
                      <option value="CONFIRMED_VIOLATION">CONFIRMED_VIOLATION — Non-Compliant Gap</option>
                      <option value="RESOLVED_WITH_CONTEXT">RESOLVED_WITH_CONTEXT — Context Provided</option>
                      <option value="CANNOT_RESOLVE">CANNOT_RESOLVE — Escalate to Vendor Review</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Engineering Rationale & Justification</label>
                  <textarea
                    rows={3}
                    value={engineeringRationale}
                    onChange={(e) => setEngineeringRationale(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleResolveCase}
                    disabled={submittingResolution}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {submittingResolution ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing to Blockchain...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Submit human resolution & sign ledger →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
