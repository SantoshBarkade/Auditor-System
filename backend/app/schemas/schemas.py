import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class VendorDetectionRequest(BaseModel):
    raw_content: str
    filename: Optional[str] = "network_device.cfg"

class VendorDetectionResponse(BaseModel):
    vendor: str  # Cisco, Fortinet, Juniper, Unknown
    confidence: float
    fingerprints: List[str]
    detected_syntax: str

class ConfigurationCreate(BaseModel):
    filename: str
    raw_content: str
    vendor: Optional[str] = None
    device_hostname: Optional[str] = None

class ConfigurationResponse(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    filename: str
    vendor: str
    line_count: int
    file_size: int
    is_sandbox: bool
    sha256_hash: Optional[str]
    created_at: datetime.datetime

class FindingResponse(BaseModel):
    id: int
    audit_id: int
    rule_id: str
    title: str
    vendor: str
    category: str
    severity: str
    verdict: str
    confidence: str
    status: str
    risk_score: int
    severity_score: int
    exposure_score: int
    impact_score: int
    exploitability_score: int
    description: str
    evidence: str
    line_numbers: List[int]
    impact: str
    remediation_recommendation: str
    remediation_diff: Dict[str, Any]
    compliance_mappings: List[Dict[str, Any]]
    ai_explanation: Dict[str, Any]
    created_at: datetime.datetime

class AuditResponse(BaseModel):
    id: int
    configuration_id: int
    vendor: str
    status: str
    stage: str
    risk_score: int
    findings_count: int
    compliance_score: float
    is_verification: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

class FindingApprovalRequest(BaseModel):
    reviewer: str = "Security Administrator"
    note: Optional[str] = "Approved for sandboxed simulation."

class FindingRejectRequest(BaseModel):
    reviewer: str = "Security Administrator"
    note: str = "Remediation rejected due to operational exception."

class RemediationSimulateResponse(BaseModel):
    original_audit_id: int
    verification_audit_id: int
    fixed_findings: List[str]
    remaining_findings: List[str]
    risk_score_before: int
    risk_score_after: int
    risk_reduction_pct: float
    compliance_score_before: float
    compliance_score_after: float
    verification_passed: bool
    simulated_config_id: int

class BlockchainBlockResponse(BaseModel):
    id: int
    block_index: int
    timestamp: datetime.datetime
    event_type: str
    actor: str
    audit_id: Optional[int]
    event_data: Dict[str, Any]
    payload_hash: str
    previous_hash: str
    block_hash: str

class BlockchainVerifyResponse(BaseModel):
    is_valid: bool
    total_blocks: int
    tampered_block_index: Optional[int] = None
    message: str

class TamperTestResponse(BaseModel):
    before_status: str
    tampered_block_index: int
    during_status: str
    repaired_status: str
    message: str

class DashboardSummaryResponse(BaseModel):
    unresolved_count: int = 0
    pass_findings: int = 0
    fail_findings: int = 0
    na_findings: int = 0
    conflict_findings: int = 0
    total_configurations: int
    total_audits: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    open_findings: int
    remediated_findings: int
    average_risk_score: int
    overall_compliance_pct: float
    blockchain_integrity: bool
    total_blockchain_blocks: int
    vendor_distribution: Dict[str, int]
    severity_distribution: Dict[str, int]
    recent_audits: List[Dict[str, Any]]
    recent_findings: List[Dict[str, Any]]
