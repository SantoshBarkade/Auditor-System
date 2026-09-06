import React, { useState, useEffect } from 'react';
import { CheckSquare, ShieldCheck, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function Compliance() {
  const [posture, setPosture] = useState(null);
  const [selectedFramework, setSelectedFramework] = useState('NIST CSF 2.0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompliance() {
      setLoading(true);
      try {
        const audits = await api.getAudits();
        if (audits.length > 0) {
          const latest = audits[0];
          const data = await api.getAuditCompliancePosture(latest.id);
          setPosture(data);
        }
      } catch (err) {
        console.error("Failed to load compliance posture", err);
      } finally {
        setLoading(false);
      }
    }
    loadCompliance();
  }, []);

  const frameworks = [
    'NIST CSF 2.0',
    'NIST SP 800-53 Rev. 5',
    'CIS Benchmarks',
    'ISO/IEC 27001:2022',
    'PCI DSS v4.0.1',
    'MITRE ATT&CK'
  ];

  const currentFwData = posture?.frameworks?.[selectedFramework];

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Compliance Matrix</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Deterministic mapping of configuration state to global cybersecurity frameworks and hardening baselines.
          </p>
        </div>

        <div className="shrink-0 flex items-center space-x-6 border-l-4 border-emerald-500 bg-emerald-50 px-6 py-4">
          <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest">Aggregate Posture</div>
          <div className="text-4xl font-bold font-mono text-emerald-600 tracking-tight">
            {posture?.overall_compliance_pct || 100}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-slate-200 border border-slate-200">
        
        {/* LEFT COLUMN: Framework Selector */}
        <div className="lg:col-span-1 bg-slate-50 flex flex-col">
          <div className="p-4 bg-slate-100 border-b border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available Frameworks</span>
          </div>
          <div className="flex-1 flex flex-col">
            {frameworks.map((fw) => {
              const isSelected = selectedFramework === fw;
              const fwData = posture?.frameworks?.[fw];
              const pct = fwData?.compliance_pct !== undefined ? fwData.compliance_pct : 100;
              return (
                <button
                  key={fw}
                  onClick={() => setSelectedFramework(fw)}
                  className={`p-5 text-left border-b border-slate-200 transition-colors flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-white border-l-4 border-l-slate-900'
                      : 'bg-slate-50 hover:bg-white border-l-4 border-l-transparent'
                  }`}
                >
                  <div className={`text-sm font-bold tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{fw}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {fwData?.gap_count || 0} Gaps
                    </span>
                    <span className={`text-xs font-bold font-mono ${pct >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {pct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Framework Details */}
        <div className="lg:col-span-3 bg-white flex flex-col">
          
          <div className="p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-2xl font-bold text-slate-900">{selectedFramework}</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-900 text-white px-2 py-0.5">Prototype Scope</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
                Evaluates configuration syntax controls against {selectedFramework} baseline hardening specifications.
              </p>
            </div>

            <div className="flex items-center space-x-8">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Controls</div>
                <div className="text-2xl font-mono font-bold text-slate-900">{currentFwData?.total_controls || 4}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Satisfied</div>
                <div className="text-2xl font-mono font-bold text-emerald-600">{currentFwData?.satisfied_count || 4}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Gaps Detected</div>
                <div className="text-2xl font-mono font-bold text-rose-600">{currentFwData?.gap_count || 0}</div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest">
                <span className="text-slate-500">Framework Posture</span>
                <span className="text-slate-900 font-mono">{currentFwData?.compliance_pct || 100}%</span>
              </div>
              <div className="w-full h-1 bg-slate-200">
                <div
                  className="h-full bg-slate-900 transition-all duration-500"
                  style={{ width: `${currentFwData?.compliance_pct || 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block pb-2 border-b border-slate-200">
                Evaluation Gaps
              </span>

              {currentFwData?.gaps?.length > 0 ? (
                <div className="space-y-px bg-slate-200 border border-slate-200">
                  {currentFwData.gaps.map((gap, i) => (
                    <div key={i} className="p-5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-700 px-2 py-0.5 border border-rose-200">
                            NON-COMPLIANT
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-900">{gap.control_id}</span>
                          <span className="text-slate-400 hidden sm:inline">—</span>
                          <span className="text-sm font-bold text-slate-700">{gap.name}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Violated by finding: <strong className="text-slate-700">{gap.finding_title}</strong> <span className="font-mono">({gap.rule_id})</span>
                        </p>
                      </div>
                      
                      <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 border border-rose-200 px-3 py-1.5 shrink-0 text-center">
                        STATUS: GAP
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-1">Baseline Controls Satisfied</h4>
                    <p className="text-xs text-slate-500">No deterministic findings violate {selectedFramework} controls.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
