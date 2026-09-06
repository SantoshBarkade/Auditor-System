// Production-safe Environment-based API Configuration
const rawApiUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '';
const API_ROOT = rawApiUrl.replace(/\/+$/, '');
export const API_BASE = API_ROOT ? `${API_ROOT}/api/v1` : '/api/v1';

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = status === 0;
    this.isNotFound = status === 404;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
    this.isClientError = status >= 400 && status < 500;
    this.isServerError = status >= 500;
  }
}

async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${cleanEndpoint}`;
  const headers = { ...(options.headers || {}) };

  // Set Content-Type for JSON payloads unless FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr) {
    throw new ApiError(
      `Network error connecting to NEXORA backend (${url}). Please check your connection.`,
      0,
      networkErr
    );
  }

  let responseData = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseData = await res.json();
    } catch {
      responseData = null;
    }
  } else {
    responseData = await res.text();
  }

  if (!res.ok) {
    let errorMessage = `Request to ${cleanEndpoint} failed with status ${res.status}`;
    if (responseData && typeof responseData === 'object') {
      errorMessage = responseData.detail || responseData.message || errorMessage;
    } else if (typeof responseData === 'string' && responseData.length > 0 && responseData.length < 250) {
      errorMessage = responseData;
    }
    throw new ApiError(errorMessage, res.status, responseData);
  }

  return responseData;
}

export const api = {
  // Health
  getHealth: async () => request('/health'),

  // Dashboard & Posture
  getDashboardSummary: async () => request('/dashboard/summary'),
  getPostureSummary: async () => request('/posture/summary'),
  runVendorDemo: async (vendor) => request(`/dashboard/demo/${vendor}`, { method: 'POST' }),

  // Configurations
  detectVendor: async (raw_content, filename) => {
    return request('/configurations/detect-vendor', {
      method: 'POST',
      body: JSON.stringify({ raw_content, filename })
    });
  },

  uploadConfiguration: async (raw_content, filename, vendor) => {
    const formData = new FormData();
    formData.append('raw_content', raw_content);
    formData.append('filename', filename);
    if (vendor) formData.append('vendor', vendor);

    return request('/configurations/upload', {
      method: 'POST',
      body: formData
    });
  },

  getConfigurations: async () => request('/configurations'),
  getConfiguration: async (id) => request(`/configurations/${id}`),
  getNormalizedConfiguration: async (id) => request(`/configurations/${id}/normalized`),
  getSampleConfigsList: async () => request('/configurations/samples/list'),
  loadSampleConfig: async (filename) => request(`/configurations/samples/load/${encodeURIComponent(filename)}`),

  // Audits
  runAudit: async (configuration_id) => {
    return request('/audits/run', {
      method: 'POST',
      body: JSON.stringify({ configuration_id })
    });
  },

  getAudits: async () => request('/audits'),
  getAudit: async (id) => request(`/audits/${id}`),
  getAuditFindings: async (audit_id) => request(`/audits/${audit_id}/findings`),
  getAuditCompliancePosture: async (audit_id) => request(`/audits/${audit_id}/compliance-posture`),

  // Findings
  getFindings: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.audit_id) searchParams.set('audit_id', params.audit_id);
    if (params.severity) searchParams.set('severity', params.severity);
    if (params.status) searchParams.set('status', params.status);
    if (params.vendor) searchParams.set('vendor', params.vendor);
    if (params.limit) searchParams.set('limit', params.limit);
    const qs = searchParams.toString();
    return request(`/findings${qs ? `?${qs}` : ''}`);
  },
  getFinding: async (id) => request(`/findings/${id}`),
  getFindingEvidence: async (id) => request(`/findings/${id}/evidence`),
  getFindingPipeline: async (id) => request(`/findings/${id}/pipeline`),
  triggerAIExplain: async (id) => request(`/findings/${id}/ai-explain`, { method: 'POST' }),

  approveRemediation: async (id, reviewer, note) => {
    return request(`/findings/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer, note })
    });
  },

  rejectRemediation: async (id, reviewer, note) => {
    return request(`/findings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewer, note })
    });
  },

  simulateRemediation: async (id, reviewer = 'Security Administrator') => {
    const params = new URLSearchParams({ reviewer });
    return request(`/findings/${id}/simulate-remediation?${params.toString()}`, {
      method: 'POST'
    });
  },

  // Blockchain
  getBlockchain: async () => request('/blockchain'),
  verifyBlockchain: async () => request('/blockchain/verify', { method: 'POST' }),
  tamperTestBlockchain: async () => request('/blockchain/tamper-test', { method: 'POST' }),

  // Reports
  getReportPdfUrl: (auditId) => `${API_BASE}/reports/${auditId}/pdf`,
  getReportCsvUrl: (auditId) => `${API_BASE}/reports/${auditId}/csv`,
  getReportJsonUrl: (auditId) => `${API_BASE}/reports/${auditId}/json`,

  // Settings
  getSettings: async () => request('/settings'),
  updateAISettings: async (api_key, model, adminToken = 'dev-token-change-in-prod') => {
    return request('/settings/ai', {
      method: 'POST',
      headers: {
        'x-admin-token': adminToken
      },
      body: JSON.stringify({ api_key, model })
    });
  },

  // Unresolved Cases - single efficient backend endpoint calls
  getUnresolvedCases: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.audit_id) searchParams.set('audit_id', params.audit_id);
    if (params.status) searchParams.set('status', params.status);
    if (params.vendor) searchParams.set('vendor', params.vendor);
    if (params.limit) searchParams.set('limit', params.limit);
    if (params.skip) searchParams.set('skip', params.skip);
    const qs = searchParams.toString();
    return request(`/unresolved${qs ? `?${qs}` : ''}`);
  },

  getUnresolvedStats: async () => {
    return request('/unresolved/stats/summary');
  },

  getUnresolvedCase: async (id) => request(`/unresolved/${id}`),
  getUnresolvedHistory: async (id) => request(`/unresolved/${id}/history`),

  triggerAIInvestigation: async (id, actor = 'Security Analyst') => {
    return request(`/unresolved/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ actor })
    });
  },

  submitCaseReview: async (id, reviewer, notes, additional_context = null) => {
    return request(`/unresolved/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ reviewer, notes, additional_context })
    });
  },

  resolveCase: async (id, reviewer, final_verdict, resolution_context, resolution_evidence = {}) => {
    return request(`/unresolved/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ reviewer, final_verdict, resolution_context, resolution_evidence })
    });
  },

  rejectCase: async (id, reviewer, reason) => {
    return request(`/unresolved/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reviewer, reason })
    });
  },

  getConvergenceDemo: async () => request('/configurations/convergence/demo')
};
