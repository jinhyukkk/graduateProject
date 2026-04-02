"""
Pydantic schemas for /api/experiments endpoints.
"""

from pydantic import BaseModel, Field


# ── Experiment creation ──

class ExperimentCreateRequest(BaseModel):
    dataset: str = Field(..., description="spider | bird")
    model: str | None = Field(default=None, description="LLM model name")
    max_rounds: int = Field(default=3, ge=1, le=5)
    semantic_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    sample_count: int | None = Field(default=None, ge=1)


class ExperimentConfig(BaseModel):
    dataset: str
    model: str
    max_rounds: int
    semantic_threshold: float
    sample_count: int | None = None


class ExperimentCreateResponse(BaseModel):
    id: str
    status: str
    dataset: str
    config: ExperimentConfig
    created_at: str
    total_samples: int


# ── Metrics ──

class MetricsSummary(BaseModel):
    execution_accuracy: float = 0.0
    correction_success_rate: float = 0.0
    average_latency: float = 0.0
    total_evaluated: int = 0


# ── Experiment list item ──

class ExperimentListItem(BaseModel):
    id: str
    dataset: str
    status: str
    config: ExperimentConfig
    created_at: str
    metrics: MetricsSummary | None = None


class ExperimentListResponse(BaseModel):
    experiments: list[ExperimentListItem]
    total: int


# ── Experiment detail ──

class CorrectionProgress(BaseModel):
    round: int
    cumulative_accuracy: float
    newly_corrected: int


class ErrorDistribution(BaseModel):
    error_type: str
    count: int


class ExperimentDetailResponse(BaseModel):
    id: str
    dataset: str
    status: str
    config: ExperimentConfig
    created_at: str
    metrics: MetricsSummary | None = None
    correction_progress: list[CorrectionProgress] = []
    error_distribution: list[ErrorDistribution] = []


# ── Experiment results (sample-level) ──

class CorrectionHistoryEntry(BaseModel):
    round: int
    error_type: str
    original_sql: str
    corrected_sql: str
    validation_success: bool = False
    semantic_score: float = 0.0


class ExperimentResultItem(BaseModel):
    index: int
    db_id: str
    question: str
    gold_sql: str
    predicted_sql: str
    correct: bool
    latency: float
    correction_rounds: int
    correction_history: list[CorrectionHistoryEntry] = []


class ExperimentResultsResponse(BaseModel):
    results: list[ExperimentResultItem]
    total: int
    page: int
    page_size: int


# ── Single query detail within experiment ──

class ValidationInfo(BaseModel):
    success: bool
    error_type: str | None = None
    error_message: str | None = None
    is_empty: bool = False
    is_excessive: bool = False
    row_count: int = 0


class VerificationInfo(BaseModel):
    back_translation: str = ""
    similarity_score: float = 0.0
    is_consistent: bool = True
    mismatch_diagnosis: str | None = None


class QueryResultData(BaseModel):
    columns: list[str] = []
    rows: list[dict] = []


class ExperimentQueryDetail(BaseModel):
    index: int
    db_id: str
    question: str
    gold_sql: str
    predicted_sql: str
    correct: bool
    latency: float
    correction_rounds: int
    correction_history: list[CorrectionHistoryEntry] = []
    final_validation: ValidationInfo | None = None
    final_verification: VerificationInfo | None = None
    result: QueryResultData | None = None
