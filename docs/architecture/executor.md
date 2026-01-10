# Execution Service Architecture

This document defines the architecture of the **Execution Service** (Executor) in Praxis.

It is the **authoritative reference** for how scientific computation and rendering are performed, isolated, and reported.  
It complements (and does not duplicate) the following documents:
- `architecture/job-contracts.md` — execution payloads, results, idempotency
- `architecture/security.md` — threat model and sandbox guarantees
- `architecture/backend.md` — orchestration boundaries and ownership

---

## 1. Purpose & Scope

The Execution Service is responsible for **running untrusted scientific computation** and **producing immutable artifacts** in a controlled environment.

It:
- Executes user-submitted code and render tasks
- Enforces strict isolation and resource limits
- Produces structured outputs and artifacts
- Reports results deterministically to the Platform

It explicitly **does not**:
- Authenticate users
- Authorize access to documents or workspaces
- Store canonical document state
- Execute code inline with the Platform API

---

## 2. Architectural Role & Boundaries

### Ownership
- **Owns**: computation, rendering, artifact production
- **Shares**: job lifecycle semantics (with Platform)
- **Does not own**: user identity, permissions, documents, revisions

### Trust Boundary
- Treats **all job inputs as hostile**
- Trusts the Platform **only** for authorization decisions
- Does **not** trust payload contents beyond schema validation

---

## 3. High-Level Execution Flow

1. Worker claims a job from the queue
2. Job payload is validated against schema and version
3. Worker prepares an isolated sandbox
4. Runtime adapter executes the task
5. Outputs and artifacts are collected and bounded
6. Artifacts are uploaded to object storage
7. Result payload is emitted back to the Platform
8. Sandbox is destroyed

**Invariant**: No execution occurs outside a sandbox.

---

## 4. Worker Model & Scaling

### 4.1 Worker Topology
- Stateless workers
- Horizontal scaling
- Each worker handles **one job at a time**

### 4.2 Concurrency Model
- One sandbox per job
- No shared filesystem state between jobs
- No shared runtime state between jobs

### 4.3 Scaling Strategy
- Scale workers independently of Platform
- Use queue depth and job latency as scaling signals
- Prefer many small workers over few large ones

---

## 5. Sandbox Architecture

### 5.1 Isolation Mechanisms
Minimum acceptable isolation:
- OS-level containerization (namespaces/cgroups)
- Read-only base image
- Dedicated temp directory per job

### 5.2 Resource Enforcement
Hard limits enforced by the runtime:
- Wall-clock timeout
- CPU time
- Memory usage
- Max file size
- Max number of files
- Max stdout/stderr size
- Max artifact count

Jobs exceeding limits must be terminated and reported as failures.

### 5.3 Network Policy
- Outbound network: **disabled by default**
- No inbound network access
- Any exception must be explicitly enabled and audited

---

## 6. Runtime & Renderer Adapters

The executor is **adapter-based**, not monolithic.

### 6.1 Runtime Adapters
Each runtime adapter:
- Knows how to execute a specific language or task
- Runs entirely inside the sandbox
- Produces standardized outputs

Examples:
- Python runtime (MVP)
- Static renderers (LaTeX → SVG/PNG)
- Future: Julia, R, domain-specific engines

### 6.2 Adapter Interface (Conceptual)
Each adapter must implement:
- `prepare(inputs)`
- `execute()`
- `collect_outputs()`
- `cleanup()`

Adapters must not:
- Perform network I/O (unless explicitly permitted)
- Write outside the sandbox directory
- Leak environment details

---

## 7. Artifact Handling

### 7.1 Artifact Rules
Artifacts must be:
- Immutable
- Content-addressed (digest required)
- Stored outside the worker filesystem
- Described via metadata, not raw paths

### 7.2 Upload Flow
1. Adapter produces artifact in sandbox
2. Executor computes digest
3. Artifact is uploaded to object storage
4. Storage URI + metadata are recorded
5. Sandbox copy is discarded

### 7.3 Artifact Metadata
Each artifact must include:
- Kind (plot, export, preview, dataset)
- Format (png, svg, pdf, json)
- Digest (sha256)
- Size
- Content type

---

## 8. Failure Handling & Reporting

### 8.1 Failure Categories
Executor must classify failures using the standard categories:
- USER_CODE_ERROR
- VALIDATION_ERROR
- RESOURCE_LIMIT
- SANDBOX_VIOLATION
- DEPENDENCY_ERROR
- INTERNAL_ERROR

### 8.2 Reporting Rules
- All failures must be structured
- Tracebacks/logs must be bounded
- Internal paths, secrets, and host identifiers must be stripped
- Late results for cancelled jobs must be discarded

---

## 9. Determinism & Reproducibility

### 9.1 Deterministic Inputs
Executor must rely **only** on:
- Job payload contents
- Pinned dependency snapshots
- Explicit environment version

### 9.2 Environment Versioning
- Each executor image/runtime has an `env_version`
- `env_version` is included in job dedupe keys
- Upgrading environments never invalidates old artifacts

---

## 10. Versioning & Compatibility

### 10.1 Schema Compatibility
- Executor must validate `schema_version`
- Unsupported major versions must be rejected gracefully

### 10.2 Forward Compatibility
- Unknown optional fields must be ignored
- Required fields must be strictly enforced

---

## 11. Security Summary (Executor POV)

The executor must guarantee:
- No platform secrets accessible
- No cross-job data leakage
- No unbounded resource consumption
- No network exfiltration (by default)
- Sanitized outputs only

If any of these guarantees cannot be met, the executor is considered **architecturally invalid**.

---

## 12. Extension Strategy

The executor is designed to evolve by:
- Adding new runtime adapters
- Adding new renderers
- Adding new artifact types

Extensions must:
- Reuse sandbox infrastructure
- Respect job contracts
- Maintain isolation and limits

No extension may bypass sandboxing.

---

## 13. Operational Considerations

### Observability
Executor should emit:
- job_id
- status transitions
- resource usage
- failure categories
- env_version

### Maintenance
- Executors can be drained and replaced without downtime
- Workers are disposable; state lives elsewhere

---

## 14. Definition of Done (Executor)

The Execution Service is architecturally complete when:
- All code runs in isolated sandboxes
- All outputs are bounded and sanitized
- Artifacts are immutable and content-addressed
- Execution is reproducible and traceable
- Scaling execution does not affect Platform stability

---

## Final Invariant

> **Execution is isolated.  
> Artifacts are immutable.  
> State lives elsewhere.**

Any implementation violating this invariant must be rejected.
