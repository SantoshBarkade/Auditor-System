import React from 'react';
import {
  LayoutDashboard,
  Shield,
  Search,
  HelpCircle,
  FileText,
  Settings as SettingsIcon,
  X
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isExpanded,
  setIsExpanded,
  onOpenSettings
}) {
  const navItems = [
    { id: 'overview',   label: 'Overview',   icon: LayoutDashboard },
    { id: 'audits',     label: 'Audits',     icon: Shield },
    { id: 'findings',   label: 'Findings',   icon: Search },
    { id: 'unresolved', label: 'Unresolved', icon: HelpCircle, isAmber: true },
    { id: 'reports',    label: 'Reports',    icon: FileText },
  ];

  return (
    <>
      {/* Mobile Backdrop when expanded */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 bg-[#080C14] border-r border-slate-800/80 flex flex-col justify-between transition-all duration-200 select-none ${
          isExpanded ? 'w-64 p-4 shadow-2xl' : 'w-16 p-2.5 items-center'
        }`}
      >
        {/* Top: Logo & Nav */}
        <div className="space-y-6 w-full">
          {/* Brand Header — Clean, Iconic, No extra text */}
          <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} pt-1.5`}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-3.5 cursor-pointer text-left group focus:outline-none"
              title={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
            >
              {/* Custom Iconic NEXORA Hex-Shield Vector Logo */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-teal-400 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.2)] group-hover:shadow-[0_0_22px_rgba(6,182,212,0.4)] transition-all shrink-0">
                <div className="w-full h-full bg-[#080C14] rounded-[10px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 6L17 9V15L12 18L7 15V9L12 6Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                  </svg>
                </div>
              </div>

              {/* Clean NEXORA Brand Title (No subtitles or badges) */}
              {isExpanded && (
                <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                  NEXORA
                </span>
              )}
            </button>

            {isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="Collapse"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Primary Nav without numbers */}
          <nav className="space-y-2 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative group/nav">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center rounded-xl text-base font-semibold transition-all cursor-pointer ${
                      isExpanded
                        ? 'px-4 py-3'
                        : 'p-3 justify-center'
                    } ${
                      isActive
                        ? 'bg-slate-800/95 text-white font-bold border-l-4 border-cyan-400 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900/70 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          isActive
                            ? item.isAmber
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                            : item.isAmber
                            ? 'text-amber-500/80 group-hover:text-amber-400'
                            : 'text-slate-400 group-hover:text-cyan-300'
                        }`}
                      />
                      {isExpanded && <span className="truncate text-base">{item.label}</span>}
                    </div>
                  </button>

                  {/* Tooltip in collapsed mode */}
                  {!isExpanded && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover/nav:flex items-center px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white whitespace-nowrap z-50 pointer-events-none shadow-xl">
                      <span>{item.label}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Settings */}
        <div className="pt-4 border-t border-slate-800/70 w-full">
          <div className="relative group/set">
            <button
              onClick={onOpenSettings}
              className={`w-full flex items-center rounded-xl text-base font-semibold text-slate-400 hover:text-white hover:bg-slate-900/70 transition-colors cursor-pointer ${
                isExpanded ? 'px-4 py-3 space-x-3.5' : 'p-3 justify-center'
              }`}
            >
              <SettingsIcon className="w-5 h-5 shrink-0 text-slate-400" />
              {isExpanded && <span className="text-base font-semibold">Settings</span>}
            </button>
            {!isExpanded && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover/set:flex items-center px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white whitespace-nowrap z-50 pointer-events-none shadow-xl">
                <span>Settings</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
