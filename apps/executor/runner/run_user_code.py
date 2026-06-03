#!/usr/bin/env python3
"""Sandbox entrypoint: execute a user's Python file as __main__.

Runs identically inside a Docker container (DockerExecutor) or a host
subprocess (SubprocessExecutor). It captures nothing itself — the parent
process captures stdout/stderr and the exit code, and scans the output
directory for artifacts. This script's only jobs are:

  * point matplotlib at a non-interactive backend and a writable cache dir,
  * ensure the artifact output directory exists,
  * execute the user code and surface a clean traceback on failure.
"""

import os
import sys
import traceback

OUTPUT_DIR = os.environ.get("PRAXIS_OUTPUT_DIR", "/workspace/output")


def main() -> int:
    code_path = sys.argv[1] if len(sys.argv) > 1 else os.environ.get(
        "PRAXIS_CODE", "/workspace/code/code.py"
    )

    # Headless plotting + a writable config dir (root fs may be read-only).
    os.environ.setdefault("MPLBACKEND", "Agg")
    os.environ.setdefault("MPLCONFIGDIR", os.environ.get("TMPDIR", "/tmp"))

    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    except OSError:
        pass

    try:
        with open(code_path, "r", encoding="utf-8") as fh:
            source = fh.read()
    except OSError as exc:
        print(f"Failed to read user code: {exc}", file=sys.stderr)
        return 1

    globals_ns = {"__name__": "__main__", "__file__": code_path, "__builtins__": __builtins__}

    try:
        compiled = compile(source, "<user_code>", "exec")
        exec(compiled, globals_ns)  # noqa: S102 - sandboxed user code
    except SystemExit as exc:  # respect explicit sys.exit()
        return int(exc.code) if isinstance(exc.code, int) else 0
    except SyntaxError:
        # Syntax errors have no user frame to drop.
        traceback.print_exc()
        return 1
    except BaseException:  # noqa: BLE001 - report any user error
        exc_type, exc_value, tb = sys.exc_info()
        # Drop this runner's frame so the traceback reads like the user's own.
        user_tb = tb.tb_next if tb is not None else None
        traceback.print_exception(exc_type, exc_value, user_tb)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
