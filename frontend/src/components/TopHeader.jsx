import React, { useEffect } from 'react';
import { Menu } from 'lucide-react';

export default function TopHeader({
  breadcrumbs = [],
  isNavOpen = false,
  onToggleNav = () => {}
}) {
  // Global keyboard shortcut: 'm' opens/toggles navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === 'm' || e.key === 'M') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        onToggleNav();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleNav]);

  return (
    <header className="h-14 shrink-0 z-30 bg-[#06090F]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between select-none">
      {/* Left: Three lines toggle icon button & Clean Breadcrumbs */}
      <div className="flex items-center space-x-3.5 sm:space-x-4">
        <button
          onClick={onToggleNav}
          className={`p-2 rounded-lg border transition-all cursor-pointer group flex items-center justify-center shrink-0 ${
            isNavOpen
              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border-slate-800/80'
          }`}
          title={isNavOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
        </button>

        <div className="flex items-center space-x-2 text-sm font-sans">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            NEXORA
          </span>

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                <span className="text-slate-600 font-normal">/</span>
                <span
                  onClick={crumb.onClick}
                  className={`text-sm ${
                    isLast
                      ? 'text-white font-semibold'
                      : crumb.onClick
                      ? 'text-slate-400 hover:text-slate-100 cursor-pointer transition-colors font-medium'
                      : 'text-slate-400 font-medium'
                  } ${crumb.isMono ? 'font-mono text-xs text-cyan-400 font-semibold' : ''}`}
                >
                  {crumb.label}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right: Security Status Pill */}
      <div className="flex items-center space-x-3">
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-semibold text-slate-200">Engine Deterministic</span>
        </div>
      </div>
    </header>
  );
}
