import os
import hmac
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from backend.app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class AISettingsUpdate(BaseModel):
    api_key: str
    model: str = "meta/llama-3.2-11b-vision-instruct"

@router.get("")
async def get_settings():
    has_key = bool(settings.NVIDIA_API_KEY or os.getenv("NVIDIA_API_KEY"))
    masked_key = None
    if has_key and settings.NVIDIA_API_KEY:
        raw = settings.NVIDIA_API_KEY
        masked_key = f"{raw[:6]}...{raw[-4:]}" if len(raw) > 12 else "configured"

    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "sih_problem_id": settings.SIH_PROBLEM_ID,
        "team_name": settings.TEAM_NAME,
        "theme": settings.THEME,
        "ai_active": has_key,
        "ai_provider": "NVIDIA OpenAI-Compatible API" if has_key else "Deterministic Fallback Engine",
        "current_model": settings.NVIDIA_MODEL,
        "base_url": settings.NVIDIA_BASE_URL,
        "api_key_configured": has_key,
        "api_key_masked": masked_key,
        "supported_vendors": ["Cisco", "Fortinet", "Juniper"],
        "compliance_frameworks": [
            "NIST Cybersecurity Framework (CSF) 2.0",
            "NIST SP 800-53 Rev. 5",
            "CIS Benchmarks",
            "ISO/IEC 27001:2022",
            "PCI DSS v4.0.1",
            "MITRE ATT&CK"
        ]
    }

@router.post("/ai")
async def update_ai_settings(
    req: AISettingsUpdate,
    x_admin_token: str = Header(None)
):
    # Constant-time comparison to prevent timing attacks
    expected_token = settings.ADMIN_TOKEN or ""
    if not x_admin_token or not hmac.compare_digest(x_admin_token, expected_token):
        raise HTTPException(status_code=401, detail="Invalid admin token")

    new_key = req.api_key.strip()
    new_model = req.model.strip()

    # Update in-memory runtime settings cleanly (never write to disk .env at runtime)
    settings.NVIDIA_API_KEY = new_key
    settings.NVIDIA_MODEL = new_model
    os.environ["NVIDIA_API_KEY"] = new_key
    os.environ["NVIDIA_MODEL"] = new_model

    return {
        "status": "success",
        "message": "NVIDIA AI runtime settings updated successfully",
        "ai_provider": "NVIDIA OpenAI-Compatible API",
        "model": settings.NVIDIA_MODEL
    }
