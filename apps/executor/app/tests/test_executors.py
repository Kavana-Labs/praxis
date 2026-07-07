"""Executor-backend tests.

Real execution behavior (stdout, syntax errors, timeouts, artifact discovery,
dependency errors) is verified against the SubprocessExecutor, which needs no
Docker. The FakeExecutor and DockerExecutor are covered separately.
"""

import subprocess

import pytest

from app.models import ErrorCategory, ExecutionStatus, ExecuteRequest
from app.executors.base import classify_error
from app.executors.fake_executor import FakeExecutor


def test_classify_error_flags_sandbox_violation():
    err = "OSError: [Errno 101] Network is unreachable"
    assert classify_error(err, 1, False) is ErrorCategory.SANDBOX_VIOLATION
    assert (
        classify_error("PermissionError: [Errno 13]", 1, False)
        is ErrorCategory.SANDBOX_VIOLATION
    )


def test_classify_error_defaults_to_user_code():
    assert (
        classify_error("ValueError: bad", 1, False) is ErrorCategory.USER_CODE_ERROR
    )


def run(executor, code: str, timeout: int = 10):
    return executor.execute(ExecuteRequest(code=code, timeout_seconds=timeout), "test-exec")


# ----------------------------- SubprocessExecutor -------------------------

def test_basic_success_and_stdout(subprocess_executor):
    res = run(subprocess_executor, "print('hello world')")
    assert res.status == ExecutionStatus.SUCCESS
    assert res.exit_code == 0
    assert "hello world" in res.stdout


def test_numpy_is_available(subprocess_executor):
    res = run(subprocess_executor, "import numpy as np\nprint(np.mean([1, 2, 3]))")
    assert res.status == ExecutionStatus.SUCCESS
    assert res.stdout.strip() == "2.0"


def test_runtime_error_maps_to_user_code_error(subprocess_executor):
    res = run(subprocess_executor, "raise ValueError('boom')")
    assert res.status == ExecutionStatus.ERROR
    assert res.error_category == ErrorCategory.USER_CODE_ERROR
    assert "ValueError" in res.stderr
    assert "boom" in res.stderr


def test_syntax_error_maps_to_user_code_error(subprocess_executor):
    res = run(subprocess_executor, "def oops(:\n    pass")
    assert res.status == ExecutionStatus.ERROR
    assert res.error_category == ErrorCategory.USER_CODE_ERROR
    assert "SyntaxError" in res.stderr


def test_timeout_maps_to_resource_limit(subprocess_executor):
    res = run(subprocess_executor, "import time\ntime.sleep(5)", timeout=1)
    assert res.status == ExecutionStatus.ERROR
    assert res.error_category == ErrorCategory.RESOURCE_LIMIT


def test_dependency_error(subprocess_executor):
    res = run(subprocess_executor, "import definitely_not_a_real_module_xyz")
    assert res.status == ExecutionStatus.ERROR
    assert res.error_category == ErrorCategory.DEPENDENCY_ERROR


def test_artifact_discovery(subprocess_executor):
    code = (
        "import os, json\n"
        "p = os.path.join(os.environ['PRAXIS_OUTPUT_DIR'], 'result.json')\n"
        "open(p, 'w').write(json.dumps({'ok': True}))\n"
        "print('wrote artifact')\n"
    )
    res = run(subprocess_executor, code)
    assert res.status == ExecutionStatus.SUCCESS
    assert len(res.artifacts) == 1
    art = res.artifacts[0]
    assert art.filename == "result.json"
    assert art.type == "json"
    assert art.mime_type == "application/json"
    assert art.data_url and art.data_url.startswith("data:application/json;base64,")


def test_matplotlib_png_artifact(subprocess_executor):
    code = (
        "import os\n"
        "import matplotlib\n"
        "matplotlib.use('Agg')\n"
        "import matplotlib.pyplot as plt\n"
        "plt.plot([0, 1, 2], [0, 1, 4])\n"
        "plt.savefig(os.path.join(os.environ['PRAXIS_OUTPUT_DIR'], 'plot.png'))\n"
        "print('saved')\n"
    )
    res = run(subprocess_executor, code)
    assert res.status == ExecutionStatus.SUCCESS
    pngs = [a for a in res.artifacts if a.mime_type == "image/png"]
    assert len(pngs) == 1


# ----------------------------- FakeExecutor -------------------------------

def test_fake_executor_success():
    res = run(FakeExecutor(), "print('anything')")
    assert res.status == ExecutionStatus.SUCCESS
    assert "ok" in res.stdout


def test_fake_executor_error_sentinel():
    res = run(FakeExecutor(), "# praxis:error")
    assert res.status == ExecutionStatus.ERROR
    assert res.error_category == ErrorCategory.USER_CODE_ERROR


def test_fake_executor_artifact_sentinel():
    res = run(FakeExecutor(), "# praxis:artifact")
    assert len(res.artifacts) == 1


# ----------------------------- DockerExecutor (opt-in) --------------------

def _runner_image_built() -> bool:
    try:
        r = subprocess.run(
            ["docker", "image", "inspect", "praxis-runner:latest"],
            capture_output=True,
        )
        return r.returncode == 0
    except Exception:
        return False


@pytest.mark.skipif(not _runner_image_built(), reason="praxis-runner image not built")
def test_docker_executor_runs_real_sandbox():
    from app.executors.docker_executor import DockerExecutor

    res = run(DockerExecutor(), "import numpy as np\nprint(np.mean([2, 4, 6]))")
    assert res.status == ExecutionStatus.SUCCESS
    assert res.stdout.strip() == "4.0"
