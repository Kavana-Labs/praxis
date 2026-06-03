"""Python execution endpoint."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.dependencies import get_executor
from app.executors import Executor
from app.executors.docker_executor import DockerUnavailable
from app.models import (
    ErrorCategory,
    ExecuteRequest,
    ExecuteResponse,
    ExecutionStatus,
)

router = APIRouter()


@router.post(
    "/execute/python",
    response_model=ExecuteResponse,
    response_model_by_alias=True,
    tags=["execution"],
)
def execute_python(request: ExecuteRequest, executor: Executor = Depends(get_executor)):
    execution_id = str(uuid.uuid4())

    try:
        return executor.execute(request, execution_id)
    except DockerUnavailable as exc:
        # Service-unavailable: the sandbox cannot run. Fail loudly (503) with a
        # clear, structured message instead of executing unsafely.
        body = ExecuteResponse(
            execution_id=execution_id,
            status=ExecutionStatus.ERROR,
            stderr=str(exc),
            error_category=ErrorCategory.INTERNAL_ERROR,
        )
        return JSONResponse(status_code=503, content=body.model_dump(by_alias=True))
    except Exception as exc:  # noqa: BLE001 - never leak a stack trace to the client
        body = ExecuteResponse(
            execution_id=execution_id,
            status=ExecutionStatus.ERROR,
            stderr=f"Internal execution error: {type(exc).__name__}",
            error_category=ErrorCategory.INTERNAL_ERROR,
        )
        return JSONResponse(status_code=500, content=body.model_dump(by_alias=True))
