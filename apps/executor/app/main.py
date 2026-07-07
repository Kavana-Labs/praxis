"""Praxis Execution Service.

A small FastAPI service that runs untrusted scientific Python in an isolated
sandbox and returns structured results + artifacts. It owns computation only —
no auth, no documents, no editor state (see docs/architecture/executor.md).
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.execute import router as execute_router
from app.api.health import router as health_router
from app.config import settings
from app.models import ErrorCategory, ExecuteResponse, ExecutionStatus

app = FastAPI(title="Praxis Execution Service", version="0.1.0")


@app.exception_handler(RequestValidationError)
def on_validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return a categorized (VALIDATION_ERROR) body for a bad request instead of
    FastAPI's default detail shape, so the client sees the same structured
    ExecuteResponse it gets for every other failure. Status stays 422."""
    first = exc.errors()[0] if exc.errors() else None
    message = "Invalid execution request."
    if first:
        loc = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        message = f"Invalid execution request: {loc} {first.get('msg', '')}".strip()
    body = ExecuteResponse(
        execution_id="",
        status=ExecutionStatus.ERROR,
        stderr=message,
        error_category=ErrorCategory.VALIDATION_ERROR,
    )
    return JSONResponse(status_code=422, content=body.model_dump(by_alias=True))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(execute_router)
