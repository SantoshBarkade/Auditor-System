import datetime
from datetime import timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String(100), nullable=False)
    vendor = Column(String(50), nullable=False)  # Cisco, Fortinet, Juniper
    model = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    configurations = relationship("Configuration", back_populates="device", cascade="all, delete-orphan")

class Configuration(Base):
    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    vendor = Column(String(50), nullable=False)  # Cisco, Fortinet, Juniper
    raw_content = Column(Text, nullable=False)
    sha256_hash = Column(String(64), nullable=True, index=True)  # SHA-256 integrity fingerprint
    line_count = Column(Integer, default=0)
    file_size = Column(Integer, default=0)
    is_sandbox = Column(Boolean, default=False)
    parent_config_id = Column(Integer, ForeignKey("configurations.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    device = relationship("Device", back_populates="configurations")
    audits = relationship("Audit", back_populates="configuration", cascade="all, delete-orphan")

class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=False)
    vendor = Column(String(50), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    stage = Column(String(100), default="Issue Identified")
    risk_score = Column(Integer, default=0)
    findings_count = Column(Integer, default=0)
    compliance_score = Column(Float, default=0.0)
    is_verification = Column(Boolean, default=False)
    parent_audit_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc), onupdate=lambda: datetime.datetime.now(timezone.utc))

    configuration = relationship("Configuration", back_populates="audits")
    findings = relationship("Finding", back_populates="audit", cascade="all, delete-orphan")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    rule_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    vendor = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False)
    severity = Column(String(20), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    verdict = Column(String(20), default="FAIL")  # PASS, FAIL, UNRESOLVED, CONFLICT, N/A
    confidence = Column(String(20), default="HIGH")  # HIGH, MEDIUM, LOW
    status = Column(String(50), default="OPEN")  # OPEN, REVIEWED, APPROVED, REJECTED, REMEDIATED, VERIFIED, CLOSED
    
    description = Column(Text, nullable=False)
    evidence = Column(Text, nullable=False)
    line_numbers = Column(JSON, default=list)  # e.g., [42, 43]
    impact = Column(Text, nullable=False)
    
    # Deterministic Risk Factors (1 to 4)
    severity_score = Column(Integer, default=1)
    exposure_score = Column(Integer, default=1)
    impact_score = Column(Integer, default=1)
    exploitability_score = Column(Integer, default=1)
    risk_score = Column(Integer, default=0)  # 0 to 100
    
    remediation_recommendation = Column(Text, nullable=False)
    remediation_diff = Column(JSON, default=dict)
    
    compliance_mappings = Column(JSON, default=list)  # List of {framework, control_id, name, status}
    ai_explanation = Column(JSON, default=dict)  # Structured explanation
    
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc), onupdate=lambda: datetime.datetime.now(timezone.utc))

    audit = relationship("Audit", back_populates="findings")
    remediations = relationship("Remediation", back_populates="finding", cascade="all, delete-orphan")

class Remediation(Base):
    __tablename__ = "remediations"

    id = Column(Integer, primary_key=True, index=True)
    finding_id = Column(Integer, ForeignKey("findings.id"), nullable=False)
    vendor = Column(String(50), nullable=False)
    current_config = Column(Text, nullable=False)
    recommended_config = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING_APPROVAL")  # PENDING_APPROVAL, APPROVED, REJECTED, SIMULATED, VERIFIED
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    finding = relationship("Finding", back_populates="remediations")
    approvals = relationship("Approval", back_populates="remediation", cascade="all, delete-orphan")

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    remediation_id = Column(Integer, ForeignKey("remediations.id"), nullable=False)
    reviewer = Column(String(100), default="Security Administrator")
    decision = Column(String(20), nullable=False)  # APPROVED, REJECTED
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))

    remediation = relationship("Remediation", back_populates="approvals")

class BlockchainBlock(Base):
    __tablename__ = "blockchain_blocks"

    id = Column(Integer, primary_key=True, index=True)
    block_index = Column(Integer, nullable=False, unique=True)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
    event_type = Column(String(100), nullable=False)
    actor = Column(String(100), default="SYSTEM")
    audit_id = Column(Integer, nullable=True)
    event_data = Column(JSON, nullable=False)
    payload_hash = Column(String(64), nullable=False)
    previous_hash = Column(String(64), nullable=False)
    block_hash = Column(String(64), nullable=False)

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    report_type = Column(String(20), nullable=False)  # PDF, CSV, JSON
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(timezone.utc))
