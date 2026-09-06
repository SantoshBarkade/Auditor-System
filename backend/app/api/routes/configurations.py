import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.models import Configuration, Device
from backend.app.schemas.schemas import (
    ConfigurationCreate,
    ConfigurationResponse,
    VendorDetectionRequest,
    VendorDetectionResponse
)
from backend.app.services.vendor_detection.detector import VendorDetector
from backend.app.services.normalization.normalizer import NormalizerService
from backend.app.services.blockchain.chain import BlockchainLedger
from backend.app.core.config import settings

router = APIRouter(prefix="/configurations", tags=["Configurations"])

@router.post("/detect-vendor", response_model=VendorDetectionResponse)
async def detect_vendor(req: VendorDetectionRequest):
    return VendorDetector.detect(req.raw_content, req.filename or "")

@router.post("/upload", response_model=ConfigurationResponse)
async def upload_configuration(
    request: Request,
    file: Optional[UploadFile] = File(None),
    raw_content: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    vendor: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    max_size = getattr(settings, "MAX_UPLOAD_SIZE", 5 * 1024 * 1024)
    content_text = None
    fname = None
    if file:
        content_bytes = await file.read(max_size + 1)
        if len(content_bytes) > max_size:
            raise HTTPException(status_code=413, detail=f"File exceeds maximum allowed upload size ({max_size // (1024*1024)}MB)")
        content_text = content_bytes.decode("utf-8", errors="replace")
        fname = os.path.basename(file.filename or "uploaded_config.cfg")
    elif raw_content:
        if len(raw_content.encode("utf-8")) > max_size:
            raise HTTPException(status_code=413, detail=f"Configuration exceeds maximum allowed upload size ({max_size // (1024*1024)}MB)")
        content_text = raw_content
        fname = os.path.basename(filename or "uploaded_config.cfg")
    else:
        try:
            body = await request.json()
            raw = body.get("raw_text") or body.get("raw_content")
            if raw and len(raw.encode("utf-8")) > max_size:
                raise HTTPException(status_code=413, detail=f"Configuration exceeds maximum allowed upload size ({max_size // (1024*1024)}MB)")
            content_text = raw
            fname = os.path.basename(body.get("name") or body.get("filename") or "uploaded_config.cfg")
            vendor = vendor or body.get("vendor")
        except HTTPException:
            raise
        except Exception:
            pass

    if not content_text:
        raise HTTPException(status_code=400, detail="Either file upload, raw_content, or json raw_text is required.")

    # Detect vendor if not provided
    if not vendor or vendor == "Auto-Detect":
        detection = VendorDetector.detect(content_text, fname)
        detected_vendor = detection.vendor
    else:
        v_lower = vendor.strip().lower()
        if "cisco" in v_lower:
            detected_vendor = "Cisco"
        elif "forti" in v_lower:
            detected_vendor = "Fortinet"
        elif "juniper" in v_lower or "junos" in v_lower:
            detected_vendor = "Juniper"
        else:
            detected_vendor = vendor.capitalize()

    # Parse device info
    lines = content_text.splitlines()
    _, normalized, _ = NormalizerService.normalize_configuration(content_text, fname, detected_vendor)

    # Find or create device
    hostname = normalized.device.hostname or "Device-01"
    dev_res = await db.execute(select(Device).where(Device.hostname == hostname))
    device = dev_res.scalar_one_or_none()
    if not device:
        device = Device(
            hostname=hostname,
            vendor=detected_vendor,
            model=normalized.device.platform or "Network Appliance",
            ip_address="192.168.1.1"
        )
        db.add(device)
        await db.flush()

    import hashlib
    content_hash = hashlib.sha256(content_text.encode('utf-8')).hexdigest()
    
    # Create Configuration
    config = Configuration(
        device_id=device.id,
        filename=fname,
        vendor=detected_vendor,
        raw_content=content_text,
        sha256_hash=content_hash,
        line_count=len(lines),
        file_size=len(content_text.encode("utf-8")),
        is_sandbox=False
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)

    # Record to Blockchain
    await BlockchainLedger.append_event(
        event_type="CONFIGURATION_UPLOADED",
        event_data={
            "config_id": config.id,
            "filename": config.filename,
            "vendor": config.vendor,
            "line_count": config.line_count,
            "file_size": config.file_size
        },
        actor="OPERATOR"
    )

    return config

@router.get("", response_model=List[ConfigurationResponse])
async def list_configurations(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Configuration).order_by(Configuration.created_at.desc()))
    return list(res.scalars().all())

@router.get("/{config_id}")
async def get_configuration(config_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Configuration).where(Configuration.id == config_id))
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return {
        "id": config.id,
        "filename": config.filename,
        "vendor": config.vendor,
        "line_count": config.line_count,
        "file_size": config.file_size,
        "is_sandbox": config.is_sandbox,
        "created_at": config.created_at,
        "raw_content": config.raw_content
    }

