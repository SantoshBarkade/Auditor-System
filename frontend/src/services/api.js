const API_BASE = '/api/v1';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Dashboard
  getDashboardSummary: async () => {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    return res.json();
  },

  runVendorDemo: async (vendor) => {
    const res = await fetch(`${API_BASE}/dashboard/demo/${vendor}`, { method: 'POST' });
    return res.json();
  },

  // Configurations
  detectVendor: async (raw_content, filename) => {
    const res = await fetch(`${API_BASE}/configurations/detect-vendor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_content, filename })
    });
    return res.json();
  },

  uploadConfiguration: async (raw_content, filename, vendor) => {
    const formData = new FormData();
    formData.append('raw_content', raw_content);
    formData.append('filename', filename);
    if (vendor) formData.append('vendor', vendor);

    const res = await fetch(`${API_BASE}/configurations/upload`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  getConfigurations: async () => {
    const res = await fetch(`${API_BASE}/configurations`);
    return res.json();
  },

  getConfiguration: async (id) => {
    const res = await fetch(`${API_BASE}/configurations/${id}`);
    return res.json();
  },

  getNormalizedConfiguration: async (id) => {
    const res = await fetch(`${API_BASE}/configurations/${id}/normalized`);
    return res.json();
  },

  getSampleConfigsList: async () => {
    const res = await fetch(`${API_BASE}/configurations/samples/list`);
    return res.json();
  },

  loadSampleConfig: async (filename) => {
    const res = await fetch(`${API_BASE}/configurations/samples/load/${filename}`);
    return res.json();
  },

  // Audits
  runAudit: async (configuration_id) => {
    const res = await fetch(`${API_BASE}/audits/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configuration_id })
    });
    return res.json();
  },

  getAudits: async () => {
    const res = await fetch(`${API_BASE}/audits`);
    return res.json();
  },

  getAudit: async (id) => {
    const res = await fetch(`${API_BASE}/audits/${id}`);
    return res.json();
  },

  getAuditFindings: async (audit_id) => {
    const res = await fetch(`${API_BASE}/audits/${audit_id}/findings`);
    return res.json();
  },

  getAuditCompliancePosture: async (audit_id) => {
    const res = await fetch(`${API_BASE}/audits/${audit_id}/compliance-posture`);
    return res.json();
  },

  // Findings
  getFinding: async (id) => {
    const res = await fetch(`${API_BASE}/findings/${id}`);
    return res.json();
  },

  getFindingEvidence: async (id) => {
    const res = await fetch(`${API_BASE}/findings/${id}/evidence`);
    return res.json();
  },

  triggerAIExplain: async (id) => {
    const res = await fetch(`${API_BASE}/findings/${id}/ai-explain`, { method: 'POST' });
    return res.json();
  },

  approveRemediation: async (id, reviewer, note) => {
    const res = await fetch(`${API_BASE}/findings/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer, note })
    });
    return res.json();
  },

  rejectRemediation: async (id, reviewer, note) => {
    const res = await fetch(`${API_BASE}/findings/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer, note })
    });
    return res.json();
  },

  simulateRemediation: async (id, reviewer = 'Security Administrator') => {
    const params = new URLSearchParams({ reviewer });
    const res = await fetch(`${API_BASE}/findings/${id}/simulate-remediation?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  // Blockchain
  getBlockchain: async () => {
    const res = await fetch(`${API_BASE}/blockchain`);
    return res.json();
  },

  verifyBlockchain: async () => {
    const res = await fetch(`${API_BASE}/blockchain/verify`, { method: 'POST' });
    return res.json();
  },

  tamperTestBlockchain: async () => {
    const res = await fetch(`${API_BASE}/blockchain/tamper-test`, { method: 'POST' });
    return res.json();
  },

  // Reports
  getReportPdfUrl: (auditId) => `${API_BASE}/reports/${auditId}/pdf`,
  getReportCsvUrl: (auditId) => `${API_BASE}/reports/${auditId}/csv`,
  getReportJsonUrl: (auditId) => `${API_BASE}/reports/${auditId}/json`,

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  updateAISettings: async (api_key, model) => {
    const res = await fetch(`${API_BASE}/settings/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, model })
    });
    return res.json();
  },

  // Semantic Convergence Demo
  getConvergenceDemo: async () => {
    const res = await fetch(`${API_BASE}/configurations/convergence/demo`);
    return res.json();
  },
};
