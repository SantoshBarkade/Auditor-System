import React from 'react';
import { Menu } from 'lucide-react';

export default function TopHeader({
  breadcrumbs = [],
  isExpanded = false,
  onToggleSidebar = () => {}
}) {
  return (
    <header className="h-14 sticky top-0 z-20 bg-[#06090F]/90 backdrop-blur-md border-b border-slate-800/80 px-5 lg:px-8 flex items-center justify-between shrink-0 select-none">
      {/* Left: Hamburger & Clean Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          title={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-sm">
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
    </header>
  );
}
