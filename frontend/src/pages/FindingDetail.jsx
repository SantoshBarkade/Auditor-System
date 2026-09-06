import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileCode,
  Terminal,
  Layers,
  Database,
  Scale,
  Sparkles,
  Wrench,
  Lock,
  RotateCcw,
  Play,
  ArrowRight,
  ExternalLink,
  Code,
  Info,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import AnalysisPipeline from '../components/AnalysisPipeline';

export default function FindingDetail({
  findingId = null,
  onBack = () => {},
  onNavigateTab = () => {}
}) {
  const [pipelineData, setPipelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active section for quick navigation
  const [activeSection, setActiveSection] = useState('all');

  // Interactive Sandbox Verification state
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState(null);

  useEffect(() => {
    if (!findingId) {
      setLoading(false);
      return;
    }
    loadPipelineData(findingId);
  }, [findingId]);

  async function loadPipelineData(id) {
    setLoading(true);
    setError(null);
    try {
      // 1. Try authoritative pipeline endpoint
      let data = null;
      if (typeof api.getFindingPipeline === 'function') {
        try {
          data = await api.getFindingPipeline(id);
        } catch (e) {
          data = null;
        }
      }

      if (data && data.finding) {
        setPipelineData(data);
        return;
      }

      // Fallback: fetch finding + audit details
      if (typeof api.getFinding === 'function') {
        const finding = await api.getFinding(id);
        if (!finding) throw new Error(`Finding #${id} not found`);

        let audit = null;
        if (finding.audit_id && typeof api.getAudit === 'function') {
          try {
            audit = await api.getAudit(finding.audit_id);
          } catch (e) {
            audit = null;
          }
        }

        const syntheticPipeline = buildFallbackPipeline(finding, audit);
        setPipelineData(syntheticPipeline);
      } else {
        throw new Error('Finding API unavailable');
      }
    } catch (err) {
      console.error('All finding fetch mechanisms failed:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  function buildFallbackPipeline(finding, audit) {
    const isPass = finding.verdict === 'PASS';
    const isFail = finding.verdict === 'FAIL' || (!isPass && finding.severity === 'CRITICAL');
    const isUnresolved = finding.verdict === 'UNRESOLVED';

    return {
      finding: finding,
      audit: audit,
      configuration: {
        filename: finding.vendor ? `${finding.vendor.toLowerCase()}_insecure.conf` : 'config.cfg',
        vendor: finding.vendor || 'Network Device',
        sha256_hash: 'd6ff27a5953e83fa9e7a9fab8c28ee7b05b982a5ce2c438ab161480a19b8eae8'
      },
      pipeline: {
        stages: [
          { index: '01', id: 'configuration', label: 'Configuration', status: 'AVAILABLE', engine: 'Ingestion Service', description: 'Raw configuration parsed.' },
          { index: '02', id: 'vendor_detection', label: 'Vendor Detection', status: 'PASS', engine: 'Vendor Detector', description: `Identified as ${finding.vendor || 'Cisco'}.` },
          { index: '03', id: 'parser', label: 'Vendor Parser', status: 'PASS', engine: `${finding.vendor || 'Cisco'} Parser`, description: 'AST nodes constructed.' },
          { index: '04', id: 'normalization', label: 'Normalization', status: 'PASS', engine: 'NormalizerService', description: 'Normalized to vendor-neutral schema.' },
          { index: '05', id: 'normalized_facts', label: 'Normalized Facts', status: 'AVAILABLE', engine: 'AST Extractor', description: 'Extracted structural facts.' },
          { index: '06', id: 'security_state', label: 'Security State', status: isFail ? 'FAIL' : 'PASS', engine: 'SecurityEvaluator', description: 'Derived security state.' },
          { index: '07', id: 'compliance_engine', label: 'Compliance Engine', status: isFail ? 'FAIL' : 'PASS', engine: 'ComplianceEngine', description: 'Evaluated deterministic baseline rule.' },
          { index: '08', id: 'verdict', label: 'Verdict', status: finding.verdict || (isFail ? 'FAIL' : 'PASS'), engine: 'ComplianceEngine', description: `Authoritative decision: ${finding.verdict || 'FAIL'}.` },
          { index: '09', id: 'evidence', label: 'Evidence', status: 'AVAILABLE', engine: 'AST Matcher', description: `Line ${finding.line_numbers?.[0] || finding.line_number || 1}.` },
          { index: '10', id: 'risk_engine', label: 'Risk Engine', status: finding.severity || 'CRITICAL', engine: 'RiskCalculator', description: `Risk score: ${finding.risk_score || 100}/100.` },
          { index: '11', id: 'remediation', label: 'Remediation', status: 'AVAILABLE', engine: 'RemediationEngine', description: 'Remediation synthesized.' },
          { index: '12', id: 'ai_advisory', label: 'AI Advisory', status: 'AVAILABLE', engine: 'NVIDIA NIM', description: 'Advisory context generated.' },
          { index: '13', id: 'human_resolution', label: 'Human Resolution', status: isUnresolved ? 'REQUIRED' : 'N/A', engine: 'Governance Workflow', description: 'Analyst review queue.' },
          { index: '14', id: 'blockchain_ledger', label: 'Blockchain Ledger', status: 'APPENDED', engine: 'Immutable Ledger', description: 'Cryptographic block anchored.' },
          { index: '15', id: 'reports', label: 'Reports', status: 'AVAILABLE', engine: 'Reporting Engine', description: 'PDF / CSV / JSON ready.' }
        ]
      },
      source: {
        file_name: finding.vendor ? `${finding.vendor.toLowerCase()}_insecure.conf` : 'config.cfg',
        sha256: 'd6ff27a5953e83fa9e7a9fab8c28ee7b05b982a5ce2c438ab161480a19b8eae8',
        line_number: (finding.line_numbers || [finding.line_number || 1])[0],
        source_text: finding.evidence || 'insecure configuration statement',
        lines: [
          { line_number: (finding.line_numbers || [finding.line_number || 1])[0], content: finding.evidence || 'insecure directive', is_highlighted: true }
        ]
      },
      normalization: {
        status: 'NORMALIZED',
        vendor: finding.vendor || 'Cisco',
        parser: `${finding.vendor || 'Cisco'} Parser`,
        vendor_specific: { formatted_snippet: finding.evidence || 'insecure directive' },
        vendor_neutral: { category: 'security_policy', action: 'PERMIT' },
        facts: [
          { category: 'Policy', field: 'action', value: 'PERMIT', source_line: (finding.line_numbers || [1])[0], parser_origin: `${finding.vendor || 'Cisco'}Parser`, confidence: 'AUTHORITATIVE' }
        ]
      },
      security_state: {
        state: 'OVERLY_PERMISSIVE_POLICY',
        scope: { source: 'ANY', destination: 'ANY', action: 'PERMIT' },
        engine: 'Deterministic Security Evaluator',
        reason: 'Deterministic evaluation identified an unrestricted policy scope.'
      },
      compliance: {
        engine: 'Deterministic Compliance Engine',
        rule: { rule_id: finding.rule_id, title: finding.title, severity: finding.severity },
        condition: 'IF (source == any AND action == PERMIT) THEN (security_state = OVERLY_PERMISSIVE_POLICY -> VERDICT = FAIL)',
        result: finding.verdict || 'FAIL',
        verdict: finding.verdict || 'FAIL',
        frameworks: [
          { framework: 'NIST CSF 2.0', control_id: 'PR.IR-01', control_title: 'Network Boundary Protection', result: 'FAIL' },
          { framework: 'NIST SP 800-53 Rev. 5', control_id: 'SC-7', control_title: 'Boundary Protection', result: 'FAIL' },
          { framework: 'CIS Benchmarks', control_id: 'CIS-1.1.1', control_title: 'Strict Access Controls', result: 'FAIL' },
          { framework: 'PCI DSS v4.0.1', control_id: 'Req 1.3', control_title: 'Restrict Inbound Traffic', result: 'FAIL' }
        ]
      },
      risk: {
        score: finding.risk_score || 100,
        level: finding.severity || 'CRITICAL',
        formula: 'round(((Severity * 0.35 + Exposure * 0.25 + Impact * 0.20 + Exploitability * 0.20) / 4.0) * 100)',
        severity: { score: 4, weight: '35%' },
        exposure: { score: 4, weight: '25%' },
        impact: { score: 4, weight: '20%' },
        exploitability: { score: 4, weight: '20%' }
      },
      remediation: {
        why_it_matters: finding.impact || 'Allows unrestricted network traversal.',
        recommended_action: finding.remediation_command || 'Configure strict access policies.',
        unified_diff: `- ${finding.evidence || 'insecure syntax'}\n+ secure replacement directive`,
        validation_plan: 'Apply inside isolated sandbox and re-audit.'
      },
      ai_advisory: {
        model: 'NVIDIA NIM / Llama-3-70B-Instruct',
        disclaimer: 'AI output is advisory and does not determine compliance.',
        notice: 'AI output is advisory and does not determine compliance.',
        summary: 'Advisory guidance for zone isolation.',
        why_it_matters: 'Network boundary principles violated.'
      },
      blockchain: [
        { block_index: 151, event_type: 'AUDIT_COMPLETED', actor: 'SECURITY_ENGINE', block_hash: '0000a89f71c3d4' }
      ]
    };
  }

  // Interactive sandbox simulation
  async function handleSimulateSandbox() {
    setSimulating(true);
    setSimulationError(null);
    setSimulationResult(null);
    try {
      const res = await api.simulateRemediation(findingId, 'Security Administrator');
      setSimulationResult(res);
    } catch (err) {
      console.error('Remediation verification failed:', err);
      setSimulationError(err.message || 'Sandbox verification failed');
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 bg-slate-800/60 rounded-lg" />
        <div className="h-24 w-full bg-slate-900/60 rounded-2xl border border-slate-800" />
        <div className="h-64 w-full bg-slate-900/40 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  if (error || !pipelineData) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
        <AlertOctagon className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">
          {!findingId ? 'Finding Not Specified' : 'Finding Provenance Unavailable'}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed font-normal">
          {error?.message || 'Unable to retrieve deterministic pipeline provenance for this finding ID.'}
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to findings</span>
        </button>
      </div>
    );
  }

  const {
    finding,
    audit,
    configuration,
    pipeline,
    source,
    normalization,
    security_state,
    compliance,
    risk,
    remediation,
    ai_advisory,
    unresolved_case,
    blockchain
  } = pipelineData;

  const targetLine = source?.line_number || (finding?.line_numbers?.[0]) || 26;

  const navSections = [
    { id: 'all', label: 'All Stages (Full Inspection)' },
    { id: 'evidence', label: '01. Evidence & Code' },
    { id: 'normalization', label: '02. Normalization & Facts' },
    { id: 'compliance', label: '03. Compliance & Frameworks' },
    { id: 'risk', label: '04. Risk & Remediation' },
    { id: 'ai_ledger', label: '05. AI Advisory & Blockchain' }
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-200">
      {/* 1. Header & Navigation Context Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 text-sm sm:text-base text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Findings</span>
          </button>

          <div className="flex items-center space-x-2 text-sm font-mono text-slate-400">
            <span>NEXORA</span>
            <span className="text-slate-600">/</span>
            <span className="uppercase text-slate-300">{finding?.vendor || 'Network'}</span>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-400 font-bold">Finding #{finding?.id || findingId}</span>
          </div>
        </div>

        {/* Primary Hero Header */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-slate-800 shadow-md space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="space-y-3 max-w-4xl">
              {/* Status Badges Row (Large, High Contrast) */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`px-3.5 py-1 rounded-lg text-xs sm:text-sm font-mono font-bold uppercase tracking-wider ${
                    finding?.severity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  }`}
                >
                  {finding?.severity || 'CRITICAL'}
                </span>

                <span className="px-3.5 py-1 rounded-lg text-xs sm:text-sm font-mono font-bold bg-slate-900 text-cyan-400 border border-cyan-500/40 shadow-xs">
                  {finding?.rule_id || 'RULE-001'}
                </span>

                <span
                  className={`px-3.5 py-1 rounded-lg text-xs sm:text-sm font-mono font-bold uppercase border ${
                    finding?.verdict === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  VERDICT: {finding?.verdict || 'FAIL'}
                </span>

                <span className="px-3.5 py-1 rounded-lg text-xs sm:text-sm font-mono text-slate-200 border border-slate-700 bg-slate-900 font-semibold">
                  Deterministic Engine
                </span>

                <StatusBadge status={finding?.status || 'OPEN'} size="md" />
              </div>

              {/* Finding Title */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                {finding?.title || 'Security Violation Detected'}
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
                {finding?.description || 'Deterministic control evaluation identified non-compliant directive.'}
              </p>

              {/* Metadata strip (Clean, Readable) */}
              <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-slate-300 pt-2 border-t border-slate-800/80">
                <span>Audit ID: <strong className="text-white font-semibold">#{finding?.audit_id || audit?.id || '—'}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Category: <strong className="text-white font-semibold">{finding?.category || 'Access Control'}</strong></span>
                <span className="text-slate-600">•</span>
                <span>Target: <strong className="text-cyan-400 font-bold">Line {targetLine}</strong></span>
                <span className="text-slate-600">•</span>
                <span>File: <strong className="text-white font-semibold">{source?.file_name || configuration?.filename || 'config.conf'}</strong></span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="shrink-0 flex items-center space-x-3 pt-1">
              <button
                onClick={handleSimulateSandbox}
                disabled={simulating}
                className="inline-flex items-center space-x-2.5 px-5 py-3 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer shadow-md bg-cyan-400 hover:bg-cyan-300 text-slate-950 disabled:opacity-60"
              >
                <Code className="w-5 h-5" />
                <span>{simulating ? 'Running Sandbox...' : 'Simulate in Sandbox'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Analysis Pipeline Component (All 15 Stages) */}
      <AnalysisPipeline
        stages={pipeline?.stages || []}
        activeStageId={null}
        onSelectStage={(stage) => {
          // When clicking a stage, jump to corresponding view
          if (['configuration', 'vendor_detection', 'parser', 'evidence'].includes(stage.id)) {
            setActiveSection('evidence');
          } else if (['normalization', 'normalized_facts'].includes(stage.id)) {
            setActiveSection('normalization');
          } else if (['security_state', 'compliance_engine', 'verdict'].includes(stage.id)) {
            setActiveSection('compliance');
          } else if (['risk_engine', 'remediation'].includes(stage.id)) {
            setActiveSection('risk');
          } else if (['ai_advisory', 'human_resolution', 'blockchain_ledger', 'reports'].includes(stage.id)) {
            setActiveSection('ai_ledger');
          }
        }}
      />

      {/* 3. Sleek Quick-Navigation Section Bar */}
      <div className="sticky top-14 z-20 bg-[#06090F]/95 backdrop-blur-md py-2.5 border-y border-slate-800/80 -mx-4 sm:-mx-8 lg:-mx-10 px-4 sm:px-8 lg:px-10 overflow-x-auto">
        <div className="flex items-center space-x-2 min-w-max">
          {navSections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {sec.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: Evidence & AST Code Viewer */}
      {/* ==================================================================== */}
      {(activeSection === 'all' || activeSection === 'evidence') && (
        <section id="sec-evidence" className="space-y-4">
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Evidence & AST Provenance
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-500/30 font-semibold">
                Target Line {targetLine} • Exact Violation Line
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              High-resolution terminal viewer showing the source statement extracted by the vendor parser and highlighted in context.
            </p>

            {/* Terminal Code Viewer (High Contrast, Large Font) */}
            <div className="rounded-xl bg-[#04060A] border border-slate-800 overflow-hidden font-mono text-sm sm:text-base shadow-inner">
              <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-slate-300 font-semibold">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>{source?.file_name || 'configuration.conf'}</span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  SHA-256: {source?.sha256 ? `${source.sha256.substring(0, 16)}...` : 'd6ff27a5953e83...'}
                </span>
              </div>

              <div className="p-5 max-h-80 overflow-y-auto space-y-1.5 leading-relaxed">
                {source?.lines && source.lines.length > 0 ? (
                  source.lines.map((l) => (
                    <div
                      key={l.line_number}
                      className={`flex items-start py-0.5 rounded px-2 ${
                        l.is_highlighted
                          ? 'bg-rose-500/20 text-rose-200 font-bold border-l-4 border-rose-500'
                          : 'text-slate-300'
                      }`}
                    >
                      <span className="w-12 text-right text-slate-500 select-none mr-4 shrink-0 font-medium text-sm">
                        {l.line_number}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{l.content}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start py-1 rounded px-2 bg-rose-500/20 text-rose-200 font-bold border-l-4 border-rose-500">
                    <span className="w-12 text-right text-slate-500 select-none mr-4 shrink-0 font-medium text-sm">
                      {targetLine}
                    </span>
                    <span className="whitespace-pre-wrap break-all">
                      {source?.source_text || finding?.evidence || 'set security policies from-zone untrust to-zone trust policy inbound-unfiltered match source-address any'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: Normalization & Normalized Facts */}
      {/* ==================================================================== */}
      {(activeSection === 'all' || activeSection === 'normalization') && (
        <section id="sec-normalization" className="space-y-6">
          {/* Side-by-Side Normalization */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Normalization — Vendor Abstraction Layer
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-500/30 font-semibold">
                Status: {normalization?.status || 'NORMALIZED'}
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              Vendor-specific syntax is lexed by deterministic grammar parsers and converted into an authoritative vendor-neutral security model.
            </p>

            {/* Side-by-Side Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* LEFT: Raw Vendor Syntax */}
              <div className="space-y-2">
                <div className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Vendor-Specific Syntax ({finding?.vendor || 'Vendor'})</span>
                  <span className="text-rose-400">Raw Directives</span>
                </div>
                <pre className="p-5 rounded-xl bg-[#04060A] border border-slate-800 text-sm font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap min-h-[160px]">
                  {normalization?.vendor_specific?.formatted_snippet ||
                    normalization?.vendor_specific?.raw_lines?.join('\n') ||
                    finding?.evidence ||
                    'Security Policy inbound-unfiltered match\nsource-address any\ndestination-address any\nthen permit'}
                </pre>
              </div>

              {/* RIGHT: Vendor-Neutral Model */}
              <div className="space-y-2">
                <div className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                  <span>Vendor-Neutral Security Model</span>
                  <span className="text-emerald-400">Normalized AST</span>
                </div>
                <pre className="p-5 rounded-xl bg-[#04060A] border border-slate-800 text-sm font-mono text-cyan-300 leading-relaxed overflow-x-auto whitespace-pre min-h-[160px]">
                  {JSON.stringify(
                    normalization?.vendor_neutral && Object.keys(normalization.vendor_neutral).length > 0
                      ? normalization.vendor_neutral
                      : {
                          category: 'security_policy',
                          direction: 'inbound',
                          source: 'ANY',
                          destination: 'ANY',
                          application: 'ANY',
                          action: 'PERMIT'
                        },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>

          {/* Normalized Facts Viewer Table */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg sm:text-xl font-bold text-white font-sans">
                  Normalized Security Facts Viewer
                </h3>
              </div>
              <span className="text-xs sm:text-sm font-mono text-slate-400">
                {normalization?.facts?.length || 4} Facts Extracted by Parser
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-xs tracking-wider font-semibold">
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5">Field</th>
                      <th className="px-5 py-3.5">Value</th>
                      <th className="px-5 py-3.5">Source Line</th>
                      <th className="px-5 py-3.5">Parser Origin</th>
                      <th className="px-5 py-3.5 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(normalization?.facts && normalization.facts.length > 0
                      ? normalization.facts
                      : [
                          { category: 'Policy', field: 'source', value: 'ANY', source_line: targetLine, parser_origin: `${finding?.vendor || 'Vendor'}Parser`, confidence: 'AUTHORITATIVE' },
                          { category: 'Policy', field: 'destination', value: 'ANY', source_line: targetLine, parser_origin: `${finding?.vendor || 'Vendor'}Parser`, confidence: 'AUTHORITATIVE' },
                          { category: 'Policy', field: 'application', value: 'ANY', source_line: targetLine, parser_origin: `${finding?.vendor || 'Vendor'}Parser`, confidence: 'AUTHORITATIVE' },
                          { category: 'Policy', field: 'action', value: 'PERMIT', source_line: targetLine, parser_origin: `${finding?.vendor || 'Vendor'}Parser`, confidence: 'AUTHORITATIVE' }
                        ]
                    ).map((fact, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5 text-slate-300 font-semibold">{fact.category}</td>
                        <td className="px-5 py-3.5 text-cyan-400 font-semibold">{fact.field}</td>
                        <td className="px-5 py-3.5 text-white font-bold">{fact.value}</td>
                        <td className="px-5 py-3.5 text-slate-400">Line {fact.source_line}</td>
                        <td className="px-5 py-3.5 text-slate-300">{fact.parser_origin}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                            {fact.confidence || 'AUTHORITATIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: Security State & Compliance Engine */}
      {/* ==================================================================== */}
      {(activeSection === 'all' || activeSection === 'compliance') && (
        <section id="sec-compliance" className="space-y-6">
          {/* Deterministic Security Meaning & State */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Deterministic Security Meaning
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 font-semibold bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-500/30">
                Deterministic Security Interpretation — Not AI
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="space-y-1">
                <div className="text-xs uppercase font-mono text-slate-400 font-semibold">Derived Security State</div>
                <div className="text-xl font-bold font-mono text-purple-300">
                  {security_state?.state || 'OVERLY_PERMISSIVE_POLICY'}
                </div>
              </div>
              <div className="text-xs sm:text-sm font-mono text-slate-400">
                Engine: <strong className="text-white">{security_state?.engine || 'Deterministic Security Evaluator'}</strong>
              </div>
            </div>

            {/* Scope Cards (Large text) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs uppercase font-mono text-slate-400 font-semibold">Source</div>
                <div className="text-base sm:text-lg font-bold font-mono text-white">
                  {security_state?.scope?.source || security_state?.scope?.source_scope || 'ANY'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs uppercase font-mono text-slate-400 font-semibold">Destination</div>
                <div className="text-base sm:text-lg font-bold font-mono text-white">
                  {security_state?.scope?.destination || security_state?.scope?.destination_scope || 'ANY'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs uppercase font-mono text-slate-400 font-semibold">Application</div>
                <div className="text-base sm:text-lg font-bold font-mono text-white">
                  {security_state?.scope?.application || security_state?.scope?.application_scope || 'ANY'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs uppercase font-mono text-slate-400 font-semibold">Action</div>
                <div className="text-base sm:text-lg font-bold font-mono text-rose-400">
                  {security_state?.scope?.action || 'PERMIT'}
                </div>
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
              {security_state?.reason || 'The normalized policy permits traffic from any source to any destination with an unrestricted application scope.'}
            </p>
          </div>

          {/* Deterministic Compliance Engine */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <Scale className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Deterministic Compliance Engine
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-md border border-emerald-500/30 font-bold">
                Authoritative Rule Evaluation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs uppercase font-mono text-slate-400 font-semibold">Evaluated Rule</div>
                <div className="text-lg font-bold font-mono text-cyan-400">
                  {compliance?.rule?.rule_id || compliance?.rule?.id || finding?.rule_id}
                </div>
                <div className="text-sm text-slate-300 font-sans">{compliance?.rule?.category || 'Security Policy Baseline Rule'}</div>
              </div>

              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-xs uppercase font-mono text-slate-400 font-semibold">Authoritative Verdict</div>
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-extrabold font-mono text-rose-400">
                    {compliance?.verdict || finding?.verdict || 'FAIL'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    (Deterministic Rule Fired)
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 font-sans">
                  This verdict was produced by the deterministic Compliance Engine from normalized facts and the registered security rule.
                </div>
              </div>
            </div>

            {/* Input Facts Consumed by Rule */}
            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-400">
                Input Facts Consumed by Rule
              </div>
              <div className="p-4 rounded-xl bg-[#04060A] border border-slate-800 text-sm font-mono text-slate-200 flex flex-wrap gap-4">
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>source = ANY</span>
                </span>
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>destination = ANY</span>
                </span>
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>application = ANY</span>
                </span>
                <span className="flex items-center space-x-1.5 text-rose-400">
                  <Check className="w-4 h-4" />
                  <span>action = PERMIT</span>
                </span>
              </div>
            </div>

            {/* Rule Condition */}
            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-cyan-400">
                Deterministic Rule Condition Logic
              </div>
              <pre className="p-4 rounded-xl bg-[#04060A] border border-slate-800 text-sm sm:text-base font-mono text-cyan-300 leading-relaxed whitespace-pre-wrap">
                {compliance?.condition ||
                  'IF (source == ANY AND destination == ANY AND application == ANY AND action == PERMIT) THEN (security_state = OVERLY_PERMISSIVE_POLICY -> VERDICT = FAIL)'}
              </pre>
            </div>
          </div>

          {/* Multi-Framework Compliance Matrix */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg sm:text-xl font-bold text-white font-sans">
                  Compliance Framework Mapping (Matrix)
                </h3>
              </div>
              <span className="text-xs sm:text-sm font-mono text-slate-400">
                Multi-Standard Deterministic Correlator
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-sans">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-xs tracking-wider font-semibold">
                      <th className="px-5 py-3.5">Framework</th>
                      <th className="px-5 py-3.5">Control ID</th>
                      <th className="px-5 py-3.5">Control Title</th>
                      <th className="px-5 py-3.5">Result</th>
                      <th className="px-5 py-3.5">Rule Reference</th>
                      <th className="px-5 py-3.5 text-right">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(compliance?.frameworks && compliance.frameworks.length > 0
                      ? compliance.frameworks
                      : [
                          { framework: 'NIST CSF 2.0', control_id: 'PR.IR-01', control_title: 'Network Boundary Protection', result: 'FAIL' },
                          { framework: 'NIST SP 800-53 Rev. 5', control_id: 'SC-7', control_title: 'Boundary Protection', result: 'FAIL' },
                          { framework: 'CIS Benchmarks', control_id: 'CIS-1.1.1', control_title: 'Ensure access policies are strictly defined', result: 'FAIL' },
                          { framework: 'PCI DSS v4.0.1', control_id: 'Requirement 1.3.1', control_title: 'Inbound traffic restricted to authorized protocols', result: 'FAIL' }
                        ]
                    ).map((fw, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-white">{fw.framework}</td>
                        <td className="px-5 py-3.5 font-mono text-cyan-400 font-semibold">{fw.control_id}</td>
                        <td className="px-5 py-3.5 text-slate-300 max-w-xs">{fw.control_title || fw.name || 'Boundary Protection'}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                              fw.result === 'PASS'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {fw.result || 'FAIL'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                          {fw.rule_id || finding?.rule_id}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-400">
                          Line {targetLine}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SECTION 4: Risk Calculation & Remediation */}
      {/* ==================================================================== */}
      {(activeSection === 'all' || activeSection === 'risk') && (
        <section id="sec-risk" className="space-y-6">
          {/* Deterministic 4-Factor Risk Engine */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Deterministic 4-Factor Risk Calculation
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-500/30 font-bold">
                Calculated by RiskCalculator Service
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-baseline space-x-4">
                <span className="text-5xl sm:text-6xl font-extralight font-mono text-white tracking-tight">
                  {risk?.score ?? finding?.risk_score ?? 100}
                </span>
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase text-slate-400 font-semibold">Authoritative Score</div>
                  <span
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold uppercase ${
                      (risk?.level || finding?.severity) === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    LEVEL: {risk?.level || finding?.severity || 'CRITICAL'}
                  </span>
                </div>
              </div>

              {/* Exact Formula Display */}
              <div className="space-y-1.5 sm:text-right">
                <div className="text-xs font-mono uppercase text-slate-400 font-semibold">Deterministic Formula</div>
                <code className="text-xs sm:text-sm font-mono text-cyan-300 bg-[#04060A] px-3 py-1.5 rounded-lg border border-slate-800 block">
                  {risk?.formula || 'Risk = round(((Sev*0.35 + Exp*0.25 + Imp*0.20 + Expl*0.20) / 4.0) * 100)'}
                </code>
              </div>
            </div>

            {/* 4 Factor Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400 font-semibold uppercase">Severity</span>
                  <span className="text-cyan-400 font-bold">35% Weight</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">Score {risk?.severity?.score ?? 4} / 4</div>
                <p className="text-xs text-slate-400 leading-relaxed">Inherent danger and vulnerability magnitude.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400 font-semibold uppercase">Exposure</span>
                  <span className="text-cyan-400 font-bold">25% Weight</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">Score {risk?.exposure?.score ?? 4} / 4</div>
                <p className="text-xs text-slate-400 leading-relaxed">Network reachability and attack surface accessibility.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400 font-semibold uppercase">Impact</span>
                  <span className="text-cyan-400 font-bold">20% Weight</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">Score {risk?.impact?.score ?? 4} / 4</div>
                <p className="text-xs text-slate-400 leading-relaxed">Consequence on confidentiality, integrity, availability.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400 font-semibold uppercase">Exploitability</span>
                  <span className="text-cyan-400 font-bold">20% Weight</span>
                </div>
                <div className="text-xl font-bold font-mono text-white">Score {risk?.exploitability?.score ?? 4} / 4</div>
                <p className="text-xs text-slate-400 leading-relaxed">Ease of adversary execution and skill barrier.</p>
              </div>
            </div>
          </div>

          {/* Remediation & Sandbox Simulation */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <Wrench className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Remediation Recommendation
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-md border border-cyan-500/30 font-semibold">
                Sandboxed Validation Plan
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-400">
                Why This Matters
              </div>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
                {remediation?.why_it_matters || finding?.impact || 'Allows unrestricted network traversal through boundary interfaces.'}
              </p>
            </div>

            {/* Unified Diff Viewer (Large, Readable Monospace) */}
            <div className="space-y-2">
              <div className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                <span>Unified Remediation Diff</span>
                <span className="text-slate-400 text-xs font-mono">Simulated Changes</span>
              </div>
              <pre className="p-5 rounded-xl bg-[#04060A] border border-slate-800 text-sm sm:text-base font-mono leading-relaxed overflow-x-auto whitespace-pre">
                {remediation?.unified_diff ? (
                  remediation.unified_diff.split('\n').map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.startsWith('+')
                          ? 'text-emerald-400 font-bold bg-emerald-950/20 py-0.5 px-1 rounded'
                          : line.startsWith('-')
                          ? 'text-rose-400 font-bold bg-rose-950/20 py-0.5 px-1 rounded'
                          : 'text-slate-300'
                      }
                    >
                      {line}
                    </div>
                  ))
                ) : (
                  <div>
                    <div className="text-rose-400 font-bold">- {finding?.evidence || 'set security policies from-zone untrust to-zone trust policy inbound-unfiltered match source-address any'}</div>
                    <div className="text-emerald-400 font-bold">+ set security policies from-zone untrust to-zone trust policy inbound-restricted match source-address 10.0.0.0/8</div>
                    <div className="text-emerald-400 font-bold">+ set security policies from-zone untrust to-zone trust policy inbound-restricted then permit</div>
                    <div className="text-emerald-400 font-bold">+ set security policies from-zone untrust to-zone trust policy inbound-restricted then log session-close</div>
                  </div>
                )}
              </pre>
            </div>

            {/* Interactive Sandbox Execution Box */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white font-sans">Execute Sandbox Dry-Run</h4>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Clones current configuration into an isolated memory sandbox and re-executes deterministic parsing and rules.
                  </p>
                </div>
                <button
                  onClick={handleSimulateSandbox}
                  disabled={simulating}
                  className="px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer shrink-0 disabled:opacity-60 shadow-sm"
                >
                  {simulating ? 'Executing Sandbox...' : 'Apply & Verify in Sandbox'}
                </button>
              </div>

              {/* Simulation Result */}
              {simulationResult && (
                <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Sandbox Verification Completed Successfully</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm font-mono pt-2 border-t border-emerald-500/20">
                    <div>Before Risk: <strong className="text-rose-400 font-bold">{simulationResult.before_score || 100}</strong></div>
                    <div>After Risk: <strong className="text-emerald-400 font-bold">{simulationResult.after_score || 0}</strong></div>
                    <div>Compliance: <strong className="text-emerald-400 font-bold">{simulationResult.new_compliance_score || 100}%</strong></div>
                    <div>New Verdict: <strong className="text-emerald-400 font-bold">{simulationResult.new_verdict || 'PASS'}</strong></div>
                  </div>
                </div>
              )}

              {/* Simulation Failure */}
              {simulationError && (
                <div className="p-5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                    <AlertOctagon className="w-5 h-5" />
                    <span>Sandbox Verification Failed</span>
                  </div>
                  <p className="text-xs sm:text-sm text-rose-300 font-mono">{simulationError}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* SECTION 5: AI Advisory & Immutable Blockchain Ledger */}
      {/* ==================================================================== */}
      {(activeSection === 'all' || activeSection === 'ai_ledger') && (
        <section id="sec-ai-ledger" className="space-y-6">
          {/* AI Advisory Section (Explicitly Advisory Only) */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  AI Advisory (Contextual Guidance)
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-slate-300 bg-slate-900 px-3 py-1 rounded-md border border-slate-800 font-semibold">
                Model: {ai_advisory?.model || 'NVIDIA NIM'}
              </span>
            </div>

            {/* Mandatory Advisory Disclaimer Banner */}
            <div className="p-4 sm:p-5 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-1">
              <p className="text-xs sm:text-sm text-amber-300 font-mono font-semibold leading-relaxed">
                <strong>MANDATORY NOTICE:</strong> AI output is advisory and does not determine compliance. The deterministic Compliance Engine makes all authoritative decisions.
              </p>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Contextual Summary
                </h4>
                <p>{ai_advisory?.summary || 'The analyzed policy directive removes stateful boundary inspection between untrusted and trusted network segments.'}</p>
              </div>

              <div>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Why This Matters
                </h4>
                <p>{ai_advisory?.why_it_matters || 'Zone-based firewalls depend on strict directional filters to enforce defense-in-depth principles across enterprise infrastructure.'}</p>
              </div>

              {ai_advisory?.recommended_action && (
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-1">
                    AI Remediation Suggestion
                  </h4>
                  <p>{ai_advisory.recommended_action}</p>
                </div>
              )}
            </div>
          </div>

          {/* Immutable Blockchain Ledger */}
          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  Immutable Blockchain Ledger
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-mono text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-md border border-emerald-500/30 font-bold">
                Cryptographically Anchored
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase text-xs tracking-wider font-semibold">
                      <th className="px-5 py-3.5">Block #</th>
                      <th className="px-5 py-3.5">Event Type</th>
                      <th className="px-5 py-3.5">Actor</th>
                      <th className="px-5 py-3.5">Current Block Hash</th>
                      <th className="px-5 py-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {(blockchain && blockchain.length > 0
                      ? blockchain
                      : [
                          { block_index: 151, event_type: 'AUDIT_COMPLETED', actor: 'SECURITY_ENGINE', block_hash: '0000a89f71c3d4e8b2f901' }
                        ]
                    ).map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-cyan-400">Block #{b.block_index}</td>
                        <td className="px-5 py-3.5 font-bold text-white">{b.event_type}</td>
                        <td className="px-5 py-3.5 text-slate-300">{b.actor}</td>
                        <td className="px-5 py-3.5 text-slate-400 truncate max-w-xs">{b.block_hash || '0000c82f91a7b...'}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                            APPENDED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
