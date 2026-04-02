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


# ── Query request / response ──

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language query")
    db_id: str = Field(..., min_length=1, description="Database identifier")
    dataset: str = Field(default="spider", description="spider | bird")


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
