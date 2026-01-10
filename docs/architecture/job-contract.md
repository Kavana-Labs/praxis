# Job Contracts (Execution Orchestration)

This document defines the **contract** between the Platform API and the Execution Layer.

It specifies:
- Job creation inputs (payload schema)
- Job lifecycle and status transitions
- Idempotency + deduplication strategy
- Result payloads and artifact references
- Failure semantics and retry rules

This contract is **view-agnostic** and remains valid across:
- MVP structured slide canvas
- Future immersive scientific computation canvas

---

## 1. Principles

1. **Platform orchestrates, executor computes**
   - Platform never executes user code.
2. **Deterministic, traceable execution**
   - Every job references a specific document revision and object(s).
3. **Immutable artifacts**
   - Outputs are stored as immutable artifacts; jobs reference them.
4. **Idempotent by design**
   - Identical inputs should return identical results without re-running where possible.
5. **Bounded outputs**
   - Logs, stdout/stderr, and error payloads must be size-limited.

---

## 2. Job Types

### 2.1 `object_execute` (MVP)
Execute a compute-capable scientific object (e.g., Python code cell).

### 2.2 `object_render` (MVP, optional)
Render derived outputs that do not require “full execution”, e.g.:
- LaTeX → SVG/PNG preview
- Static diagram rendering

### 2.3 `document_export` (Later)
Export document into PDF/HTML/bundle.

### 2.4 `thumbnail_generate` (Optional)
Generate thumbnails for objects or document previews.

---

## 3. Status Model

### 3.1 Status values
- `PENDING` — created, not yet queued
- `QUEUED` — placed on queue for workers
- `RUNNING` — worker claimed and started execution
- `SUCCEEDED` — completed successfully
- `FAILED` — completed with an error
- `CANCELLED` — cancelled by user/system
- `TIMED_OUT` — hit runtime/resource deadline

### 3.2 Allowed transitions
- `PENDING → QUEUED`
- `QUEUED → RUNNING`
- `RUNNING → SUCCEEDED | FAILED | CANCELLED | TIMED_OUT`
- `QUEUED → CANCELLED` (if cancelled before claim)

**Workers must not** move jobs backwards.

---

## 4. Identity & Traceability

All jobs must include:
- `job_id` (platform-generated UUID)
- `workspace_id`
- `project_id`
- `document_id`
- `document_revision_id`

For object-scoped jobs:
- `object_id` (or `object_ids`)

**Traceability requirement**
A result must be attributable to:
- the exact object content + dependencies at that revision
- parameters used
- execution environment version

---

## 5. Idempotency & Deduplication

### 5.1 Execution key
Platform computes an `execution_key` to dedupe identical work:

**Recommended formula (conceptual)**
```

execution_key = hash(
job_type +
document_revision_id +
target_object_ids +
input_hash +
env_version
)

````

Where:
- `input_hash` = hash of:
  - object content state
  - semantic dependency IDs and their pinned versions within the revision
  - runtime parameters
  - referenced datasets (by immutable digest, not filename)
- `env_version` = execution image/runtime version identifier

### 5.2 Dedupe rule
If an existing job exists with the same `execution_key` and a terminal state:
- If `SUCCEEDED`: return the previous job’s outputs/artifacts
- If `FAILED`: return the previous failure **only** if requested via a `reuse_failed` flag (default false)

### 5.3 Idempotency tokens (client-facing)
For API calls that enqueue jobs:
- accept `Idempotency-Key` header (opaque string)
- store it for a bounded time window (e.g., 24h)
- same key + same user + same endpoint + same body → same response

This prevents duplicate creation from retries.

---

## 6. Job Payload Contract (Platform → Executor)

### 6.1 Envelope (common fields)

```json
{
  "schema_version": "1.0",
  "job_id": "uuid",
  "job_type": "object_execute",
  "created_at": "2026-01-10T10:00:00Z",

  "workspace_id": "uuid",
  "project_id": "uuid",
  "document_id": "uuid",
  "document_revision_id": "uuid",

  "execution_key": "sha256:...",
  "priority": "normal",

  "requested_by": {
    "user_id": "uuid"
  },

  "limits": {
    "timeout_ms": 30000,
    "cpu_ms": 30000,
    "memory_mb": 512,
    "max_output_kb": 256,
    "max_artifacts": 50
  },

  "environment": {
    "language": "python",
    "env_version": "py-executor@2026.01.10",
    "network_access": "disabled"
  },

  "inputs": {},
  "output_spec": {}
}
````

### 6.2 `priority`

* `low` | `normal` | `high`
  Use for UX responsiveness (e.g., preview renders vs full exports).

### 6.3 `limits`

Hard requirements:

* executor must enforce limits
* platform must not allow user overrides beyond plan/quota

### 6.4 `environment.network_access`

* `disabled` by default
* if ever enabled, must be explicit and policy-controlled

---

## 7. Job-Specific Payloads

### 7.1 `object_execute`

```json
{
  "schema_version": "1.0",
  "job_id": "uuid",
  "job_type": "object_execute",

  "workspace_id": "uuid",
  "project_id": "uuid",
  "document_id": "uuid",
  "document_revision_id": "uuid",

  "execution_key": "sha256:...",

  "target": {
    "object_id": "uuid"
  },

  "inputs": {
    "object": {
      "type": "code",
      "content": { "format": "blockdoc", "value": {} },
      "dependencies": [
        { "kind": "object", "id": "uuid" },
        { "kind": "dataset", "digest": "sha256:..." }
      ],
      "runtime": {
        "language": "python",
        "entrypoint": "main",
        "parameters": { "x": 10 }
      }
    },

    "dependency_snapshots": [
      {
        "kind": "object",
        "id": "uuid",
        "content_digest": "sha256:...",
        "resolved_runtime": null
      }
    ]
  },

  "output_spec": {
    "return_stdout": true,
    "return_stderr": true,
    "formats": ["json", "png", "svg"]
  }
}
```

