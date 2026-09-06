import os
from fastapi import APIRouter
from pydantic import BaseModel
from backend.app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class AISettingsUpdate(BaseModel):
    api_key: str
    model: str = "gemini-1.5-flash"

@router.get("")
async def get_settings():
    has_key = bool(settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY"))
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "sih_problem_id": settings.SIH_PROBLEM_ID,
        "team_name": settings.TEAM_NAME,
        "theme": settings.THEME,
        "ai_active": has_key,
        "ai_provider": "Google Gemini" if has_key else "Deterministic Fallback Engine",
        "current_model": settings.GEMINI_MODEL,
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
async def update_ai_settings(req: AISettingsUpdate):
    settings.GEMINI_API_KEY = req.api_key.strip()
    settings.GEMINI_MODEL = req.model.strip()
    os.environ["GEMINI_API_KEY"] = req.api_key.strip()
    return {
        "status": "success",
        "message": "AI settings updated successfully",
        "ai_provider": "Google Gemini"
    }
