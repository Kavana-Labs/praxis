"""Executor backend selection."""

from __future__ import annotations

from app.config import settings
from .base import Executor
from .docker_executor import DockerExecutor
from .fake_executor import FakeExecutor
from .subprocess_executor import SubprocessExecutor

__all__ = [
    "Executor",
    "DockerExecutor",
    "SubprocessExecutor",
    "FakeExecutor",
    "build_executor",
]


def build_executor(backend: str | None = None) -> Executor:
    """Instantiate the configured executor backend."""
    backend = (backend or settings.backend).lower()
    if backend == "docker":
        return DockerExecutor()
    if backend == "subprocess":
        return SubprocessExecutor()
    if backend == "fake":
        return FakeExecutor()
    raise ValueError(
        f"Unknown EXECUTOR_BACKEND '{backend}'. Use one of: docker, subprocess, fake."
    )
