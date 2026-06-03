"""Convenience entrypoint so `uvicorn main:app` also works.

The canonical app lives in `app.main`; prefer `uvicorn app.main:app`.
"""

from app.main import app

__all__ = ["app"]
