"""Docker executor: one isolated, resource-limited container per job.

This is the safe default for untrusted code. Each execution runs a fresh
container from the runner image with:

  * no network (``--network none``)
  * read-only root filesystem + a small writable tmpfs
  * memory / CPU / pid limits
  * all Linux capabilities dropped, no-new-privileges, non-root user
  * only a controlled output directory bind-mounted writable

If Docker or the runner image is unavailable the service fails loudly with setup
instructions rather than silently falling back to unsafe execution.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import time

from app.config import settings
from app.models import ExecuteRequest, ExecuteResponse
from .base import Executor, build_response

SETUP_HINT = (
    "Docker is required for the default execution backend. Ensure Docker is "
    "running and build the runner image:\n"
    "  docker build -t praxis-runner:latest apps/executor/runner\n"
    "Or run the service with EXECUTOR_BACKEND=subprocess for trusted local dev."
)


class DockerUnavailable(RuntimeError):
    pass


class DockerExecutor(Executor):
    name = "docker"

    def __init__(self, image: str | None = None):
        self.image = image or settings.runner_image

    def healthcheck(self) -> None:
        try:
            proc = subprocess.run(
                ["docker", "version", "--format", "{{.Server.Version}}"],
                capture_output=True,
                text=True,
                timeout=10,
            )
        except FileNotFoundError as exc:
            raise DockerUnavailable(f"`docker` not found.\n{SETUP_HINT}") from exc
        except subprocess.TimeoutExpired as exc:
            raise DockerUnavailable(f"Docker did not respond.\n{SETUP_HINT}") from exc
        if proc.returncode != 0:
            raise DockerUnavailable(
                f"Docker daemon is not available.\n{SETUP_HINT}\n{proc.stderr.strip()}"
            )

        inspect = subprocess.run(
            ["docker", "image", "inspect", self.image],
            capture_output=True,
            text=True,
        )
        if inspect.returncode != 0:
            raise DockerUnavailable(
                f"Runner image '{self.image}' is not built.\n{SETUP_HINT}"
            )

    def execute(self, request: ExecuteRequest, execution_id: str) -> ExecuteResponse:
        self.healthcheck()  # raises DockerUnavailable with a clear message

        workdir = tempfile.mkdtemp(prefix="praxis-job-")
        code_dir = os.path.join(workdir, "code")
        output_dir = os.path.join(workdir, "output")
        os.makedirs(code_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        # The container runs as uid 10001; let it write artifacts here.
        os.chmod(output_dir, 0o777)
        with open(os.path.join(code_dir, "code.py"), "w", encoding="utf-8") as fh:
            fh.write(request.code)

        container = f"praxis-job-{execution_id}"
        mem = f"{settings.max_memory_mb}m"
        cmd = [
            "docker", "run", "--rm",
            "--name", container,
            "--network", "none",
            "--memory", mem,
            "--memory-swap", mem,
            "--cpus", "1.0",
            "--pids-limit", str(settings.max_processes),
            "--ulimit", f"cpu={settings.max_cpu_seconds}",
            "--read-only",
            "--tmpfs", "/tmp:rw,size=64m,mode=1777",
            "--security-opt", "no-new-privileges",
            "--cap-drop", "ALL",
            "--user", "10001:10001",
            "-e", "MPLBACKEND=Agg",
            "-e", "MPLCONFIGDIR=/tmp",
            "-e", "HOME=/tmp",
            "-e", "PRAXIS_OUTPUT_DIR=/workspace/output",
            "-v", f"{code_dir}:/workspace/code:ro",
            "-v", f"{output_dir}:/workspace/output",
            self.image,
            "python", "/opt/run_user_code.py", "/workspace/code/code.py",
        ]

        timed_out = False
        stdout = stderr = ""
        exit_code = 1
        started = time.monotonic()
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=request.timeout_seconds + 5,  # grace over the in-container limit
            )
            stdout, stderr, exit_code = proc.stdout, proc.stderr, proc.returncode
        except subprocess.TimeoutExpired:
            timed_out = True
            exit_code = -1
            subprocess.run(["docker", "rm", "-f", container], capture_output=True)
        finally:
            duration_ms = int((time.monotonic() - started) * 1000)

        response = build_response(
            execution_id=execution_id,
            stdout=stdout,
            stderr=stderr,
            exit_code=exit_code,
            duration_ms=duration_ms,
            timed_out=timed_out,
            output_dir=output_dir,
        )
        shutil.rmtree(workdir, ignore_errors=True)
        return response
