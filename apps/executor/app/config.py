"""Runtime configuration for the execution service (environment-driven)."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # Which executor backend to use:
    #   docker     - one isolated container per job (default; safe for untrusted code)
    #   subprocess - host subprocess with resource limits (TRUSTED/dev use only)
    #   fake       - deterministic, no real execution (tests)
    backend: str = os.getenv("EXECUTOR_BACKEND", "docker")

    # Resource limits applied to every job.
    timeout_seconds: int = int(os.getenv("EXECUTOR_TIMEOUT_SECONDS", "10"))
    max_memory_mb: int = int(os.getenv("EXECUTOR_MAX_MEMORY_MB", "512"))
    max_cpu_seconds: int = int(os.getenv("EXECUTOR_MAX_CPU_SECONDS", "15"))
    max_processes: int = int(os.getenv("EXECUTOR_MAX_PROCESSES", "64"))

    # Output bounds.
    max_output_chars: int = int(os.getenv("EXECUTOR_MAX_OUTPUT_CHARS", "20000"))
    max_artifacts: int = int(os.getenv("EXECUTOR_MAX_ARTIFACTS", "20"))
    max_artifact_bytes: int = int(
        os.getenv("EXECUTOR_MAX_ARTIFACT_BYTES", str(8 * 1024 * 1024))
    )

    # Docker backend.
    runner_image: str = os.getenv("EXECUTOR_RUNNER_IMAGE", "praxis-runner:latest")

    # CORS origins for the web client (comma-separated).
    cors_origins: str = os.getenv(
        "EXECUTOR_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )


settings = Settings()
