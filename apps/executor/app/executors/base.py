"""Executor adapter interface and shared result construction."""

from __future__ import annotations

import abc

from app.config import settings
from app.models import (
    Artifact,
    ErrorCategory,
    ExecuteRequest,
    ExecuteResponse,
    ExecutionStatus,
)
from .artifacts import collect_artifacts


def truncate(text: str, limit: int = None) -> str:
    limit = limit if limit is not None else settings.max_output_chars
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n…[truncated, {len(text) - limit} more chars]"


def classify_error(stderr: str, exit_code: int, timed_out: bool) -> ErrorCategory:
    """Map a sandbox outcome to a standard error category."""
    if timed_out:
        return ErrorCategory.RESOURCE_LIMIT
    if "MemoryError" in stderr or exit_code == -9 or exit_code == 137:
        return ErrorCategory.RESOURCE_LIMIT
    if "ModuleNotFoundError" in stderr or "ImportError" in stderr:
        return ErrorCategory.DEPENDENCY_ERROR
    return ErrorCategory.USER_CODE_ERROR


def build_response(
    *,
    execution_id: str,
    stdout: str,
    stderr: str,
    exit_code: int,
    duration_ms: int,
    timed_out: bool,
    output_dir: str | None,
) -> ExecuteResponse:
    """Assemble a structured response from a sandbox run, including artifacts."""
    artifacts: list[Artifact] = collect_artifacts(output_dir) if output_dir else []

    if timed_out:
        return ExecuteResponse(
            execution_id=execution_id,
            status=ExecutionStatus.ERROR,
            stdout=truncate(stdout),
            stderr=truncate(stderr or f"Execution exceeded the time limit."),
            exit_code=exit_code,
            duration_ms=duration_ms,
            error_category=ErrorCategory.RESOURCE_LIMIT,
            artifacts=artifacts,
        )

    if exit_code == 0:
        return ExecuteResponse(
            execution_id=execution_id,
            status=ExecutionStatus.SUCCESS,
            stdout=truncate(stdout),
            stderr=truncate(stderr),
            exit_code=0,
            duration_ms=duration_ms,
            artifacts=artifacts,
        )

    return ExecuteResponse(
        execution_id=execution_id,
        status=ExecutionStatus.ERROR,
        stdout=truncate(stdout),
        stderr=truncate(stderr),
        exit_code=exit_code,
        duration_ms=duration_ms,
        error_category=classify_error(stderr, exit_code, timed_out),
        artifacts=artifacts,
    )


class Executor(abc.ABC):
    """A pluggable execution backend (Docker, subprocess, or fake)."""

    name: str = "base"

    @abc.abstractmethod
    def execute(self, request: ExecuteRequest, execution_id: str) -> ExecuteResponse:
        """Run the request's code and return a structured result. Must not raise
        for user-code errors — those are reported as a FAILED response."""
        raise NotImplementedError

    def healthcheck(self) -> None:
        """Raise with a clear message if this backend cannot run. Default: ok."""
        return None
