"""Request/response contracts for the Praxis execution service.

Field names are serialized as camelCase to match the web client (``executionId``,
``durationMs``, ``errorCategory``), while remaining snake_case in Python.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ExecutionStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"


class ErrorCategory(str, Enum):
    USER_CODE_ERROR = "USER_CODE_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    RESOURCE_LIMIT = "RESOURCE_LIMIT"
    SANDBOX_VIOLATION = "SANDBOX_VIOLATION"
    DEPENDENCY_ERROR = "DEPENDENCY_ERROR"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class ExecuteRequest(CamelModel):
    code: str = Field(min_length=1, max_length=200_000)
    timeout_seconds: int = Field(default=10, ge=1, le=60)


class Artifact(CamelModel):
    artifact_id: str
    type: str  # image | text | json | data
    mime_type: str
    filename: str
    size_bytes: int
    # Inline base64 data URL for the local MVP; an object-storage URI replaces
    # this later without changing the contract shape.
    data_url: Optional[str] = None


class ExecuteResponse(CamelModel):
    execution_id: str
    status: ExecutionStatus
    stdout: str = ""
    stderr: str = ""
    exit_code: Optional[int] = None
    duration_ms: int = 0
    error_category: Optional[ErrorCategory] = None
    artifacts: List[Artifact] = Field(default_factory=list)
