import React, { useState, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  RefreshCw,
  Lock,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
  Shield,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../components/Toast';

export default function Reports({ selectedAuditId: initialAuditId = null, onNavigateTab }) {
  const [audits, setAudits] = useState([]);
  const [selectedAuditId, setSelectedAuditId] = useState(initialAuditId || null);
  const [auditDetail, setAuditDetail] = useState(null);
  const [posture, setPosture] = useState(null);
  const [findings, setFindings] = useState([]);
  const [blockchainInfo, setBlockchainInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState(null);

  // Load audit list and blockchain ledger on mount
  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [auditsData, blocksData] = await Promise.all([
          api.getAudits().catch(() => []),
          api.getBlockchain().catch(() => [])
        ]);

        if (Array.isArray(auditsData) && auditsData.length > 0) {
          setAudits(auditsData);
          const defaultId = initialAuditId || auditsData[0].id;
          setSelectedAuditId(defaultId);
        } else {
          setAudits([]);
          setSelectedAuditId(null);
        }

        if (Array.isArray(blocksData) && blocksData.length > 0) {
          setBlockchainInfo(blocksData[blocksData.length - 1]);
        } else {
          setBlockchainInfo(null);
        }
      } catch (err) {
        console.error('Failed to load reports init data:', err);
        setError('Failed to load audits or blockchain ledger from backend.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [initialAuditId]);

  // When selectedAuditId changes, fetch real posture & findings
  useEffect(() => {
    if (!selectedAuditId) {
      setAuditDetail(null);
      setPosture(null);
      setFindings([]);
      return;
    }

    async function loadAuditData(id) {
      setLoadingAudit(true);
      try {
        const [aRes, pRes, fRes] = await Promise.all([
          api.getAudit(id).catch(() => null),
          api.getAuditCompliancePosture(id).catch(() => null),
          api.getAuditFindings(id).catch(() => [])
        ]);
        if (aRes) setAuditDetail(aRes);
        if (pRes) setPosture(pRes);
        if (Array.isArray(fRes)) setFindings(fRes);
      } catch (err) {
        console.error('Error loading report audit data:', err);
      } finally {
        setLoadingAudit(false);
      }
    }

    loadAuditData(selectedAuditId);
  }, [selectedAuditId]);

  const activeAudit = auditDetail || audits.find((a) => a.id === selectedAuditId);

  // Compute honest metrics from posture and findings
  const complianceScore =
    posture?.overall_compliance_pct ??
    activeAudit?.compliance_score ??
    null;

  let totalControls = 0;
  let satisfiedControls = 0;
  let gapControls = 0;

  if (posture?.frameworks) {
    Object.values(posture.frameworks).forEach((fw) => {
      totalControls += fw.total_controls || 0;
      satisfiedControls += fw.satisfied_count || 0;
      gapControls += fw.gap_count || 0;
    });
  }

  const failCount = findings.length > 0 ? findings.length : gapControls > 0 ? gapControls : 0;
  const passCount = satisfiedControls > 0 ? satisfiedControls : Math.max(0, totalControls - failCount);
  const unresolvedCount = posture?.unresolved_count ?? findings.filter((f) => f.status === 'UNRESOLVED').length;

  const handleDownload = (type) => {
    if (!activeAudit?.id) {
      showToast('Select an audit first before downloading evidence packages.', 'error');
      return;
    }
    const auditId = activeAudit.id;
    let url = '';
    if (type === 'pdf') url = api.getReportPdfUrl(auditId);
    else if (type === 'csv') url = api.getReportCsvUrl(auditId);
    else if (type === 'json') url = api.getReportJsonUrl(auditId);

    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora_audit_${auditId}_report.${type}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${type.toUpperCase()} package for audit #${auditId}`, 'success');
  };

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 1. Page Header & Audit Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Reports & exports
          </h1>
          <p className="text-base sm:text-lg text-slate-300 mt-2 font-normal leading-relaxed">
            Export and verify your audit evidence packages and compliance records.
          </p>
        </div>

        {/* Audit Selector */}
        {audits.length > 0 && (
          <div className="shrink-0 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Target audit</label>
            <div className="relative min-w-[280px]">
              <select
                value={selectedAuditId || ''}
                onChange={(e) => setSelectedAuditId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-4 pr-10 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer hover:border-slate-700 transition-colors shadow-sm"
              >
                {audits.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-950 text-slate-100 font-mono text-sm">
                    Audit #{a.id} — {a.vendor || 'Cisco'} ({a.compliance_score != null ? `${a.compliance_score}%` : 'Pending'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800/80" />

      {/* Loading State */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="font-mono text-sm">Loading audit reports & blockchain ledger...</span>
        </div>
      ) : error ? (
        <div className="p-10 rounded-2xl bg-rose-950/20 border border-rose-900/50 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <div className="text-white font-semibold">Unable to load reports</div>
          <p className="text-sm text-rose-300/80 max-w-md mx-auto">{error}</p>
        </div>
      ) : audits.length === 0 ? (
        /* Honest Empty State when 0 Audits exist */
        <div className="p-16 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto text-cyan-400">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">No audits executed yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Run an audit first to generate and export executive reports, SIEM-compatible CSV datasets, and JSON cryptographic evidence packages.
            </p>
          </div>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('audits')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer shadow-sm"
            >
              <Shield className="w-4 h-4" />
              <span>Execute your first audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 2. EXECUTIVE POSTURE HIGHLIGHTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Audited Vendor
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {activeAudit?.vendor || 'Cisco'}
              </div>
              <div className="text-xs font-mono text-slate-400">
                Audit #{activeAudit?.id || '—'} · {activeAudit?.status || 'COMPLETED'}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Compliance score
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-white">
                {complianceScore !== null ? `${complianceScore}%` : '—'}
              </div>
              <div className="text-xs font-mono text-slate-400">
                {passCount} PASS · {failCount} FAIL · {unresolvedCount} UNRESOLVED
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Security gaps
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400">
                {failCount}
              </div>
              <div className="text-xs font-mono text-slate-400">
                Deterministic findings requiring remediation
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Ledger integrity
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                {blockchainInfo ? 'SEALED' : 'PENDING'}
              </div>
              <div className="text-xs font-mono text-slate-400">
                {blockchainInfo ? `Block #${blockchainInfo.block_index} anchored` : 'Awaiting audit seal'}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* 3. EVIDENCE PACKAGES SECTION */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">
              Evidence packages
            </h2>

            <div className="space-y-3">
              {/* PDF Package */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-colors shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25">
                      PDF
                    </span>
                    <h3 className="text-base font-semibold text-white">
                      Executive audit report
                    </h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Complete evidence package covering control statistics, regulatory gap mapping, and simulated remediation verification.
                  </p>
                </div>

                <button
                  onClick={() => handleDownload('pdf')}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF →</span>
                </button>
              </div>

              {/* CSV Package */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-colors shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                      CSV
                    </span>
                    <h3 className="text-base font-semibold text-white">
                      Findings and control results
                    </h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Tabular findings dataset formatted for SIEM ingestion, ticket dispatching, or spreadsheet compliance auditing.
                  </p>
                </div>

                <button
                  onClick={() => handleDownload('csv')}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CSV →</span>
                </button>
              </div>

              {/* JSON Package */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 transition-colors shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                      JSON
                    </span>
                    <h3 className="text-base font-semibold text-white">
                      Machine-readable audit evidence
                    </h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Complete AST facts, normalized security state trees, deterministic reasoning chains, and SHA-256 cryptographic signatures.
                  </p>
                </div>

                <button
                  onClick={() => handleDownload('json')}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON →</span>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80" />

          {/* 4. COMPLIANCE COVERAGE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Compliance coverage
              </h2>
              <span className="text-sm font-mono text-slate-400 font-medium">Authoritative Mapping</span>
            </div>

            {posture?.frameworks ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(posture.frameworks).map(([name, fw]) => (
                  <div
                    key={name}
                    className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-1.5 shadow-sm"
                  >
                    <div className="text-sm font-medium text-slate-300 truncate" title={name}>
                      {name}
                    </div>
                    <div
                      className={`text-2xl font-light font-mono ${
                        fw.compliance_pct >= 80
                          ? 'text-emerald-400'
                          : fw.compliance_pct >= 50
                          ? 'text-cyan-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {fw.compliance_pct}%
                    </div>
                    <div className="text-xs font-mono text-slate-400">
                      {fw.satisfied_count}/{fw.total_controls} controls
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-sm text-slate-400">
                Regulatory framework breakdown pending posture evaluation.
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80" />

          {/* 5. BLOCKCHAIN INTEGRITY SECTION */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">
              Blockchain integrity
            </h2>

            {blockchainInfo ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 font-mono text-sm shadow-sm">
                <div className="space-y-1">
                  <div className="text-slate-200 font-semibold text-sm sm:text-base">
                    Block #{blockchainInfo.block_index} · {blockchainInfo.event_type}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-400 break-all">
                    SHA-256: {blockchainInfo.block_hash}
                  </div>
                </div>

                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0 self-start sm:self-auto text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-semibold">Verified</span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-900/30 border border-slate-800/80 text-sm text-slate-400 font-mono">
                No blockchain blocks recorded yet. Audit execution will seal cryptographic blocks to the ledger.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
