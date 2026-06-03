# Praxis Execution Service

A small, standalone **FastAPI** service that runs untrusted scientific Python in an isolated
sandbox and returns structured results + artifacts. It owns **computation only** — no
authentication, no documents, no editor/slide state. Source: `apps/executor`.

> The platform orchestrates. The executor computes.

---

## 1. API contract

All field names are camelCase over the wire.

### `GET /health`

```json
{ "status": "ok" }
```

### `GET /health/executor`

Reports whether the configured backend can actually run jobs.

```json
{ "status": "ok", "backend": "docker" }
// or
{ "status": "unavailable", "backend": "docker", "reason": "Runner image 'praxis-runner:latest' is not built. ..." }
```

### `POST /execute/python`

Request:

```json
{ "code": "import numpy as np\nprint(np.mean([1, 2, 3]))", "timeoutSeconds": 10 }
```

- `code` — required, 1–200000 chars.
- `timeoutSeconds` — optional, 1–60 (default 10).

Success response:

```json
{
  "executionId": "uuid",
  "status": "success",
  "stdout": "2.0\n",
  "stderr": "",
  "exitCode": 0,
  "durationMs": 125,
  "artifacts": [
    { "artifactId": "uuid", "type": "image", "mimeType": "image/png",
      "filename": "harmonic.png", "sizeBytes": 39196, "dataUrl": "data:image/png;base64,..." }
  ]
}
```

Failure response:

```json
{
  "executionId": "uuid",
  "status": "error",
  "stdout": "",
  "stderr": "Traceback ...\nZeroDivisionError: division by zero",
  "exitCode": 1,
  "durationMs": 75,
  "errorCategory": "USER_CODE_ERROR",
  "artifacts": []
}
```

HTTP status codes: `200` for both success and user-code failure; `422` for invalid requests;
`503` when the sandbox backend itself is unavailable (e.g. Docker not running); `500` for an
internal error.

### Error categories

`USER_CODE_ERROR`, `VALIDATION_ERROR`, `RESOURCE_LIMIT`, `SANDBOX_VIOLATION`,
`DEPENDENCY_ERROR`, `INTERNAL_ERROR`. Mapping heuristics live in `app/executors/base.py`
(timeouts → `RESOURCE_LIMIT`, `ModuleNotFoundError`/`ImportError` → `DEPENDENCY_ERROR`, etc.).

---

## 2. Backends (adapters)

Selected by `EXECUTOR_BACKEND`:

| Backend | Isolation | Use |
| --- | --- | --- |
| `docker` (default) | One ephemeral container per job | Untrusted code (safe) |
| `subprocess` | Host subprocess + rlimits + timeout | **Trusted/local dev only** — not a sandbox |
| `fake` | None (deterministic canned results) | Automated tests / offline |

The service **fails loudly** if `docker` is selected but unavailable — it never silently falls
back to unsafe execution.

---

## 3. Docker sandbox model

Each job runs a fresh container from the `praxis-runner` image with:

- `--network none` — no inbound or outbound network.
- `--read-only` root filesystem + a small writable `tmpfs /tmp`.
- `--memory`, `--memory-swap`, `--cpus`, `--pids-limit`, and a CPU-seconds `--ulimit`.
- `--cap-drop ALL`, `--security-opt no-new-privileges`, non-root `--user 10001:10001`.
- Only a controlled `/workspace/output` directory bind-mounted writable; user code is mounted
  read-only.
- A wall-clock timeout enforced by the parent (the container is force-removed on timeout).

The runner image (`apps/executor/runner/Dockerfile`) pre-installs NumPy, SymPy, Matplotlib, and
pandas. No runtime `pip install` is permitted.

---

## 4. Artifact flow

1. User code writes files into `/workspace/output` (e.g. `plt.savefig("/workspace/output/x.png")`).
2. After execution the service scans that directory.
3. Supported formats — PNG, JPEG, SVG, GIF, TXT, CSV, JSON — are returned as artifact metadata
   with an inline base64 **data URL** (bounded by size and count).
4. The web client offers image artifacts an **“Insert into slide”** action, which creates an
   `ArtifactObject` (backed by an asset) on the current slide, traceable to its `executionId`.

For the local MVP, artifacts are inlined as data URLs behind an asset abstraction; an external
object-storage URI can replace this without changing the contract.

---

## 5. Security assumptions & limitations

- **All input is hostile by default.** The Docker backend is the only one suitable for untrusted
  code.
- Outputs are bounded and truncated; stdout/stderr have a character cap.
- The `subprocess` backend has no namespace/network isolation — its rlimits are best-effort and
  platform-dependent (notably weaker on macOS). Do not expose it to untrusted users.
- The service holds no secrets and has no access to platform/database credentials.
- MVP execution is synchronous; the request/response contract is intentionally compatible with a
  future asynchronous job queue.

---

## 6. Local setup

```bash
cd apps/executor
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

docker build -t praxis-runner:latest runner   # one-time, Docker running
uvicorn app.main:app --reload --port 8000      # EXECUTOR_BACKEND=docker by default

# Tests:
pytest        # Docker test is skipped automatically if the runner image isn't built
```

Environment variables: `EXECUTOR_BACKEND`, `EXECUTOR_TIMEOUT_SECONDS`, `EXECUTOR_MAX_MEMORY_MB`,
`EXECUTOR_MAX_CPU_SECONDS`, `EXECUTOR_MAX_PROCESSES`, `EXECUTOR_RUNNER_IMAGE`,
`EXECUTOR_CORS_ORIGINS`.
