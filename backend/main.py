"""
SC-TSQL Dashboard Backend -- FastAPI entry point.

Run with:
    cd backend
    uvicorn main:app --reload --port 8000

Or from project root:
    uvicorn backend.main:app --reload --port 8000
"""

import sys
import os

# Ensure project root is on sys.path for src/ imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Also ensure the backend package itself is importable when running from backend/
BACKEND_PARENT = os.path.dirname(os.path.abspath(__file__))
BACKEND_PARENT_DIR = os.path.dirname(BACKEND_PARENT)
if BACKEND_PARENT_DIR not in sys.path:
    sys.path.insert(0, BACKEND_PARENT_DIR)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import query, experiment, config

app = FastAPI(
    title="SC-TSQL Dashboard API",
    description="Backend API for the SC-TSQL Text-to-SQL experiment dashboard.",
    version="1.0.0",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ── Routers ──
app.include_router(config.router)
app.include_router(query.router)
app.include_router(experiment.router)
