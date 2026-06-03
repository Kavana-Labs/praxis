"""Shared FastAPI dependencies."""

from __future__ import annotations

from functools import lru_cache

from app.executors import Executor, build_executor


@lru_cache(maxsize=1)
def _executor_singleton() -> Executor:
    return build_executor()


def get_executor() -> Executor:
    """Dependency returning the configured executor (overridable in tests)."""
    return _executor_singleton()
