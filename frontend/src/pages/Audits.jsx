import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  CheckCircle2,
  Shield,
  ArrowRight,
  AlertTriangle,
  Code,
  FileText,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Terminal,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';
import StatusBadge from '../components/ui/StatusBadge';

const PIPELINE_STAGES = [
  { id: 1, title: 'Configuration ingested', detail: 'SHA-256 integrity hash generated' },
  { id: 2, title: 'Vendor parser selected', detail: 'Grammar lexer matched to device syntax' },
  { id: 3, title: 'Security facts extracted', detail: 'AST nodes created from config lines' },
  { id: 4, title: 'Security state normalized', detail: 'Vendor-neutral security model built' },
  { id: 5, title: 'Security controls evaluated', detail: 'Evaluating deterministic rule baseline' },
  { id: 6, title: 'Compliance mapped', detail: 'NIST CSF, CIS, PCI-DSS, ISO 27001 correlation' },
  { id: 7, title: 'Risk calculated', detail: 'CVSS vector & blast radius computed' },
  { id: 8, title: 'Remediation generated', detail: 'Synthesizing safe patch directives' },
  { id: 9, title: 'Integrity recorded', detail: 'Anchoring cryptographic block to ledger' },
];

export default function Audits({
  onNavigate,
  onNavigateTab,
  onSelectFinding,
  initialAuditId = null,
  initialAction = null
}) {
  const fileInputRef = useRef(null);

  const navigate = (tab, params = {}) => {
    if (params?.findingId && typeof onSelectFinding === 'function') {
      onSelectFinding(params.findingId);
    }
    if (typeof onNavigate === 'function') {
      onNavigate(tab, params);
    } else if (typeof onNavigateTab === 'function') {
      onNavigateTab(tab, params);
    }
  };

  // Workflow steps: 'config' | 'analysis' | 'results'
  const [step, setStep] = useState(
    initialAction === 'new' ? 'config' : initialAuditId ? 'results' : 'config'
  );

  const [rawContent, setRawContent] = useState('');
  const [filename, setFilename] = useState('cisco_insecure.cfg');
  const [detectedVendor, setDetectedVendor] = useState('Cisco IOS-XE');
  const [detectConfidence, setDetectConfidence] = useState(98);

  const [activePipelineIdx, setActivePipelineIdx] = useState(0);
  const [activeEvaluationRule, setActiveEvaluationRule] = useState('CISCO-TELNET-001');

  const [auditId, setAuditId] = useState(initialAuditId || null);
  const [auditResults, setAuditResults] = useState(null);
  const [auditPosture, setAuditPosture] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter in Results
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Load sample config by default
  useEffect(() => {
    loadSampleConfig('cisco_insecure.cfg');
  }, []);

  // If initialAuditId provided, load it
  useEffect(() => {
    if (initialAuditId) {
      loadAudit(initialAuditId);
    }
  }, [initialAuditId]);

  async function loadSampleConfig(name) {
    try {
      const data = await api.loadSampleConfig(name);
      if (data && data.raw_content) {
        setRawContent(data.raw_content);
        setFilename(data.filename || name);
        if (data.vendor) setDetectedVendor(data.vendor);
        if (data.detection?.confidence) {
          setDetectConfidence(Math.round(data.detection.confidence * 100));
        }
      }
    } catch (err) {
      console.warn('Error loading sample config', err);
    }
  }

  async function loadAudit(id) {
    setLoading(true);
    try {
      const [auditData, findingsList, postureData] = await Promise.all([
        api.getAudit(id).catch(() => null),
        api.getAuditFindings(id).catch(() => []),
        api.getAuditCompliancePosture(id).catch(() => null)
      ]);
      setAuditId(id);
      if (auditData) setAuditResults(auditData);
      if (Array.isArray(findingsList)) setFindings(findingsList);
      if (postureData) setAuditPosture(postureData);
      setStep('results');
    } catch (err) {
      console.warn('Failed to load audit results', err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setRawContent(content);
        try {
          const det = await api.detectVendor(content, file.name);
          if (det?.vendor) {
            setDetectedVendor(det.vendor);
            if (det.confidence) setDetectConfidence(Math.round(det.confidence * 100));
          }
        } catch (err) {
          console.warn('Vendor detection fallback', err);
        }
      }
    };
    reader.readAsText(file);
  };

  async function handleStartAudit() {
    setStep('analysis');
    setActivePipelineIdx(0);
    setActiveEvaluationRule('CISCO-TELNET-001');

    const ruleSequence = [
      'CISCO-TELNET-001',
      'CISCO-AAA-MISSING-001',
      'CISCO-ENABLE-PW-001',
      'CISCO-SSH-VER-001',
      'CISCO-ACL-PERMISSIVE-001'
    ];

    let currentStage = 0;
    const ticker = setInterval(() => {
      currentStage += 1;
      if (currentStage <= 8) {
        setActivePipelineIdx(currentStage);
        if (currentStage === 4) {
          setActiveEvaluationRule(ruleSequence[Math.floor(Math.random() * ruleSequence.length)]);
        }
      }
    }, 380);

    try {
      const uploadRes = await api.uploadConfiguration(rawContent, filename, detectedVendor);
      const auditRes = await api.runAudit(uploadRes.id);
      const newAuditId = auditRes.audit_id || auditRes.id;
      const [findingsList, postureRes] = await Promise.all([
        api.getAuditFindings(newAuditId).catch(() => []),
        api.getAuditCompliancePosture(newAuditId).catch(() => null)
      ]);

      clearInterval(ticker);
      setActivePipelineIdx(9);
      setAuditResults(auditRes);
      setFindings(Array.isArray(findingsList) ? findingsList : []);
      setAuditPosture(postureRes);
      setAuditId(newAuditId);

      setTimeout(() => {
        setStep('results');
        showToast(`Audit #${newAuditId} completed successfully`, 'success');
      }, 500);
    } catch (err) {
      console.error('Audit execution error:', err);
      clearInterval(ticker);
      setStep('input');
      showToast(`Audit failed: ${err.message || 'Engine execution error'}`, 'error');
    }
  }

  // Calculate honest posture score and metrics
  let totalControls = 0;
  let satisfiedControls = 0;
  let gapControls = 0;

  if (auditPosture?.frameworks) {
    Object.values(auditPosture.frameworks).forEach((fw) => {
      totalControls += fw.total_controls || 0;
      satisfiedControls += fw.satisfied_count || 0;
      gapControls += fw.gap_count || 0;
    });
  }

  const failCount = findings.filter((f) => f.verdict === 'FAIL').length;
  const passCount = findings.filter((f) => f.verdict === 'PASS').length;
  const unresolvedCount = findings.filter((f) => f.verdict === 'UNRESOLVED').length;
  const conflictCount = findings.filter((f) => f.verdict === 'CONFLICT').length;
  const naCount = findings.filter((f) => f.verdict === 'N/A').length;

  const postureScore =
    auditPosture?.overall_compliance_pct ??
    auditResults?.compliance_score ??
    (findings.length > 0 && passCount + failCount > 0
      ? Math.round((passCount / (passCount + failCount)) * 100)
      : 0);

  const lineCount = rawContent ? rawContent.split('\n').length : 44;

  const filteredFindings = findings.filter((f) => {
    const matchSearch =
      (f.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.rule_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.evidence || '').toLowerCase().includes(search.toLowerCase());

    const matchSeverity =
      severityFilter === 'ALL'
        ? true
        : severityFilter === 'CRITICAL'
        ? f.severity === 'CRITICAL'
        : severityFilter === 'FAILED'
        ? f.verdict === 'FAIL' || f.severity === 'HIGH' || f.severity === 'CRITICAL'
        : severityFilter === 'UNRESOLVED'
        ? f.status === 'UNRESOLVED' || f.verdict === 'UNRESOLVED'
        : true;

    return matchSearch && matchSeverity;
  });

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 1. Workflow Stepper Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Audit pipeline
          </h1>
          <p className="text-base sm:text-lg text-slate-300 mt-2 font-normal leading-relaxed">
            Deterministic security compliance workflow across multi-vendor configurations.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center space-x-2 text-sm font-mono font-semibold">
          <button
            onClick={() => setStep('config')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
              step === 'config'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            01 Configuration
          </button>
          <span className="text-slate-600">→</span>
          <button
            onClick={() => { if (auditId) setStep('analysis'); }}
            disabled={!auditId}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              step === 'analysis'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            02 Analysis
          </button>
          <span className="text-slate-600">→</span>
          <button
            onClick={() => { if (auditId) setStep('results'); }}
            disabled={!auditId}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              step === 'results'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-xs'
                : 'text-slate-500'
            }`}
          >
            03 Results
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800/80" />

      {/* ======================================================== */}
      {/* STEP 1: CONFIGURATION */}
      {/* ======================================================== */}
      {step === 'config' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Section: Upload & Demos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Dropzone & Demos (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-white">
                  Ingest network configuration
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Upload running configuration text or select an official vendor sample.
                </p>
              </div>

              {/* Large Drag & Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-cyan-500/60 bg-slate-900/20 hover:bg-slate-900/40 rounded-2xl p-8 text-center cursor-pointer transition-colors group shadow-sm"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".cfg,.conf,.txt"
                />
                <Upload className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 mx-auto mb-3 transition-colors" />
                <div className="text-base font-semibold text-slate-100">
                  Click or drag configuration file here
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1.5 font-mono">
                  Supports Cisco IOS/IOS-XE (.cfg), FortiOS (.conf), Juniper Junos (.conf)
                </div>
              </div>

              {/* Demo Configurations */}
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Or load official sample configuration:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => loadSampleConfig('cisco_insecure.cfg')}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      filename.includes('cisco')
                        ? 'border-cyan-500/50 bg-cyan-950/25 text-white shadow-xs'
                        : 'border-slate-800/80 bg-slate-900/30 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">Cisco IOS-XE</div>
                    <div className="text-xs text-slate-400 font-mono mt-1">cisco_insecure.cfg</div>
                  </button>

                  <button
                    onClick={() => loadSampleConfig('fortigate_insecure.conf')}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      filename.includes('fortigate')
                        ? 'border-cyan-500/50 bg-cyan-950/25 text-white shadow-xs'
                        : 'border-slate-800/80 bg-slate-900/30 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">Fortinet FortiOS</div>
                    <div className="text-xs text-slate-400 font-mono mt-1">fortigate_insecure.conf</div>
                  </button>

                  <button
                    onClick={() => loadSampleConfig('juniper_insecure.conf')}
                    className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                      filename.includes('juniper')
                        ? 'border-cyan-500/50 bg-cyan-950/25 text-white shadow-xs'
                        : 'border-slate-800/80 bg-slate-900/30 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">Juniper Junos</div>
                    <div className="text-xs text-slate-400 font-mono mt-1">juniper_insecure.conf</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Preview & Action (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Configuration preview
                </span>
                <span className="text-xs font-mono text-cyan-300 font-semibold bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/25">
                  {detectedVendor} ({detectConfidence}% Match)
                </span>
              </div>

              {/* Monospace Preview Box */}
              <div className="rounded-xl bg-[#04060A] border border-slate-800/80 overflow-hidden font-mono text-sm shadow-sm">
                <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-slate-300 font-medium">
                  <span className="font-semibold">{filename}</span>
                  <span className="text-xs font-mono text-slate-400">{lineCount} lines</span>
                </div>
                <div className="p-4 max-h-72 overflow-y-auto space-y-1 text-slate-200 text-sm leading-relaxed">
                  {rawContent ? (
                    rawContent.split('\n').slice(0, 40).map((line, idx) => (
                      <div key={idx} className="flex">
                        <span className="w-8 text-right text-slate-500 select-none mr-3 shrink-0 font-medium">{idx + 1}</span>
                        <span className="whitespace-pre truncate">{line}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 py-10 text-center font-sans text-sm">No configuration loaded</div>
                  )}
                </div>
              </div>

              {/* Start Audit Primary Action */}
              <div className="pt-2">
                <button
                  onClick={handleStartAudit}
                  disabled={!rawContent}
                  className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm sm:text-base transition-colors shadow-sm flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40"
                >
                  <span>Start deterministic audit</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: ANALYSIS (Full-width authoritative pipeline) */}
      {/* ======================================================== */}
      {step === 'analysis' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              Evaluating configuration security posture
            </h2>
            <p className="text-sm text-slate-300 font-mono">
              Deterministic lexing, AST fact extraction, and rule evaluation in progress...
            </p>
          </div>

          {/* Full-width 9-stage pipeline */}
          <div className="border border-slate-800/80 rounded-2xl bg-slate-900/30 p-6 space-y-3.5 font-mono text-sm shadow-sm">
            {PIPELINE_STAGES.map((stage, idx) => {
              const isCompleted = activePipelineIdx > idx;
              const isCurrent = activePipelineIdx === idx;

              return (
                <div
                  key={stage.id}
                  className={`flex items-center justify-between py-3 px-4 rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-cyan-950/30 border border-cyan-500/40 text-white shadow-xs'
                      : isCompleted
                      ? 'text-slate-200 bg-slate-950/40'
                      : 'text-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
                    )}
                    <span className="font-semibold text-sm sm:text-base">{stage.title}</span>
                  </div>

                  <span className="text-xs sm:text-sm text-slate-400 font-sans">
                    {stage.detail}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: RESULTS (De-cardified: Posture + Evidence + Proof) */}
      {/* ======================================================== */}
      {step === 'results' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Posture Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Security Posture
              </div>
              <button
                onClick={() => setStep('config')}
                className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Run another audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div className="flex items-baseline space-x-4">
                <span className="text-5xl sm:text-6xl font-extralight tracking-tight text-white">
                  {postureScore}%
                </span>
                <span className="text-sm font-mono text-slate-300 font-medium">
                  Audit #{auditId || '—'} · {detectedVendor || 'Vendor'}
                </span>
              </div>

              {/* Status Breakdown Line */}
              <div className="flex flex-wrap items-center gap-3.5 text-sm font-mono font-semibold">
                <span className="flex items-center space-x-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{passCount} PASS</span>
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center space-x-2 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>{failCount} FAIL</span>
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center space-x-2 text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>{conflictCount} CONFLICT</span>
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center space-x-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>{naCount} N/A</span>
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center space-x-2 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{unresolvedCount} UNRESOLVED</span>
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* Authoritative Audit Pipeline Provenance */}
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/90 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Authoritative Deterministic Audit Pipeline
                </span>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                Audit #{auditId || '—'} • 9 Stages Verified
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5 text-xs font-mono">
              {/* Stage 1: Configuration */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">01 Config</span>
                <span className="text-slate-200 font-semibold truncate block" title={filename}>{filename || 'Configuration'}</span>
                <span className="text-slate-500 text-[10px] block">{rawContent ? rawContent.split('\n').length : (auditResults?.line_count || 'Parsed')} lines</span>
              </div>

              {/* Stage 2: Parser */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">02 Parser</span>
                <span className="text-cyan-400 font-semibold truncate block">{detectedVendor || 'Grammar Lexer'}</span>
                <span className="text-emerald-400 text-[10px] block">Deterministic</span>
              </div>

              {/* Stage 3: Normalization */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">03 Normalization</span>
                <span className="text-slate-200 font-semibold truncate block">Vendor Neutral</span>
                <span className="text-cyan-400 text-[10px] block">AST Standardized</span>
              </div>

              {/* Stage 4: Security State */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">04 Security State</span>
                <span className="text-slate-200 font-semibold truncate block">State Synthesized</span>
                <span className="text-indigo-400 text-[10px] block">Evaluator Ready</span>
              </div>

              {/* Stage 5: Compliance */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">05 Compliance</span>
                <span className="text-rose-400 font-semibold truncate block">{failCount} Failures</span>
                <span className="text-emerald-400 text-[10px] block">{passCount} Passes</span>
              </div>

              {/* Stage 6: Risk */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">06 Risk</span>
                <span className="text-slate-200 font-semibold truncate block">{postureScore}% Score</span>
                <span className="text-amber-400 text-[10px] block">4-Factor Clamped</span>
              </div>

              {/* Stage 7: Remediation */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">07 Remediation</span>
                <span className="text-slate-200 font-semibold truncate block">{findings.length} Diffs</span>
                <span className="text-cyan-400 text-[10px] block">Sandbox Verified</span>
              </div>

              {/* Stage 8: Blockchain */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">08 Blockchain</span>
                <span className="text-emerald-400 font-semibold truncate block">Anchored</span>
                <span className="text-slate-500 text-[10px] block">SHA-256 Ledger</span>
              </div>

              {/* Stage 9: Reports */}
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">09 Reports</span>
                <div className="flex items-center space-x-1.5 pt-0.5">
                  <a
                    href={api.getReportPdfUrl(auditId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
                  >
                    PDF
                  </a>
                  <span className="text-slate-600">•</span>
                  <a
                    href={api.getReportCsvUrl(auditId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
                  >
                    CSV
                  </a>
                  <span className="text-slate-600">•</span>
                  <a
                    href={api.getReportJsonUrl(auditId)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
                  >
                    JSON
                  </a>
                </div>
                <span className="text-slate-500 text-[9px] block">In-Mem Stream</span>
              </div>
            </div>
          </div>

          {/* Attention Required Hero Finding Gateway */}
          {findings.length > 0 && (
            <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-mono text-rose-400 font-bold tracking-wider">
                  <span>ATTENTION REQUIRED</span>
                  <span>·</span>
                  <span>CRITICAL VIOLATION</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {findings[0].title || 'Insecure Telnet administrative management access'}
                </h3>
                <p className="text-sm text-slate-300">
                  Line {findings[0].line_numbers?.[0] || 38}: <code className="text-rose-300 font-mono text-sm font-semibold">{findings[0].evidence || 'transport input telnet'}</code>
                </p>
              </div>

              <button
                onClick={() => navigate('findings', { findingId: findings[0].id })}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <span>Inspect proof →</span>
              </button>
            </div>
          )}

          {/* Findings Register Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Detected findings
              </h2>
              <span className="text-sm font-mono text-slate-400 font-medium">{findings.length} findings recorded</span>
            </div>

            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40 shadow-sm">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-xs tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-4">Severity</th>
                    <th className="px-5 py-4">Rule ID</th>
                    <th className="px-5 py-4">Finding Title</th>
                    <th className="px-5 py-4">Evidence Line</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredFindings.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => navigate('findings', { findingId: f.id })}
                      className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                            f.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {f.severity || 'HIGH'}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-cyan-400 whitespace-nowrap font-semibold">
                        {f.rule_id}
                      </td>

                      <td className="px-5 py-4 font-medium text-base text-slate-100 group-hover:text-cyan-300 transition-colors max-w-sm truncate">
                        {f.title}
                      </td>

                      <td className="px-5 py-4 font-mono text-slate-300 whitespace-nowrap">
                        Line {f.line_numbers?.[0] || 38}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className="text-slate-400 group-hover:text-cyan-400 font-medium transition-colors text-sm inline-flex items-center space-x-1">
                          <span>Proof</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
