import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import TopHeader from './components/TopHeader';
import Sidebar from './components/Sidebar';
import SettingsDrawer from './components/SettingsDrawer';
import { ToastContainer } from './components/Toast';

import Overview from './pages/Overview';
import Audits from './pages/Audits';
import Findings from './pages/Findings';
import FindingDetail from './pages/FindingDetail';
import UnresolvedCases from './pages/UnresolvedCases';
import Reports from './pages/Reports';

export default function App() {
  const [location, setLocation] = useLocation();

  // Initialize sidebar open on desktop screens, collapsed on smaller screens
  const [isNavOpen, setIsNavOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [auditAction, setAuditAction] = useState(null);
  const [auditId, setAuditId] = useState(null);

  // Sync route changes to state
  useEffect(() => {
    if (location.startsWith('/findings/')) {
      const id = location.replace('/findings/', '');
      setSelectedFindingId(id ? parseInt(id, 10) || id : null);
    } else if (location === '/findings') {
      setSelectedFindingId(null);
    } else if (location.startsWith('/audits/')) {
      const id = location.replace('/audits/', '');
      setAuditId(id ? parseInt(id, 10) || id : null);
    }
  }, [location]);

  // Determine active tab or 404
  const getActiveTab = () => {
    if (location === '/' || location === '/overview') return 'overview';
    if (location.startsWith('/audits')) return 'audits';
    if (location.startsWith('/findings')) return 'findings';
    if (location.startsWith('/unresolved')) return 'unresolved';
    if (location.startsWith('/reports')) return 'reports';
    return '404';
  };

  const activeTab = getActiveTab();

  const handleNavigateTab = (tab, params = {}) => {
    if (params?.findingId) {
      setSelectedFindingId(params.findingId);
      setLocation(`/findings/${params.findingId}`);
      return;
    }

    if (params?.auditId) {
      setAuditId(params.auditId);
      setLocation(`/audits/${params.auditId}`);
      return;
    }

    if (params?.action === 'new') {
      setAuditAction('new');
      setLocation('/audits');
      return;
    }

    switch (tab) {
      case 'overview':
        setLocation('/');
        break;
      case 'audits':
        setAuditAction(null);
        setLocation('/audits');
        break;
      case 'findings':
        setSelectedFindingId(null);
        setLocation('/findings');
        break;
      case 'unresolved':
        setLocation('/unresolved');
        break;
      case 'reports':
        setLocation('/reports');
        break;
      default:
        setLocation('/');
    }
  };

  // Generate breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs = [];
    if (activeTab === 'overview') {
      crumbs.push({ label: 'Overview' });
    } else if (activeTab === 'audits') {
      crumbs.push({ label: 'Audits', onClick: () => handleNavigateTab('audits') });
      if (auditId) {
        crumbs.push({ label: `Audit #${auditId}`, isMono: true });
      }
    } else if (activeTab === 'findings') {
      crumbs.push({ label: 'Findings', onClick: () => handleNavigateTab('findings') });
      if (selectedFindingId) {
        crumbs.push({ label: `Finding #${selectedFindingId}`, isMono: true });
      }
    } else if (activeTab === 'unresolved') {
      crumbs.push({ label: 'Case Queue' });
    } else if (activeTab === 'reports') {
      crumbs.push({ label: 'Reports' });
    } else if (activeTab === '404') {
      crumbs.push({ label: '404 - Not Found' });
    }
    return crumbs;
  };

  const renderPage = () => {
    if (location.startsWith('/findings/') && selectedFindingId) {
      return (
        <FindingDetail
          findingId={selectedFindingId}
          onBack={() => {
            setSelectedFindingId(null);
            setLocation('/findings');
          }}
          onNavigateTab={handleNavigateTab}
        />
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            onNavigate={handleNavigateTab}
            onNavigateTab={handleNavigateTab}
            onSelectFinding={(id) => {
              setSelectedFindingId(id);
              setLocation(`/findings/${id}`);
            }}
          />
        );
      case 'audits':
        return (
          <Audits
            onNavigate={handleNavigateTab}
            onNavigateTab={handleNavigateTab}
            onSelectFinding={(id) => {
              setSelectedFindingId(id);
              setLocation(`/findings/${id}`);
            }}
            initialAction={auditAction}
            initialAuditId={auditId}
          />
        );
      case 'findings':
        return (
          <Findings
            selectedFindingId={selectedFindingId}
            onClearSelectedFinding={() => setSelectedFindingId(null)}
            onNavigate={handleNavigateTab}
            onNavigateTab={handleNavigateTab}
          />
        );
      case 'unresolved':
        return <UnresolvedCases onNavigate={handleNavigateTab} />;
      case 'reports':
        return <Reports onNavigateTab={handleNavigateTab} />;
      case '404':
      default:
        return (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto my-12 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm">
            <h2 className="text-2xl font-bold text-white">Route not found</h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              The requested path <code className="text-cyan-400 font-mono text-xs">{location}</code> does not exist in the NEXORA platform.
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleNavigateTab('overview')}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Return to Overview
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen max-h-screen w-screen max-w-full bg-[#06090F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      <TopHeader
        breadcrumbs={getBreadcrumbs()}
        isNavOpen={isNavOpen}
        onToggleNav={() => setIsNavOpen((prev) => !prev)}
      />

      {/* Main Responsive Layout: Inline Sidebar + Responsive Main Content */}
      <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden relative">
        <Sidebar
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Content Area: smoothly adjusts width beside sidebar */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto px-4 sm:px-8 lg:px-10 py-8 transition-all duration-300">
          <div className="max-w-7xl mx-auto w-full pb-16">
            {renderPage()}
          </div>
        </main>
      </div>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}
