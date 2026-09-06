import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Terminal,
  ExternalLink,
  AlertCircle,
  FileCode,
  Plus
} from 'lucide-react';
import { useLocation } from 'wouter';
import { api } from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import FindingDetail from './FindingDetail';

export default function Findings({
  selectedFindingId: propFindingId = null,
  onClearSelectedFinding,
  onNavigate,
  onNavigateTab
}) {
  const [, setLocation] = useLocation();
  const [selectedFindingId, setSelectedFindingId] = useState(propFindingId);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');

  useEffect(() => {
    setSelectedFindingId(propFindingId);
  }, [propFindingId]);

  const loadFindings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFindings();
      if (Array.isArray(data)) {
        setFindings(data);
      } else {
        setFindings([]);
      }
    } catch (err) {
      console.error('Failed to load findings:', err);
      setError(err);
      setFindings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, []);

  const handleSelectFinding = (id) => {
    setSelectedFindingId(id);
    setLocation(`/findings/${id}`);
  };

  const handleClearSelectedFinding = () => {
    setSelectedFindingId(null);
    if (typeof onClearSelectedFinding === 'function') onClearSelectedFinding();
    setLocation('/findings');
  };

  // If a finding is selected, show detail view
  if (selectedFindingId) {
    return (
      <FindingDetail
        findingId={selectedFindingId}
        onBack={handleClearSelectedFinding}
        onNavigateTab={onNavigateTab}
      />
    );
  }

  const filteredFindings = findings.filter((f) => {
    const titleMatch = (f.title || '').toLowerCase().includes(search.toLowerCase());
    const ruleMatch = (f.rule_id || '').toLowerCase().includes(search.toLowerCase());
    const evidenceMatch = (f.evidence || '').toLowerCase().includes(search.toLowerCase());
    const matchSearch = titleMatch || ruleMatch || evidenceMatch;

    const matchSeverity =
      severityFilter === 'ALL'
        ? true
        : f.severity?.toUpperCase() === severityFilter.toUpperCase();

    const matchVendor =
      vendorFilter === 'ALL'
        ? true
        : f.vendor?.toLowerCase() === vendorFilter.toLowerCase();

    return matchSearch && matchSeverity && matchVendor;
  });

  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const openCount = findings.filter((f) => f.status === 'OPEN').length;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Security findings
            </h1>
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
              {findings.length} TOTAL
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-300 mt-1.5 font-normal leading-relaxed">
            Deterministic control failures and security violations extracted directly from audited device configurations.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => setLocation('/audits')}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New audit</span>
          </button>
          <button
            onClick={loadFindings}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh findings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-base text-rose-300">Unable to load security findings</div>
              <div className="text-sm text-rose-400/90 mt-0.5 font-mono">{error.message || 'API connection failed'}</div>
            </div>
          </div>
          <button
            onClick={loadFindings}
            className="px-3 py-1.5 text-xs font-semibold bg-rose-800/40 hover:bg-rose-800/60 text-rose-100 rounded border border-rose-700/50 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search findings by title, rule ID, or syntax evidence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-950 border border-slate-800/90 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-sans"
          />
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3.5 py-2.5 text-sm font-medium bg-slate-950 border border-slate-800/90 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical ({criticalCount})</option>
            <option value="HIGH">High ({highCount})</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3.5 py-2.5 text-sm font-medium bg-slate-950 border border-slate-800/90 rounded-lg text-slate-300 focus:outline-none focus:border-cyan-500/60"
          >
            <option value="ALL">All Vendors</option>
            <option value="cisco">Cisco</option>
            <option value="fortinet">Fortinet</option>
            <option value="juniper">Juniper</option>
          </select>
        </div>
      </div>

      {/* 3. Findings Table or Empty State */}
      {loading && findings.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-900/40 border border-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : findings.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-12 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-xl font-bold text-white">No findings recorded</h3>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              No configuration findings exist in the database. Run an audit on a network configuration to detect security vulnerabilities.
            </p>
          </div>
          <button
            onClick={() => setLocation('/audits')}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Execute new audit</span>
          </button>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-8 text-center space-y-2">
          <div className="text-slate-300 font-semibold text-base">No findings match your filters</div>
          <p className="text-sm text-slate-500">Try adjusting your search term or severity filter.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold text-xs bg-slate-900/50">
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Rule ID & Title</th>
                  <th className="px-5 py-4">Vendor / Line</th>
                  <th className="px-5 py-4">Evidence</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredFindings.map((f) => {
                  const line = f.line_numbers?.[0] || f.line_number || '?';
                  return (
                    <tr
                      key={f.id}
                      onClick={() => handleSelectFinding(f.id)}
                      className="hover:bg-slate-900/60 cursor-pointer transition-colors group"
                    >
                      {/* Severity */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                            f.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : f.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {f.severity || 'HIGH'}
                        </span>
                      </td>

                      {/* Rule ID & Title */}
                      <td className="px-5 py-4">
                        <div className="font-mono text-sm font-semibold text-cyan-400 group-hover:text-cyan-300">
                          {f.rule_id}
                        </div>
                        <div className="text-sm font-medium text-slate-100 max-w-sm sm:max-w-md truncate mt-0.5">
                          {f.title}
                        </div>
                      </td>

                      {/* Vendor / Line */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-300 capitalize">{f.vendor || 'Network'}</span>
                        <span className="text-slate-600 mx-1.5">•</span>
                        <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Line {line}
                        </span>
                      </td>

                      {/* Evidence */}
                      <td className="px-5 py-4 max-w-xs truncate">
                        <code className="font-mono text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                          {f.evidence || 'Configuration directive'}
                        </code>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={f.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className="text-slate-400 group-hover:text-cyan-400 font-semibold transition-colors text-sm inline-flex items-center space-x-1.5">
                          <span>Inspect</span>
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
