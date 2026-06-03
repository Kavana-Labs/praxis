"""Praxis Execution Service.

A small FastAPI service that runs untrusted scientific Python in an isolated
sandbox and returns structured results + artifacts. It owns computation only —
no auth, no documents, no editor state (see docs/architecture/executor.md).
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.execute import router as execute_router
from app.api.health import router as health_router
from app.config import settings

app = FastAPI(title="Praxis Execution Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(execute_router)