**Notes**

* The executor should not need to call back to fetch object state in order to run.
* `dependency_snapshots` prevents “moving target” bugs.

### 7.2 `object_render` (example: LaTeX preview)

```json
{
  "schema_version": "1.0",
  "job_id": "uuid",
  "job_type": "object_render",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "document_id": "uuid",
  "document_revision_id": "uuid",

  "execution_key": "sha256:...",

  "target": { "object_id": "uuid" },

  "inputs": {
    "object": {
      "type": "equation",
      "content": { "format": "latex", "value": "\\int_0^1 x^2 dx" }
    }
  },

  "output_spec": {
    "formats": ["svg", "png"]
  }
}
```

### 7.3 `document_export` (later)

```json
{
  "schema_version": "1.0",
  "job_id": "uuid",
  "job_type": "document_export",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "document_id": "uuid",
  "document_revision_id": "uuid",
  "execution_key": "sha256:...",

  "inputs": {
    "export_format": "pdf",
    "view_mode": "slide",
    "include_speaker_notes": false
  },

  "output_spec": {
    "formats": ["pdf"]
  }
}
```

---

## 8. Result Contract (Executor → Platform)

### 8.1 Envelope (common)

```json
{
  "schema_version": "1.0",
  "job_id": "uuid",
  "job_type": "object_execute",

  "status": "SUCCEEDED",
  "started_at": "2026-01-10T10:00:10Z",
  "finished_at": "2026-01-10T10:00:12Z",
  "duration_ms": 2000,

  "resource_usage": {
    "cpu_ms": 1800,
    "memory_mb_peak": 210
  },

  "outputs": {
    "result_json": {},
    "stdout": "bounded...",
    "stderr": ""
  },

  "artifacts": [
    {
      "artifact_id": "uuid",
      "kind": "plot",
      "format": "png",
      "digest": "sha256:...",
      "size_bytes": 120394,
      "uri": "s3://bucket/path/to/file.png",
      "content_type": "image/png",
      "metadata": {
        "width": 1024,
        "height": 768
      }
    }
  ],

  "logs": [
    {
      "level": "info",
      "message": "Execution completed",
      "timestamp": "2026-01-10T10:00:12Z"
    }
  ]
}
```

### 8.2 Artifact rules

* `uri` is an internal storage reference
* Clients obtain access via Platform-issued signed URLs
* `digest` is mandatory for immutability and caching

### 8.3 Output size limits

* `stdout` and `stderr` must be truncated to `max_output_kb`
* `logs` must be bounded in count and size

---

## 9. Failure Semantics

### 9.1 Failure envelope

```json
{
  "schema_version": "1.0",
  "job_id": "uuid",
  "job_type": "object_execute",
  "status": "FAILED",
  "started_at": "2026-01-10T10:00:10Z",
  "finished_at": "2026-01-10T10:00:11Z",

  "error": {
    "category": "USER_CODE_ERROR",
    "code": "PYTHON_EXCEPTION",
    "message": "ZeroDivisionError: division by zero",
    "details": {
      "traceback": "bounded...",
      "line": 12,
      "column": 3
    }
  },

  "outputs": {
    "stdout": "",
    "stderr": "bounded..."
  },

  "artifacts": []
}
```

### 9.2 Error categories (required)

* `USER_CODE_ERROR` — exceptions, invalid inputs, assertion failures
* `VALIDATION_ERROR` — payload schema mismatch, unsupported object type
* `RESOURCE_LIMIT` — memory/time/output exceeded
* `SANDBOX_VIOLATION` — forbidden syscall/fs/network attempt
* `DEPENDENCY_ERROR` — missing dataset or invalid digest reference
* `INTERNAL_ERROR` — worker crash, unhandled error, infra issues

### 9.3 Retry policy by category

* `USER_CODE_ERROR`: no automatic retry
* `VALIDATION_ERROR`: no automatic retry
* `RESOURCE_LIMIT`: no automatic retry (unless limits changed)
* `SANDBOX_VIOLATION`: no automatic retry
* `DEPENDENCY_ERROR`: retry only if dependency becomes available (rare; controlled)
* `INTERNAL_ERROR`: eligible for retry (bounded attempts)

---

## 10. Cancellation

### 10.1 Cancellation request

Platform may mark a job as `CANCELLED` if:

* user explicitly cancels
* job is superseded (optional policy)
* quota enforcement triggers cancellation

### 10.2 Cancellation enforcement

Best-effort:

* If the worker supports cooperative cancellation, it should terminate early
* If not, platform treats it as cancelled and discards late results

---

## 11. Security Requirements for Job Handling

* No platform secrets in payloads
* Dataset access must be via immutable digests and controlled retrieval
* Network disabled unless explicitly permitted
* File writes restricted to a temp job directory
* Artifacts must be content-addressed (digest) and stored outside the worker FS

---

## 12. Compatibility & Versioning

### 12.1 `schema_version`

* Both payload and result include `schema_version`
* Executor must reject unsupported major versions
* Platform must support graceful upgrade paths

### 12.2 `env_version`

* Every result must include the environment version used
* Dedupe must include `env_version`

---

## 13. Minimal Implementation Checklist

Platform must implement:

* execution_key computation
* idempotency keys at API boundary
* job persistence + lifecycle transitions
* dedupe lookup + reuse on hit
* signed URL generation for artifact retrieval
* bounded output storage

Executor must implement:

* schema validation
* sandbox enforcement
* limits enforcement
* artifact upload + digest reporting
* bounded logs/stdout/stderr
* structured failure categories