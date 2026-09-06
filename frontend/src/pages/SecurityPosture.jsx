import React, { useEffect, useState } from 'react';
import { ShieldAlert, Activity, TrendingUp, ShieldCheck, Database, Server, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar
} from 'recharts';
import { api } from '../services/api';

const RADAR_DIMENSIONS = [
  { subject: 'Access Control',    key: 'access_control'    },
  { subject: 'Network Security',  key: 'network_security'  },
  { subject: 'Data Protection',   key: 'data_protection'   },
  { subject: 'Incident Response', key: 'incident_response' },
  { subject: 'Endpoint Security', key: 'endpoint_security' },
  { subject: 'Audit & Logging',   key: 'audit_logging'     },
];

function deriveRadarFromFindings(findings = []) {
  const base = { access_control: 100, network_security: 100, data_protection: 100, incident_response: 100, endpoint_security: 100, audit_logging: 100 };
  const categoryMap = {
    'Authentication':     'access_control',
    'Access Control':     'access_control',
    'Network':            'network_security',
    'Encryption':         'data_protection',
    'Data':               'data_protection',
    'Logging':            'audit_logging',
    'Audit':              'audit_logging',
    'Monitoring':         'incident_response',
    'Endpoint':           'endpoint_security',
  };
  findings.forEach(f => {
    if (f.status === 'VERIFIED') return;
    const sev = f.severity || 'LOW';
    const penalty = sev === 'CRITICAL' ? 25 : sev === 'HIGH' ? 15 : sev === 'MEDIUM' ? 8 : 3;
    const cat = f.category || '';
    let dimKey = null;
    for (const [kw, dk] of Object.entries(categoryMap)) {
      if (cat.toLowerCase().includes(kw.toLowerCase())) { dimKey = dk; break; }
    }
    if (dimKey) base[dimKey] = Math.max(0, base[dimKey] - penalty);
  });
  return RADAR_DIMENSIONS.map(d => ({ subject: d.subject, A: base[d.key], fullMark: 100 }));
}

function buildTrendFromAudits(audits = []) {
  if (!audits.length) {
    return [
      { name: 'Run 1', risk: 85, compliance: 40 },
      { name: 'Run 2', risk: 78, compliance: 55 },
      { name: 'Run 3', risk: 65, compliance: 65 },
      { name: 'Run 4', risk: 42, compliance: 82 },
      { name: 'Run 5', risk: 25, compliance: 95 },
    ];
  }
  return audits.slice(-8).map((a, i) => ({
    name: `#${a.id}`,
    risk: a.risk_score || 0,
    compliance: a.compliance_score || 0,
  }));
}

export default function SecurityPosture() {
  const [summary, setSummary] = useState(null);
  const [allFindings, setAllFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const dash = await api.getDashboardSummary();
        setSummary(dash);

        // Gather findings from recent audits for radar
        const audits = dash?.recent_audits || [];
        const fAll = [];
        for (const a of audits.slice(0, 3)) {
          try {
            const f = await api.getAuditFindings(a.id);
            fAll.push(...f);
          } catch (_) {}
        }
        setAllFindings(fAll);
      } catch (err) {
        console.error('SecurityPosture load failed', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const trendData = buildTrendFromAudits(summary?.recent_audits || []);
  const radarData = deriveRadarFromFindings(allFindings);

  const totalFindings = (summary?.critical_findings || 0) + (summary?.high_findings || 0) +
    (summary?.medium_findings || 0) + (summary?.low_findings || 0);
  const avgRisk = summary?.average_risk_score ?? 0;
  const critCount = summary?.critical_findings ?? 0;
  const compPct = summary?.overall_compliance_pct ?? 0;

  return (
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Posture Analytics</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Real-time multi-vendor security posture derived from live deterministic audit results.
          </p>
        </div>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-200 border border-slate-200">
        <div className="p-8 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Risk Index</span>
            <ShieldCheck className={`w-5 h-5 ${avgRisk >= 70 ? 'text-red-500' : avgRisk >= 45 ? 'text-amber-500' : 'text-emerald-600'}`} />
          </div>
          <div className={`text-5xl font-bold font-mono tracking-tight ${avgRisk >= 70 ? 'text-red-600' : avgRisk >= 45 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {avgRisk}<span className="text-2xl text-slate-400">/100</span>
          </div>
        </div>

        <div className="p-8 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Critical Findings</span>
            <Server className={`w-5 h-5 ${critCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
          </div>
          <div className={`text-5xl font-bold font-mono tracking-tight ${critCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {critCount}
          </div>
        </div>

        <div className="p-8 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Violations</span>
            <ShieldAlert className="w-5 h-5 text-slate-500" />
          </div>
          <div className="text-5xl font-bold font-mono text-slate-900 tracking-tight">{totalFindings}</div>
        </div>

        <div className="p-8 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compliance Rate</span>
            <Database className={`w-5 h-5 ${compPct >= 80 ? 'text-emerald-600' : 'text-amber-500'}`} />
          </div>
          <div className={`text-5xl font-bold font-mono tracking-tight ${compPct >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {totalFindings === 0 ? <span className="text-slate-300">—</span> : `${compPct}%`}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-slate-200 border border-slate-200">
        <div className="bg-white p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Risk vs Compliance</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {summary?.recent_audits?.length ? 'Per-Audit Trend' : 'Illustrative Trend'}
              </p>
            </div>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0', fontSize: '12px', padding: '12px' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="risk" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" name="Risk Score" />
                <Area type="monotone" dataKey="compliance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorComp)" name="Compliance %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center space-x-8 text-[10px] font-bold uppercase tracking-widest mt-6">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-slate-900" /><span className="text-slate-600">Risk Score</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-emerald-500" /><span className="text-slate-600">Compliance %</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest">Capability Maturity</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {allFindings.length > 0 ? 'Derived from live findings' : 'No audit data yet'}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} />
                <Radar name="Maturity Score" dataKey="A" stroke="#0f172a" strokeWidth={2} fill="#0f172a" fillOpacity={0.06} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0', fontSize: '12px', padding: '12px' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
