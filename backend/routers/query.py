"""
Router: /api/databases, /api/query
"""

from fastapi import APIRouter, HTTPException

from backend.schemas.query import (
    DatabaseListResponse,
    QueryRequest,
    QueryResponse,
)
from backend.services.tsql_service import scan_databases, run_query

router = APIRouter(prefix="/api", tags=["query"])


@router.get("/databases", response_model=DatabaseListResponse)
async def get_databases():
    """Return list of available SQLite databases."""
    try:
        databases = scan_databases()
        return {"databases": databases}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan database directories: {e}")


@router.post("/query", response_model=QueryResponse)
async def execute_query(req: QueryRequest):
    """Execute SC-TSQL pipeline for a single natural-language query."""
    try:
        result = run_query(
            query=req.query,
            db_id=req.db_id,
            dataset=req.dataset,
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {e}")
