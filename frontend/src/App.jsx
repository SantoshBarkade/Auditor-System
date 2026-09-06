import React, { useState } from 'react';
import { ToastContainer } from './components/Toast';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Configurations from './pages/Configurations';
import AuditPipeline from './pages/AuditPipeline';
import Findings from './pages/Findings';
import Compliance from './pages/Compliance';
import BlockchainTrail from './pages/BlockchainTrail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SecurityPosture from './pages/SecurityPosture';
import CrossVendorParity from './pages/CrossVendorParity';
import RemediationCenter from './pages/RemediationCenter';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentAuditId, setCurrentAuditId] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);

  function handleSelectAudit(auditId) {
    setCurrentAuditId(auditId);
    setActiveTab('pipeline');
  }

  function handleAuditStarted(auditId) {
    setCurrentAuditId(auditId);
    setActiveTab('pipeline');
  }

  function handleSelectFinding(findingId) {
    setSelectedFindingId(findingId);
    setActiveTab('findings');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col font-sans">
      <ToastContainer />
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[var(--bg-main)] relative">

          <div className="max-w-7xl mx-auto relative z-10">
            {activeTab === 'dashboard' && (
              <Dashboard
                onSelectAudit={handleSelectAudit}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'configurations' && (
              <Configurations onAuditStarted={handleAuditStarted} />
            )}

            {activeTab === 'pipeline' && (
              <AuditPipeline
                auditId={currentAuditId}
                onSelectFinding={handleSelectFinding}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'findings' && (
              <Findings
                selectedFindingId={selectedFindingId}
                onClearSelectedFinding={() => setSelectedFindingId(null)}
              />
            )}

            {activeTab === 'posture' && <SecurityPosture />}
            {activeTab === 'parity' && <CrossVendorParity />}
            {activeTab === 'remediation' && <RemediationCenter />}
            {activeTab === 'compliance' && <Compliance />}
            {activeTab === 'blockchain' && <BlockchainTrail />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </main>
      </div>
    </div>
  );
}
