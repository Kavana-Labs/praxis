import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_executor
from app.executors.fake_executor import FakeExecutor
from app.executors.subprocess_executor import SubprocessExecutor


@pytest.fixture
def fake_client():
    """TestClient whose executor is the deterministic fake backend."""
    app.dependency_overrides[get_executor] = lambda: FakeExecutor()
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def subprocess_client():
    """TestClient backed by the real subprocess executor (no Docker needed)."""
    app.dependency_overrides[get_executor] = lambda: SubprocessExecutor()
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def subprocess_executor():
    return SubprocessExecutor()
