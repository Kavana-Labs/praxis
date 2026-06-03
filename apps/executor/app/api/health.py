"""Health endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.config import settings
from app.dependencies import get_executor
from app.executors import Executor

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}


@router.get("/health/executor", tags=["health"])
def executor_health(executor: Executor = Depends(get_executor)):
    """Reports whether the configured backend can actually run jobs."""
    try:
        executor.healthcheck()
        return {"status": "ok", "backend": executor.name}
    except Exception as exc:  # noqa: BLE001 - surface the reason to the operator
        return {
            "status": "unavailable",
            "backend": settings.backend,
            "reason": str(exc),
        }
