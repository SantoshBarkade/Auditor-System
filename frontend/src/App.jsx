import React, { useState } from 'react';
import { ToastContainer } from './components/Toast';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import SettingsDrawer from './components/SettingsDrawer';

import Overview from './pages/Overview';
import Audits from './pages/Audits';
import Findings from './pages/Findings';
import UnresolvedCases from './pages/UnresolvedCases';
import Reports from './pages/Reports';

export default function App() {
  // 5 primary navigation destinations: 'overview', 'audits', 'findings', 'unresolved', 'reports'
  const [activeTab, setActiveTab] = useState('overview');
  const [currentAuditId, setCurrentAuditId] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [auditAction, setAuditAction] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Navigation handlers
  const handleSelectAudit = (auditId) => {
    setCurrentAuditId(auditId);
    setAuditAction(null);
    setActiveTab('audits');
  };

  const handleSelectFinding = (findingId) => {
    setSelectedFindingId(findingId);
    setActiveTab('findings');
  };

  const handleSelectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setActiveTab('unresolved');
  };

  const handleNavigateTab = (tab, context = {}) => {
    if (context?.auditId !== undefined) setCurrentAuditId(context.auditId);
    if (context?.findingId !== undefined) setSelectedFindingId(context.findingId);
    if (context?.caseId !== undefined) setSelectedCaseId(context.caseId);
    if (context?.action) {
      setAuditAction(context.action);
    } else {
      setAuditAction(null);
    }
    setActiveTab(tab);
  };

  // Generate clean hierarchical breadcrumbs
  const getBreadcrumbs = () => {
    switch (activeTab) {
      case 'overview':
        return [{ label: 'Overview' }];
      case 'audits': {
        const crumbs = [{ label: 'Audits', onClick: () => { setAuditAction(null); } }];
        if (currentAuditId) {
          crumbs.push({ label: `Audit #${currentAuditId}`, isMono: true });
        }
        return crumbs;
      }
      case 'findings': {
        const crumbs = [{ label: 'Findings', onClick: () => setSelectedFindingId(null) }];
        if (selectedFindingId) {
          crumbs.push({ label: `Finding #${selectedFindingId}`, isMono: true });
        }
        return crumbs;
      }
      case 'unresolved': {
        const crumbs = [{ label: 'Unresolved', onClick: () => setSelectedCaseId(null) }];
        if (selectedCaseId) {
          crumbs.push({ label: `Case #${selectedCaseId}`, isMono: true });
        }
        return crumbs;
      }
      case 'reports': {
        const crumbs = [{ label: 'Reports' }];
        if (currentAuditId) {
          crumbs.push({ label: `Audit #${currentAuditId}`, isMono: true });
        }
        return crumbs;
      }
      default:
        return [{ label: 'Auditor' }];
    }
  };

  return (
    <div className="min-h-screen bg-[#06090F] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <ToastContainer />

      {/* System Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <div className="flex h-screen overflow-hidden">
        {/* Fixed Collapsed Rail (64px) / Expandable Drawer (240px) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab !== 'findings') setSelectedFindingId(null);
            if (tab !== 'unresolved') setSelectedCaseId(null);
            if (tab !== 'audits') setAuditAction(null);
            setActiveTab(tab);
          }}
          isExpanded={isSidebarExpanded}
          setIsExpanded={setIsSidebarExpanded}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Main Application Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#070A11] transition-all duration-200 ${
            isSidebarExpanded ? 'lg:pl-60' : 'pl-16'
          }`}
        >
          {/* Minimal Sticky Topbar */}
          <TopHeader
            breadcrumbs={getBreadcrumbs()}
            isExpanded={isSidebarExpanded}
            onToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)}
          />

          {/* Independently Scrollable Workspace with Intelligent Max Width */}
          <main className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 relative">
            <div className="max-w-6xl mx-auto">
              {activeTab === 'overview' && (
                <Overview
                  onNavigate={handleNavigateTab}
                  onNavigateTab={handleNavigateTab}
                  onSelectAudit={handleSelectAudit}
                  onSelectFinding={handleSelectFinding}
                  onSelectCase={handleSelectCase}
                />
              )}

              {activeTab === 'audits' && (
                <Audits
                  initialAuditId={currentAuditId}
                  initialAction={auditAction}
                  onSelectFinding={handleSelectFinding}
                  onNavigate={handleNavigateTab}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === 'findings' && (
                <Findings
                  selectedFindingId={selectedFindingId}
                  onClearSelectedFinding={() => setSelectedFindingId(null)}
                  onNavigate={handleNavigateTab}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === 'unresolved' && (
                <UnresolvedCases
                  selectedCaseId={selectedCaseId}
                  onClearSelectedCase={() => setSelectedCaseId(null)}
                  onNavigate={handleNavigateTab}
                  onNavigateTab={handleNavigateTab}
                />
              )}

              {activeTab === 'reports' && (
                <Reports
                  selectedAuditId={currentAuditId}
                  onNavigateTab={handleNavigateTab}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
