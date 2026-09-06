import React, { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, FileCode, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function Reports() {
  const [audits, setAudits] = useState([]);
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAudits() {
      setLoading(true);
      try {
        const data = await api.getAudits();
        setAudits(data);
        if (data.length > 0) {
          setSelectedAuditId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load audits for reporting", err);
      } finally {
        setLoading(false);
      }
    }
    loadAudits();
  }, []);

  const selectedAudit = audits.find((a) => a.id === selectedAuditId);

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Audit Reporting & Export</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Generate formal Executive Reports, SIEM-ingestible telemetry, and structured cryptographic audit trails.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200">
        {/* LEFT COLUMN: Audit Selector */}
        <div className="lg:col-span-1 bg-slate-50 flex flex-col">
          <div className="p-4 bg-slate-100 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Target Audit</span>
          </div>
          <div className="flex-1 flex flex-col max-h-[600px] overflow-y-auto">
            {audits.map((a) => {
              const isSelected = selectedAuditId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAuditId(a.id)}
                  className={`p-5 text-left border-b border-slate-200 transition-colors flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-white border-l-4 border-l-slate-900'
                      : 'bg-slate-50 hover:bg-white border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Audit #{a.id}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-200 text-slate-700 px-2 py-0.5">{a.vendor}</span>
                  </div>
                  <div className={`text-sm font-bold tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{a.stage}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Risk: <span className="font-mono text-slate-900">{a.risk_score}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Export Options */}
        <div className="lg:col-span-3 bg-white flex flex-col">
          {selectedAudit ? (
            <div className="flex-1 flex flex-col">
              <div className="p-8 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight mb-1">Target: Audit #{selectedAudit.id} ({selectedAudit.vendor})</h3>
                  <p className="text-sm text-slate-400 font-mono">Status: {selectedAudit.stage} | Risk Score: {selectedAudit.risk_score}</p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200">
                {/* PDF */}
                <div className="bg-white p-8 flex flex-col justify-between group hover:bg-slate-50 transition-colors">
                  <div className="space-y-6">
                    <div className="w-12 h-12 border border-slate-200 flex items-center justify-center bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">Executive PDF</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Complete multi-page audit report with executive summary, risk index, line-by-line evidence, and compliance status.
                      </p>
                    </div>
                  </div>
                  <a
                    href={api.getReportPdfUrl(selectedAudit.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-bold uppercase tracking-widest text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    <span>Download PDF</span>
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                {/* CSV */}
                <div className="bg-white p-8 flex flex-col justify-between group hover:bg-slate-50 transition-colors">
                  <div className="space-y-6">
                    <div className="w-12 h-12 border border-slate-200 flex items-center justify-center bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">Findings CSV</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Structured CSV export suitable for SIEM ingestion, IT ticketing import (Jira/ServiceNow), or spreadsheet analysis.
                      </p>
                    </div>
                  </div>
                  <a
                    href={api.getReportCsvUrl(selectedAudit.id)}
                    className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-bold uppercase tracking-widest text-slate-900 hover:text-emerald-600 transition-colors"
                  >
                    <span>Download CSV</span>
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                {/* JSON */}
                <div className="bg-white p-8 flex flex-col justify-between group hover:bg-slate-50 transition-colors">
                  <div className="space-y-6">
                    <div className="w-12 h-12 border border-slate-200 flex items-center justify-center bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">Audit JSON</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Complete JSON payload including normalized objects, mathematical risk breakdown, and blockchain verification cryptographic hashes.
                      </p>
                    </div>
                  </div>
                  <a
                    href={api.getReportJsonUrl(selectedAudit.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-bold uppercase tracking-widest text-slate-900 hover:text-purple-600 transition-colors"
                  >
                    <span>Download JSON</span>
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-12 flex items-center justify-center text-center">
              <div className="space-y-2">
                <div className="text-sm font-bold uppercase tracking-widest text-slate-900">No Audits Found</div>
                <div className="text-xs text-slate-500">Run an audit first to enable report generation.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
