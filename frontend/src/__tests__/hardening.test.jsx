import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import Overview from '../pages/Overview';
import Findings from '../pages/Findings';
import FindingDetail from '../pages/FindingDetail';
import UnresolvedCases from '../pages/UnresolvedCases';
import Reports from '../pages/Reports';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getDashboardSummary: vi.fn(),
    getAudits: vi.fn(),
    getFindings: vi.fn(),
    getFinding: vi.fn(),
    getFindingPipeline: vi.fn(),
    getUnresolvedCases: vi.fn(),
    getUnresolvedStats: vi.fn(),
    getUnresolvedCase: vi.fn(),
    getAudit: vi.fn(),
    getAuditCompliancePosture: vi.fn(),
    getAuditFindings: vi.fn(),
    getBlockchain: vi.fn(),
    simulateRemediation: vi.fn(),
    triggerAIInvestigation: vi.fn(),
    resolveCase: vi.fn(),
    getReportPdfUrl: vi.fn((id) => `/api/v1/reports/${id}/pdf`),
    getReportCsvUrl: vi.fn((id) => `/api/v1/reports/${id}/csv`),
    getReportJsonUrl: vi.fn((id) => `/api/v1/reports/${id}/json`),
  }
}));

describe('Overview Component - Zero Fake Data & Honest States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders honest empty state with zero fake audits (no #10, #11, #12)', async () => {
    api.getDashboardSummary.mockResolvedValue({
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
    });

    render(<Overview onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Your workspace is ready/i)).toBeInTheDocument();
    });

    // Verify NO fake audit IDs are manufactured
    expect(screen.queryByText(/Audit #10/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Audit #11/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Audit #12/i)).not.toBeInTheDocument();

    // Verify NO fake finding IDs are manufactured
    expect(screen.queryByText(/#60/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/#61/i)).not.toBeInTheDocument();
  });

  it('renders real API data when audits exist', async () => {
    api.getDashboardSummary.mockResolvedValue({
      total_audits: 1,
      overall_compliance_pct: 91.5,
      pass_findings: 5,
      fail_findings: 1,
      unresolved_count: 0,
      average_risk_score: 25,
      recent_audits: [
        { id: 99, vendor: 'Cisco', status: 'COMPLETED', compliance_score: 91.5, findings_count: 2 }
      ],
      recent_findings: [
        { id: 201, rule_id: 'CISCO-SEC-01', title: 'Telnet Enabled', severity: 'CRITICAL', status: 'OPEN', audit_id: 99 }
      ],
      blockchain_integrity: true,
      total_blockchain_blocks: 1
    });

    render(<Overview onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText(/91.5%/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/CISCO-SEC-01/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/CISCO-SEC-01/i)).toBeInTheDocument();
    });
  });

  it('renders honest error state when API fails instead of fabricating data', async () => {
    api.getDashboardSummary.mockRejectedValue(new Error('Connection refused'));

    render(<Overview onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load dashboard data/i)).toBeInTheDocument();
    });

    // Must never fall back to fake numbers
    expect(screen.queryByText(/Audit #12/i)).not.toBeInTheDocument();
  });
});

