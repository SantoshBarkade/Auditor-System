import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import InvestigationDrawer from './InvestigationDrawer';

export default function Findings({ selectedFindingId, onClearSelectedFinding }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeDrawerId, setActiveDrawerId] = useState(selectedFindingId || null);

  useEffect(() => {
    if (selectedFindingId) {
      setActiveDrawerId(selectedFindingId);
    }
  }, [selectedFindingId]);

  async function loadFindings() {
    setLoading(true);
    try {
      const audits = await api.getAudits();
      const findingsPromises = audits.map(a => api.getAuditFindings(a.id));
      const findingsLists = await Promise.all(findingsPromises);
      const allFindings = findingsLists.flat();
      const unique = Array.from(new Map(allFindings.map(item => [item.id, item])).values());
      setFindings(unique);
    } catch (err) {
      console.error("Failed to load findings", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFindings();
  }, []);

  const filteredFindings = findings.filter((f) => {
    const matchSearch =
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.rule_id.toLowerCase().includes(search.toLowerCase()) ||
      f.evidence.toLowerCase().includes(search.toLowerCase());

    const matchVendor = vendorFilter === 'ALL' || f.vendor === vendorFilter;
    const matchSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
    const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;

    return matchSearch && matchVendor && matchSeverity && matchStatus;
  });

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Findings Register</h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Authoritative, deterministic analysis of configuration drift and security posture violations across the network perimeter.
          </p>
        </div>
        <button
          onClick={loadFindings}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Synchronize Data</span>
        </button>
      </div>

      {/* Filter Rail (Cardless) */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4">
        {/* Search */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by rule, title, or evidence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-none rounded-none pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all font-mono shadow-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-sm font-medium text-slate-700">
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="bg-transparent border-b border-slate-300 rounded-none px-2 py-2 focus:outline-none focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">All Vendors</option>
            <option value="Cisco">Cisco</option>
            <option value="Fortinet">Fortinet</option>
            <option value="Juniper">Juniper</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-transparent border-b border-slate-300 rounded-none px-2 py-2 focus:outline-none focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-b border-slate-300 rounded-none px-2 py-2 focus:outline-none focus:border-slate-900 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="APPROVED">Approved</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Editorial Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b-2 border-slate-900 text-slate-900 text-xs uppercase tracking-widest font-bold">
            <tr>
              <th className="py-4 px-2">Severity</th>
              <th className="py-4 px-2">Rule ID</th>
              <th className="py-4 px-2">Finding Title</th>
              <th className="py-4 px-2">Vendor</th>
              <th className="py-4 px-2">Risk</th>
              <th className="py-4 px-2">Status</th>
              <th className="py-4 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-500 font-medium">
                  <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mx-auto mb-3" />
                  Querying deterministic engine...
                </td>
              </tr>
            ) : filteredFindings.length > 0 ? (
              filteredFindings.map((f) => {
                const isCrit = f.severity === 'CRITICAL';
                const isHigh = f.severity === 'HIGH';

                return (
                  <tr key={f.id} className="hover:bg-slate-50 group cursor-pointer transition-colors" onClick={() => setActiveDrawerId(f.id)}>
                    <td className="py-4 px-2">
                      <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        isCrit ? 'bg-slate-900 text-white' : 
                        isHigh ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-4 px-2 font-mono font-medium text-slate-600 text-xs">{f.rule_id}</td>
                    <td className="py-4 px-2 font-medium text-slate-900 max-w-sm truncate">{f.title}</td>
                    <td className="py-4 px-2">
                      <span className="text-xs font-medium text-slate-500 border border-slate-200 px-2 py-1">{f.vendor}</span>
                    </td>
                    <td className="py-4 px-2 font-mono font-bold">
                      <span className={f.risk_score >= 70 ? 'text-slate-900' : 'text-slate-500'}>
                        {f.risk_score}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        f.status === 'VERIFIED' ? 'text-emerald-600' :
                        f.status === 'APPROVED' ? 'text-blue-600' :
                        f.status === 'REJECTED' ? 'text-rose-600' :
                        'text-slate-500'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end space-x-1 text-slate-400 group-hover:text-slate-900 transition-colors">
                        <span className="text-xs font-semibold uppercase tracking-wider">Investigate</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-500 font-medium border-b border-slate-200">
                  No findings match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Drawer */}
      <InvestigationDrawer
        findingId={activeDrawerId}
        isOpen={!!activeDrawerId}
        onClose={() => {
          setActiveDrawerId(null);
          if (onClearSelectedFinding) onClearSelectedFinding();
        }}
        onRefresh={loadFindings}
      />
    </div>
  );
}