@router.get("/{config_id}/normalized")
async def get_normalized_configuration(config_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Configuration).where(Configuration.id == config_id))
    config = res.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")

    vendor, normalized, _ = NormalizerService.normalize_configuration(
        raw_content=config.raw_content,
        filename=config.filename,
        vendor_override=config.vendor
    )

    return {
        "config_id": config.id,
        "vendor": vendor,
        "normalized": normalized
    }

@router.get("/samples/list")
async def list_sample_configurations():
    samples_dir = settings.SAMPLE_CONFIGS_DIR
    configs = []
    if os.path.exists(samples_dir):
        for f in os.listdir(samples_dir):
            path = os.path.join(samples_dir, f)
            if os.path.isfile(path):
                vendor = "Cisco" if "cisco" in f.lower() else "Fortinet" if "fortigate" in f.lower() else "Juniper"
                tier = "Insecure" if "insecure" in f.lower() else "Secure" if "secure" in f.lower() else "Mixed"
                configs.append({
                    "filename": f,
                    "vendor": vendor,
                    "tier": tier,
                    "label": f"{vendor} ({tier})",
                    "path": str(path)
                })
    return configs

@router.get("/samples/load/{filename}")
async def load_sample_configuration(filename: str):
    safe_filename = os.path.basename(filename)
    samples_dir = os.path.abspath(settings.SAMPLE_CONFIGS_DIR)
    path = os.path.abspath(os.path.join(samples_dir, safe_filename))
    if not path.startswith(samples_dir) or not os.path.exists(path) or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Sample config not found")

    with open(path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    detection = VendorDetector.detect(content, filename)
    return {
        "filename": filename,
        "vendor": detection.vendor,
        "raw_content": content,
        "line_count": len(content.splitlines()),
        "detection": detection
    }


# ─── Semantic Convergence Demo Endpoint ───────────────────────────────────────
# Used exclusively by the Vendor Parity / Semantic Convergence page.
# Runs actual NormalizerService on all three insecure sample configs and returns
# structured semantic states for display. No fabrication: results come from the
# same parser + normalizer the audit pipeline uses.

CONVERGENCE_COMPLIANCE_MAPPINGS = {
    "HTTP_SERVER_DISABLED":         ["NIST AC-17", "PCI-DSS 1.3", "ISO 27001 A.9.4"],
    "HTTPS_ADMIN_ENABLED":          ["NIST SC-8",  "PCI-DSS 4.1", "ISO 27001 A.13.2"],
    "SSH_ENABLED":                  ["NIST AC-17", "PCI-DSS 2.2", "ISO 27001 A.9.4"],
    "TELNET_DISABLED":              ["NIST AC-17", "PCI-DSS 2.2", "ISO 27001 A.9.4"],
    "TELNET_ENABLED":               ["NIST AC-17", "PCI-DSS 2.2", "ISO 27001 A.9.4"],
    "PASSWORD_ENCRYPTION_DISABLED": ["NIST IA-5",  "PCI-DSS 8.2", "ISO 27001 A.9.2"],
    "PASSWORD_ENCRYPTION_ENABLED":  ["NIST IA-5",  "PCI-DSS 8.2", "ISO 27001 A.9.2"],
    "AAA_DISABLED":                 ["NIST IA-2",  "PCI-DSS 8.1", "ISO 27001 A.9.4"],
    "SSH_VERSION_WEAK":             ["NIST SC-8",  "PCI-DSS 2.2", "ISO 27001 A.9.4"],
    "ACL_ANY_ANY":                  ["NIST AC-4",  "PCI-DSS 1.2", "ISO 27001 A.13.1"],
    "FIREWALL_LOGGING_DISABLED":    ["NIST AU-2",  "PCI-DSS 10.1", "ISO 27001 A.12.4"],
    "ROOT_SSH_ENABLED":             ["NIST AC-6",  "PCI-DSS 8.1", "ISO 27001 A.9.2"],
    "ROOT_AUTH_WEAK":               ["NIST IA-5",  "PCI-DSS 8.2", "ISO 27001 A.9.2"],
    "NTP_CONFIGURED":               ["NIST AU-8",  "PCI-DSS 10.4", "ISO 27001 A.12.4"],
}

def _extract_semantic_states(vendor: str, normalized) -> list:
    """
    Convert the NormalizedConfiguration model into a flat list of semantic state facts
    (control_type + status tuples) with their raw_statement provenance.
    These are exactly what the rules engine evaluates.
    """
    states = []

    # 1. Security controls (AAA, PASSWORD_ENCRYPTION, SSH_VERSION, etc.)
    for ctrl in normalized.security_controls:
        key = f"{ctrl.control_type}_{ctrl.status}".upper().replace(" ", "_")
        states.append({
            "key": key,
            "label": f"{ctrl.control_type.replace('_', ' ')} — {ctrl.status}",
            "status": ctrl.status,
            "raw_statement": ctrl.raw_statement or ctrl.details,
            "compliance": CONVERGENCE_COMPLIANCE_MAPPINGS.get(key, []),
        })

    # 2. Management access (SSH, TELNET, HTTP, HTTPS)
    for mgmt in normalized.management_access:
        proto = mgmt.protocol.upper()
        sec = mgmt.security.upper()
        key = f"{proto}_{'ENABLED' if mgmt.enabled else 'DISABLED'}"
        if sec == "INSECURE":
            key += "_INSECURE"
        states.append({
            "key": key,
            "label": f"{proto} {'Enabled' if mgmt.enabled else 'Disabled'} ({sec})",
            "status": "INSECURE" if sec == "INSECURE" else ("ENABLED" if mgmt.enabled else "DISABLED"),
            "raw_statement": mgmt.raw_statement,
            "compliance": CONVERGENCE_COMPLIANCE_MAPPINGS.get(
                f"{proto}_{'ENABLED' if mgmt.enabled else 'DISABLED'}", []
            ),
        })

    # 3. Firewall rules — flag any-any and logging issues
    for rule in normalized.firewall_rules:
        if rule.is_any_any:
            states.append({
                "key": "ACL_ANY_ANY",
                "label": f"Permit Any→Any (Rule {rule.rule_id})",
                "status": "VIOLATION",
                "raw_statement": rule.raw_statement,
                "compliance": CONVERGENCE_COMPLIANCE_MAPPINGS.get("ACL_ANY_ANY", []),
            })
        if not rule.logging_enabled:
            states.append({
                "key": "FIREWALL_LOGGING_DISABLED",
                "label": f"Logging Disabled (Rule {rule.rule_id})",
                "status": "VIOLATION",
                "raw_statement": rule.raw_statement,
                "compliance": CONVERGENCE_COMPLIANCE_MAPPINGS.get("FIREWALL_LOGGING_DISABLED", []),
            })

    return states


@router.get("/convergence/demo")
async def get_semantic_convergence_demo():
    """
    Semantic Convergence Demo: runs real NormalizerService on the three insecure
    sample configs and returns structured semantic states per vendor plus a
    universal security state intersection — all without fabrication.
    """
    vendor_configs = [
        ("Cisco",    "cisco_insecure.cfg"),
        ("Fortinet", "fortigate_insecure.conf"),
        ("Juniper",  "juniper_insecure.conf"),
    ]

    results = {}
    for vendor_name, filename in vendor_configs:
        path = os.path.join(settings.SAMPLE_CONFIGS_DIR, filename)
        if not os.path.exists(path):
            results[vendor_name] = {
                "error": f"Sample file {filename} not found",
                "raw_content": "",
                "semantic_states": [],
                "line_count": 0,
            }
            continue

        with open(path, "r", encoding="utf-8", errors="replace") as f:
            raw_content = f.read()

        try:
            vendor, normalized, _ = NormalizerService.normalize_configuration(
                raw_content, filename, vendor_name
            )
            semantic_states = _extract_semantic_states(vendor_name, normalized)
        except Exception as exc:
            semantic_states = []
            normalized = None

        results[vendor_name] = {
            "vendor": vendor_name,
            "filename": filename,
            "raw_content": raw_content,
            "line_count": len(raw_content.splitlines()),
            "device": {
                "hostname": normalized.device.hostname if normalized else "Unknown",
                "platform": normalized.device.platform if normalized else None,
            },
            "semantic_states": semantic_states,
            "total_objects": normalized.total_objects if normalized else 0,
        }

    # Build universal state: keys that appear in all three vendors
    all_keys = [
        {s["key"] for s in results.get(v, {}).get("semantic_states", [])}
        for v in ["Cisco", "Fortinet", "Juniper"]
    ]
    universal_keys = all_keys[0] & all_keys[1] & all_keys[2] if len(all_keys) == 3 else set()

    # Build universal states with compliance mappings
    universal_states = []
    for key in sorted(universal_keys):
        universal_states.append({
            "key": key,
            "label": key.replace("_", " ").title(),
            "compliance": CONVERGENCE_COMPLIANCE_MAPPINGS.get(key, []),
            "vendors_matched": ["Cisco", "Fortinet", "Juniper"],
        })

    # Compute total unique semantic facts across all vendors
    all_state_keys = set()
    for v_data in results.values():
        for s in v_data.get("semantic_states", []):
            all_state_keys.add(s["key"])

    return {
        "vendors": results,
        "universal_states": universal_states,
        "total_unique_states": len(all_state_keys),
        "convergence_possible": len(universal_keys) > 0,
    }