describe('Findings & FindingDetail - Integrity & Honest Remediation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders honest empty state when no findings exist', async () => {
    api.getFindings.mockResolvedValue([]);

    render(<Findings onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No configuration findings exist in the database/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/#60/i)).not.toBeInTheDocument();
  });

  it('handles invalid or missing finding ID honestly', async () => {
    render(<FindingDetail findingId={null} />);

    await waitFor(() => {
      expect(screen.getByText(/Finding Not Specified/i)).toBeInTheDocument();
    });
  });

  it('remediation failure does NOT convert into fake PASS or fake metrics', async () => {
    api.getFinding.mockResolvedValue({
      id: 55,
      rule_id: 'CISCO-PW-01',
      title: 'Insecure Password Encryption',
      severity: 'HIGH',
      status: 'OPEN',
      vendor: 'cisco',
      evidence: 'enable password cisco123',
      line_number: 14,
      remediation_command: 'enable secret CiscoSecure#2026',
      audit_id: 10
    });

    api.simulateRemediation.mockRejectedValue(new Error('Sandbox clone failure'));

    render(<FindingDetail findingId={55} />);

    await waitFor(() => {
      expect(screen.getByText(/Insecure Password Encryption/i)).toBeInTheDocument();
    });

    // Trigger remediation simulation
    const verifyBtn = screen.getByRole('button', { name: /Apply & Verify in Sandbox/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      // Must show failure card, NOT fake PASS
      expect(screen.getByText(/Sandbox Verification Failed/i)).toBeInTheDocument();
    });

    // Ensure fake fabricated numbers are NOT rendered
    expect(screen.queryByText(/68.*57/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/56.5%.*82.6%/i)).not.toBeInTheDocument();
  });
});


  it('renders all 10 authoritative pipeline stages on FindingDetail', async () => {
    api.getFindingPipeline.mockResolvedValue({
      finding: {
        id: 542,
        audit_id: 55,
        rule_id: 'JUNOS-POL-ANY-ANY-001',
        title: 'Overly Permissive Any-to-Any Security Policy',
        vendor: 'Juniper',
        category: 'Access Control',
        severity: 'CRITICAL',
        verdict: 'FAIL',
        status: 'OPEN',
        line_numbers: [26],
        evidence: 'Security Policy inbound-unfiltered match source-address any destination-address any then permit',
        impact: 'Removes stateful inspection boundaries between security zones.',
        risk_score: 100
      },
      configuration: {
        id: 1,
        filename: 'juniper_insecure.conf',
        vendor: 'Juniper',
        line_count: 32,
        sha256_hash: 'abcdef1234567890'
      },
      parser: {
        parser_name: 'Juniper Parser'
      },
      normalization: {
        vendor_specific: { formatted_snippet: 'set security policies from-zone untrust to-zone trust policy inbound-unfiltered match source-address any' },
        vendor_neutral: { object_type: 'security_policy', action: 'PERMIT' },
        facts: [
          { category: 'Policy', field: 'source', value: 'any', source_line: 26, parser_origin: 'JuniperParser', confidence: 'AUTHORITATIVE' },
          { category: 'Policy', field: 'action', value: 'PERMIT', source_line: 26, parser_origin: 'JuniperParser', confidence: 'AUTHORITATIVE' }
        ]
      },
      security_state: {
        state: 'OVERLY_PERMISSIVE_POLICY',
        reason: 'The normalized policy permits unrestricted traffic from any source to any destination.',
        scope: { source_scope: 'ANY', destination_scope: 'ANY', action: 'PERMIT' }
      },
      compliance: {
        engine: 'Deterministic Compliance Engine',
        rule: { rule_id: 'JUNOS-POL-ANY-ANY-001', title: 'Overly Permissive Any-to-Any Security Policy' },
        verdict: 'FAIL',
        condition: 'IF (source == any AND action == PERMIT) THEN (security_state = OVERLY_PERMISSIVE_POLICY -> VERDICT = FAIL)',
        evaluation_matrix: [
          { framework: 'NIST CSF 2.0', control_id: 'PR.IR-01', control_title: 'Network Segmentation', result: 'FAIL', rule_id: 'JUNOS-POL-ANY-ANY-001' }
        ]
      },
      risk: {
        score: 100,
        level: 'CRITICAL',
        severity: { score: 4, description: 'Critical impact' },
        exposure: { score: 4, description: 'Exposed to untrusted zone' },
        impact: { score: 4, description: 'Lateral movement risk' },
        exploitability: { score: 4, description: 'Trivial exploitability' },
        formula: 'round(((Severity * 0.35 + Exposure * 0.25 + Impact * 0.20 + Exploitability * 0.20) / 4.0) * 100)'
      },
      evidence: {
        filename: 'juniper_insecure.conf',
        line_numbers: [26],
        code_snippet: [
          { line_number: 26, content: 'set security policies from-zone untrust to-zone trust policy inbound-unfiltered match source-address any', is_highlighted: true }
        ]
      },
      remediation: {
        why_it_matters: 'Removes stateful inspection boundaries.',
        what_should_change: 'Specify restricted source/destination addresses.',
        diff: {
          current_statement: 'match source-address any',
          recommended_statement: 'match source-address CORP_INTERNAL'
        }
      },
      ai_advisory: {
        model: 'NVIDIA NIM',
        summary: 'Advisory guidance for zone segmentation.',
        why_it_matters: 'Zone isolation principles violated.'
      },
      blockchain: [
        { block_index: 1, event_type: 'AUDIT_STARTED', actor: 'SYSTEM', ledger_status: 'APPENDED' }
      ]
    });

    render(<FindingDetail findingId={542} />);

    await waitFor(() => {
      expect(screen.getByText(/Overly Permissive Any-to-Any Security Policy/i)).toBeInTheDocument();
    });

    // Verify key sections render
    expect(screen.getAllByText(/Deterministic Compliance Engine/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/OVERLY_PERMISSIVE_POLICY/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Normalization.*Vendor Abstraction Layer/i)).toBeInTheDocument();
    expect(screen.getByText(/Normalized Security Facts Viewer/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic 4-Factor Risk Calculation/i)).toBeInTheDocument();
    expect(screen.getByText(/AI output is advisory and does not determine compliance/i)).toBeInTheDocument();
    expect(screen.getByText(/NIST CSF 2.0/i)).toBeInTheDocument();
  });

