"""
Pydantic schemas for /api/query and /api/databases endpoints.
"""

from pydantic import BaseModel, Field


# ── Database list ──

class DatabaseInfo(BaseModel):
    id: str
    dataset: str
    table_count: int
    path: str


class DatabaseListResponse(BaseModel):
    databases: list[DatabaseInfo]


# ── Conversation history ──

class ConversationTurn(BaseModel):
    """멀티턴 대화의 단일 이전 턴."""
    question: str
    sql: str
    explanation: str = ""


# ── Query request / response ──

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language query")
    db_id: str = Field(..., min_length=1, description="Database identifier")
    dataset: str = Field(default="hrdb", description="hrdb | bird")
    # Phase 3: 멀티턴 대화 히스토리 (최대 최근 3턴 사용)
    conversation_history: list[ConversationTurn] = Field(
        default_factory=list,
        description="Previous conversation turns for multi-turn context",
    )


class ColumnInfo(BaseModel):
    name: str
    type: str
    is_primary_key: bool = False


class TableInfo(BaseModel):
    name: str
    columns: list[ColumnInfo]


class SchemaContext(BaseModel):
    tables: list[TableInfo] = []
    foreign_keys: list[dict] = []


class QueryResult(BaseModel):
    columns: list[str] = []
    rows: list[dict] = []


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


class CorrectionStep(BaseModel):
    round: int
    error_type: str
    original_sql: str
    corrected_sql: str
    validation_success: bool = False
    semantic_score: float = 0.0


class GuardrailsInfo(BaseModel):
    """Phase 3: Guardrails 적용 결과."""
    rows_truncated: bool = False
    original_row_count: int = 0
    low_confidence_warning: bool = False
    warning_message: str = ""


class QueryResponse(BaseModel):
    id: str
    query: str
    db_id: str
    original_sql: str
    final_sql: str
    was_corrected: bool
    correction_steps: list[CorrectionStep] = []
    schema_context: SchemaContext = SchemaContext()
    result: QueryResult = QueryResult()
    explanation: str = ""
    latency: float = 0.0
    validation: ValidationInfo = ValidationInfo(success=True)
    verification: VerificationInfo = VerificationInfo()
    # Phase 2
    sql_confidence: float = 0.5
    # Phase 3
    guardrails: GuardrailsInfo = GuardrailsInfo()
