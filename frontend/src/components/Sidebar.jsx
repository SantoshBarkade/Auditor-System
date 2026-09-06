import React from 'react';
import {
  LayoutDashboard,
  FileCode2,
  GitFork,
  ShieldAlert,
  CheckSquare,
  Blocks,
  FileText,
  Sliders,
  Terminal,
  Activity,
  Layers,
  Wrench
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'posture', label: 'Security Posture', icon: Activity },
    { id: 'configurations', label: 'Configurations', icon: FileCode2 },
    { id: 'parity', label: 'Vendor Parity', icon: Layers },
    { id: 'pipeline', label: 'Audit Pipeline', icon: GitFork },
    { id: 'findings', label: 'Findings', icon: ShieldAlert },
    { id: 'remediation', label: 'Remediation Center', icon: Wrench },
    { id: 'compliance', label: 'Compliance Matrix', icon: CheckSquare },
    { id: 'blockchain', label: 'Blockchain Ledger', icon: Blocks },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'settings', label: 'Settings & AI', icon: Sliders },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col justify-between p-4 h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm transition-all ${isActive
                  ? 'bg-white text-indigo-700 font-semibold shadow-sm border border-slate-200'
                  : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span>SIH 2026 PROTOTYPE</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Vendors: Cisco, Fortinet, Juniper. Deterministic Security + SHA-256 Chain.
        </p>
      </div>
    </aside>
  );
}
