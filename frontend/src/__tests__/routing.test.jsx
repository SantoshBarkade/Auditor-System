import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getDashboardSummary: vi.fn().mockResolvedValue({
      total_audits: 0,
      overall_compliance_pct: 0,
      pass_findings: 0,
      fail_findings: 0,
      unresolved_count: 0,
      average_risk_score: 0,
      recent_audits: [],
      recent_findings: [],
      blockchain_integrity: true,
      total_blockchain_blocks: 0
    }),
    getAudits: vi.fn().mockResolvedValue([]),
    getFindings: vi.fn().mockResolvedValue([]),
    getUnresolvedCases: vi.fn().mockResolvedValue([]),
    getUnresolvedStats: vi.fn().mockResolvedValue({ total: 0, open: 0, awaiting_review: 0, resolved: 0 }),
    getBlockchain: vi.fn().mockResolvedValue([]),
    loadSampleConfig: vi.fn().mockResolvedValue({ raw_content: 'hostname Router1' }),
  }
}));

describe('App Routing and Deep Linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Overview page on root route /', async () => {
    window.history.pushState({}, 'Root', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Security posture & verification/i)).toBeInTheDocument();
    });
  });

  it('renders Audits page on /audits deep link', async () => {
    window.history.pushState({}, 'Audits', '/audits');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Audit pipeline/i)).toBeInTheDocument();
    });
  });

  it('renders Findings page on /findings deep link', async () => {
    window.history.pushState({}, 'Findings', '/findings');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Security findings/i)).toBeInTheDocument();
    });
  });

  it('renders Unresolved cases on /unresolved deep link', async () => {
    window.history.pushState({}, 'Unresolved', '/unresolved');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Unresolved cases/i)).toBeInTheDocument();
    });
  });

  it('renders Reports page on /reports deep link', async () => {
    window.history.pushState({}, 'Reports', '/reports');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Reports & exports/i)).toBeInTheDocument();
    });
  });

  it('renders honest 404 state on unknown route', async () => {
    window.history.pushState({}, 'Unknown', '/some-non-existent-route-xyz');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Route not found/i)).toBeInTheDocument();
      expect(screen.getByText(/Return to Overview/i)).toBeInTheDocument();
    });
  });
});
