"""Deterministic fake executor — no real code execution.

Used by the automated test-suite and as a zero-dependency demo backend. It
recognizes a few sentinels in the submitted code so tests can exercise each
response shape without spawning processes or containers:

    # praxis:error      -> USER_CODE_ERROR
    # praxis:timeout    -> RESOURCE_LIMIT (timed out)
    # praxis:artifact   -> success with one PNG artifact
    (anything else)     -> success, echoing a canned stdout line
"""

from __future__ import annotations

from app.models import (
    Artifact,
    ErrorCategory,
    ExecuteRequest,
    ExecuteResponse,
    ExecutionStatus,
)
from .base import Executor

# 1x1 transparent PNG.
_TINY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


class FakeExecutor(Executor):
    name = "fake"

    def execute(self, request: ExecuteRequest, execution_id: str) -> ExecuteResponse:
        code = request.code

        if "# praxis:timeout" in code:
            return ExecuteResponse(
                execution_id=execution_id,
                status=ExecutionStatus.ERROR,
                stdout="",
                stderr="Execution exceeded the time limit.",
                exit_code=-1,
                duration_ms=request.timeout_seconds * 1000,
                error_category=ErrorCategory.RESOURCE_LIMIT,
                artifacts=[],
            )

        if "# praxis:error" in code or "1/0" in code:
            return ExecuteResponse(
                execution_id=execution_id,
                status=ExecutionStatus.ERROR,
                stdout="",
                stderr="Traceback (most recent call last):\nZeroDivisionError: division by zero",
                exit_code=1,
                duration_ms=12,
                error_category=ErrorCategory.USER_CODE_ERROR,
                artifacts=[],
            )

        artifacts = []
        if "# praxis:artifact" in code or "savefig" in code:
            artifacts = [
                Artifact(
                    artifact_id="fake-artifact-1",
                    type="image",
                    mime_type="image/png",
                    filename="plot.png",
                    size_bytes=68,
                    data_url=_TINY_PNG,
                )
            ]

        return ExecuteResponse(
            execution_id=execution_id,
            status=ExecutionStatus.SUCCESS,
            stdout="fake-executor: ok\n",
            stderr="",
            exit_code=0,
            duration_ms=8,
            artifacts=artifacts,
        )
