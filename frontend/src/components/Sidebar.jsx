import React from 'react';
import {
  LayoutDashboard,
  Shield,
  Search,
  HelpCircle,
  FileText,
  Settings as SettingsIcon,
  X,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({
  isOpen = true,
  onClose = () => {},
  activeTab = 'overview',
  onNavigateTab = () => {},
  onOpenSettings = () => {}
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'audits', label: 'Audits', icon: Shield },
    { id: 'findings', label: 'Findings', icon: Search },
    { id: 'unresolved', label: 'Unresolved', icon: HelpCircle, isAmber: true },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <>
      {/* Mobile-only backdrop (hidden on desktop so screen content is never covered) */}
      <div
        onClick={onClose}
        className={`md:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Responsive Sidebar:
          - Desktop (md+): Inline flex column, pushes and resizes main screen, smoothly collapses to w-0
          - Mobile (<md): Slide-over drawer
      */}
      <aside
        className={`
          md:relative md:translate-x-0 md:h-full
          fixed left-0 top-0 bottom-0 z-50 md:z-10
          bg-[#080C14] border-r border-slate-800/80
          flex flex-col justify-between select-none
          transition-all duration-300 ease-in-out shrink-0
          overflow-y-auto overflow-x-hidden
          ${
            isOpen
              ? 'w-64 lg:w-72 p-5 opacity-100 translate-x-0 pointer-events-auto'
              : 'md:w-0 md:p-0 md:border-r-0 md:opacity-0 md:pointer-events-none -translate-x-full md:translate-x-0'
          }
        `}
      >
        {/* Top: Brand Header & Navigation List */}
        <div className={`space-y-6 w-full ${isOpen ? 'block' : 'hidden md:hidden'}`}>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-3.5">
              {/* Custom Iconic NEXORA Hex-Shield Vector Logo */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-teal-400 p-[1.5px] shadow-[0_0_15px_rgba(6,182,212,0.25)] shrink-0">
                <div className="w-full h-full bg-[#080C14] rounded-[10px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L20.5 7V17L12 22L3.5 17V7L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 6L17 9V15L12 18L7 15V9L12 6Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                  </svg>
                </div>
              </div>

              {/* Clean NEXORA Brand Title */}
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                NEXORA
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 font-mono">
            Navigation Workspace
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigateTab(item.id);
                    // On mobile, close drawer after selection; on desktop keep open
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-base font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800/95 text-white font-bold border-l-4 border-cyan-400 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border-l-4 border-transparent'
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
                          ? 'text-amber-500/80'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate text-base">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Settings */}
        <div className={`pt-4 border-t border-slate-800/80 w-full space-y-2 ${isOpen ? 'block' : 'hidden md:hidden'}`}>
          <button
            onClick={() => {
              onOpenSettings();
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                onClose();
              }
            }}
            className="w-full flex items-center px-4 py-3 rounded-xl text-base font-semibold text-slate-400 hover:text-white hover:bg-slate-900/80 transition-colors cursor-pointer space-x-3.5"
          >
            <SettingsIcon className="w-5 h-5 shrink-0 text-slate-400" />
            <span className="text-base font-semibold">Settings</span>
          </button>
          <div className="text-xs font-mono text-slate-500 px-4">
            NEXORA Auditor • SIH26155
          </div>
        </div>
      </aside>
    </>
  );
}
