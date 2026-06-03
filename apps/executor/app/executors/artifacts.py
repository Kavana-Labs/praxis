"""Discover and encode artifacts produced in the sandbox output directory."""

from __future__ import annotations

import base64
import os
import uuid
from typing import List

from app.config import settings
from app.models import Artifact

# Supported artifact formats -> (kind, mime type).
_EXT_MAP = {
    ".png": ("image", "image/png"),
    ".jpg": ("image", "image/jpeg"),
    ".jpeg": ("image", "image/jpeg"),
    ".svg": ("image", "image/svg+xml"),
    ".gif": ("image", "image/gif"),
    ".txt": ("text", "text/plain"),
    ".json": ("json", "application/json"),
    ".csv": ("text", "text/csv"),
}


def collect_artifacts(output_dir: str) -> List[Artifact]:
    """Scan ``output_dir`` and return artifact descriptors with inline data URLs.

    Unsupported file types are skipped with their existence still implied by the
    omission; the count is bounded by ``settings.max_artifacts`` and each file by
    ``settings.max_artifact_bytes``.
    """
    artifacts: List[Artifact] = []
    if not os.path.isdir(output_dir):
        return artifacts

    names = sorted(os.listdir(output_dir))
    for name in names:
        if len(artifacts) >= settings.max_artifacts:
            break
        path = os.path.join(output_dir, name)
        if not os.path.isfile(path):
            continue

        ext = os.path.splitext(name)[1].lower()
        kind, mime = _EXT_MAP.get(ext, ("data", "application/octet-stream"))

        size = os.path.getsize(path)
        if size > settings.max_artifact_bytes:
            # Too large to inline; report metadata without content.
            artifacts.append(
                Artifact(
                    artifact_id=str(uuid.uuid4()),
                    type=kind,
                    mime_type=mime,
                    filename=name,
                    size_bytes=size,
                    data_url=None,
                )
            )
            continue

        with open(path, "rb") as fh:
            raw = fh.read()
        encoded = base64.b64encode(raw).decode("ascii")
        data_url = f"data:{mime};base64,{encoded}"

        artifacts.append(
            Artifact(
                artifact_id=str(uuid.uuid4()),
                type=kind,
                mime_type=mime,
                filename=name,
                size_bytes=size,
                data_url=data_url,
            )
        )

    return artifacts
