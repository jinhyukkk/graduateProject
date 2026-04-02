"""
Pydantic schemas for /api/config and /api/health endpoints.
"""

from pydantic import BaseModel


class LLMConfig(BaseModel):
    model: str
    temperature: float
    max_tokens: int


class CorrectionConfig(BaseModel):
    max_rounds: int
    semantic_threshold: float


class DatasetInfo(BaseModel):
    id: str
    label: str
    dev_count: int


class ConfigResponse(BaseModel):
    llm: LLMConfig
    correction: CorrectionConfig
    available_models: list[str]
    available_datasets: list[DatasetInfo]


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
