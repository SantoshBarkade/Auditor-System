import os
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
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")

    new_key = req.api_key.strip()
    new_model = req.model.strip()

    settings.NVIDIA_API_KEY = new_key
    settings.NVIDIA_MODEL = new_model
    os.environ["NVIDIA_API_KEY"] = new_key
    os.environ["NVIDIA_MODEL"] = new_model

    # Persist into .env if present
    env_file = getattr(settings.Config, "env_file", None)
    if env_file and os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
            updated = []
            found_key, found_model = False, False
            for l in lines:
                if l.startswith("NVIDIA_API_KEY="):
                    updated.append(f'NVIDIA_API_KEY="{new_key}"\n')
                    found_key = True
                elif l.startswith("NVIDIA_MODEL="):
                    updated.append(f'NVIDIA_MODEL="{new_model}"\n')
                    found_model = True
                else:
                    updated.append(l)
            if not found_key:
                updated.append(f'NVIDIA_API_KEY="{new_key}"\n')
            if not found_model:
                updated.append(f'NVIDIA_MODEL="{new_model}"\n')
            with open(env_file, "w", encoding="utf-8") as f:
                f.writelines(updated)
        except Exception:
            pass

    return {
        "status": "success",
        "message": "NVIDIA AI settings updated successfully",
        "ai_provider": "NVIDIA OpenAI-Compatible API",
        "model": settings.NVIDIA_MODEL
    }