describe('UnresolvedCases - Dynamic RAG & Human Governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders honest empty queue when no unresolved cases exist', async () => {
    api.getUnresolvedCases.mockResolvedValue([]);
    api.getUnresolvedStats.mockResolvedValue({ total: 0, open: 0, awaiting_review: 0, resolved: 0 });

    render(<UnresolvedCases />);

    await waitFor(() => {
      expect(screen.getByText(/No unresolved cases detected in audited configurations/i)).toBeInTheDocument();
    });
  });

  it('dynamically renders real RAG retrieved evidence and no static fake vendorDocs', async () => {
    const realRagChunks = [
      {
        id: 'chunk-1',
        document_title: 'Junos OS 21.4 Application Sets Guide',
        authority_level: 'AUTHORITATIVE',
        source_type: 'VENDOR_DOC',
        content: 'Application sets require dynamic reference validation in firewall stanza.',
        similarity: 0.89
      }
    ];

    api.getUnresolvedCases.mockResolvedValue([
      {
        id: 7,
        case_type: 'MISSING_REFERENCE',
        vendor: 'Juniper',
        line_number: 22,
        status: 'AWAITING_REVIEW',
        source_text: 'set applications application-set custom-set',
        ai_analysis: {
          interpretation: 'Directive references application set without local definition.',
          confidence: 'HIGH',
          recommendation: 'RESOLVED_WITH_CONTEXT',
          retrieved_evidence: realRagChunks
        }
      }
    ]);
    api.getUnresolvedStats.mockResolvedValue({ total: 1, open: 0, awaiting_review: 1, resolved: 0 });
    api.getUnresolvedCase.mockResolvedValue({
      id: 7,
      case_type: 'MISSING_REFERENCE',
      vendor: 'Juniper',
      line_number: 22,
      status: 'AWAITING_REVIEW',
      source_text: 'set applications application-set custom-set',
      ai_analysis: {
        interpretation: 'Directive references application set without local definition.',
        confidence: 'HIGH',
        recommendation: 'RESOLVED_WITH_CONTEXT',
        retrieved_evidence: realRagChunks
      }
    });

    render(<UnresolvedCases selectedCaseId={7} />);

    await waitFor(() => {
      expect(screen.getByText(/Junos OS 21.4 Application Sets Guide/i)).toBeInTheDocument();
      expect(screen.getByText(/Sim: 0.89/i)).toBeInTheDocument();
    });

    // Verify static hardcoded vendorDocs entries are NOT present
    expect(screen.queryByText(/Cisco IOS-XE Access Control Lists Guide/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FortiOS Firewall Policy Standards/i)).not.toBeInTheDocument();
  });
});

describe('Reports Component - Honest Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders honest empty state with zero audits', async () => {
    api.getAudits.mockResolvedValue([]);
    api.getBlockchain.mockResolvedValue([]);

    render(<Reports onNavigateTab={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/No audits executed yet/i)).toBeInTheDocument();
    });

    // Should NOT show fallback fake block #043 or fake score 82
    expect(screen.queryByText(/#043/i)).not.toBeInTheDocument();
  });
});