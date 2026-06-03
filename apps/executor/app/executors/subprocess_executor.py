"""Host-subprocess executor.

Runs user code in a child Python process with best-effort resource limits
(memory, CPU time, process count, file size) and a wall-clock timeout. This is
NOT a security sandbox — there is no namespace/network isolation — so it is for
TRUSTED/local-dev use and for the test suite only. Untrusted code should use the
DockerExecutor. The backend is never selected silently: it must be requested via
``EXECUTOR_BACKEND=subprocess``.
"""

from __future__ import annotations

import os
import resource
import subprocess
import sys
import tempfile
import time

from app.config import settings
from app.models import ExecuteRequest, ExecuteResponse
from .base import Executor, build_response

_RUNNER = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "runner", "run_user_code.py")
)


def _limits():
    """preexec_fn applying RLIMITs in the child before exec."""
    mem_bytes = settings.max_memory_mb * 1024 * 1024
    try:
        resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
    except (ValueError, OSError):
        pass
    try:
        cpu = settings.max_cpu_seconds
        resource.setrlimit(resource.RLIMIT_CPU, (cpu, cpu))
    except (ValueError, OSError):
        pass
    try:
        fsize = settings.max_artifact_bytes
        resource.setrlimit(resource.RLIMIT_FSIZE, (fsize, fsize))
    except (ValueError, OSError):
        pass
    try:
        resource.setrlimit(
            resource.RLIMIT_NPROC, (settings.max_processes, settings.max_processes)
        )
    except (ValueError, OSError):
        pass


class SubprocessExecutor(Executor):
    name = "subprocess"

    def execute(self, request: ExecuteRequest, execution_id: str) -> ExecuteResponse:
        workdir = tempfile.mkdtemp(prefix="praxis-job-")
        code_dir = os.path.join(workdir, "code")
        output_dir = os.path.join(workdir, "output")
        os.makedirs(code_dir, exist_ok=True)
        os.makedirs(output_dir, exist_ok=True)
        code_path = os.path.join(code_dir, "code.py")
        with open(code_path, "w", encoding="utf-8") as fh:
            fh.write(request.code)

        env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "HOME": workdir,
            "TMPDIR": workdir,
            "MPLBACKEND": "Agg",
            "MPLCONFIGDIR": workdir,
            "PRAXIS_OUTPUT_DIR": output_dir,
            "PYTHONDONTWRITEBYTECODE": "1",
        }

        timed_out = False
        stdout = ""
        stderr = ""
        exit_code = 1
        started = time.monotonic()
        try:
            proc = subprocess.run(
                [sys.executable, _RUNNER, code_path],
                cwd=workdir,
                env=env,
                capture_output=True,
                text=True,
                timeout=request.timeout_seconds,
                preexec_fn=_limits if os.name == "posix" else None,
            )
            stdout, stderr, exit_code = proc.stdout, proc.stderr, proc.returncode
        except subprocess.TimeoutExpired as exc:
            timed_out = True
            stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
            stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")
            exit_code = -1
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

        # Clean up the temp workspace.
        import shutil

        shutil.rmtree(workdir, ignore_errors=True)
        return response
