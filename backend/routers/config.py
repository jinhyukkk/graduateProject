"""
Router: /api/config, /api/health
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from backend.schemas.config import ConfigResponse, HealthResponse
from backend.services.tsql_service import CONFIG, _estimate_sample_count

router = APIRouter(prefix="/api", tags=["config"])


AVAILABLE_MODELS = [
    "gpt-4o-2024-11-20",
    "gpt-4o-mini",
    "gpt-4-turbo",
]


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Server health check."""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Return current system configuration."""
    hrdb_count = _estimate_sample_count("hrdb", None)
    bird_count = _estimate_sample_count("bird", None)

    return ConfigResponse(
        llm={
            "model": CONFIG["llm"]["model"],
            "temperature": CONFIG["llm"]["temperature"],
            "max_tokens": CONFIG["llm"]["max_tokens"],
        },
        correction={
            "max_rounds": CONFIG["correction"]["max_rounds"],
            "semantic_threshold": CONFIG["correction"]["semantic_threshold"],
        },
        available_models=AVAILABLE_MODELS,
        available_datasets=[
            {"id": "hrdb", "label": "HR-DB", "dev_count": hrdb_count},
            {"id": "bird", "label": "BIRD", "dev_count": bird_count},
        ],
    )
