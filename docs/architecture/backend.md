# Backend Architecture (Platform API)

## 1. Purpose

The Backend (Platform API) is the system of record for **Praxis state and intent**.

It provides:
- Authentication + authorization
- Workspace/project/document management
- Scientific object graph persistence (content + semantics + compute config)
- View projections persistence (slide mode now; immersive canvas mode later)
- Execution orchestration (jobs, status, artifact references)
- Collaboration primitives (presence/comments/locking), as applicable

The backend explicitly does **not**:
- Execute user code
- Render heavy artifacts (plots, PDFs) locally
- Store large binaries in the primary database

## 2. Non-Negotiable Architecture Constraints

### Objects are canonical
- The backend stores **scientific objects** as the canonical units of meaning.
- Views (slides, canvas) store **placement and projection metadata** referencing objects.
- No view is allowed to become “the truth”.

### Execution is isolated
- Backend orchestrates; Execution service computes.
- User code is treated as hostile by default.
- Jobs must be traceable to `(document_revision_id, object_id, env_version)`.

### Future-proof for view toggling
All backend decisions must remain correct even if:
- Slides are removed
- Immersive canvas becomes the default
- Views become multiple and concurrent

## 3. Backend Responsibilities

### 3.1 Identity & Access
- User identity (authN)
- Workspace/org membership
- Role-based access control (RBAC)
- Audit trail hooks (who did what, when)

### 3.2 Domain State
- Workspaces, projects
- Documents (metadata + revision chain)
- Scientific objects (content, semantics, compute config)
- View projections (slide layout now, canvas layout later)
- Asset references (uploads, attachments)

### 3.3 Execution Orchestration
- Create execution jobs
- Dispatch jobs to queue/executor
- Track state transitions
- Store artifact references
- Notify clients (polling or realtime)

### 3.4 Collaboration (optional MVP)
- Presence (who is here)
- Comments/annotations
- Lightweight locking (object-level, not pixel-level)

## 4. Service Boundaries

## 4.1 Platform API (Node.js)
Owns:
- Permissions
- Canonical state (docs, objects, revisions)
- Job scheduling/orchestration
- Artifact metadata references

Does not own:
- Actual computation
- Heavy rendering

## 4.2 Execution Service (Python)
Owns:
- Running code in isolation
- Producing artifacts
- Returning structured outputs + artifact pointers

Does not own:
- User/project/document state
- Authentication/authorization

## 4.3 Storage
- PostgreSQL: canonical transactional state + job metadata
- Object storage: binary artifacts (plots, exports, datasets)
- Redis/Queue: job dispatch + backpressure (recommended)

## 5. High-Level Container Topology

```text
Client (React)
  | HTTPS / WSS
  v
Platform API (Node)
  | reads/writes
  +--> PostgreSQL  (canonical state)
  | enqueue/consume status
  +--> Redis/Queue (jobs)
  | signed URLs / references
  +--> Object Storage (artifacts)
  |
  | dispatch (via queue) / optional direct HTTP
  v
Execution Service (Python workers)
  | writes artifacts
  +--> Object Storage
  | writes job result metadata
  +--> PostgreSQL (or calls API to persist results)
```


## 6. Core Data Concepts (Backend POV)

### 6.1 Scientific Object (Canonical)

A Scientific Object stores:

* **Content state**: authored content (text/math/code)
* **Semantic state**: dependencies, references, metadata
* **Compute state** (optional): runtime config for execution
* **Outputs**: immutable references to artifacts produced by execution

### 6.2 View Projections (Non-Canonical)

Views store **layout rules** only:

* Slide View (MVP): slide ordering + object placement on slides
* Canvas View (future): spatial placement + grouping/regions

Views must only reference objects; they must not duplicate object meaning.

### 6.3 Revisions (Reproducibility & Collaboration)

Execution and collaboration require revisioning:

* A document has many revisions
* Each revision references a consistent set of objects and view placements
* Execution jobs always point to a specific revision

## 7. Execution Orchestration

### 7.1 Job Types (initial)

* `object_execute` (run a code object)
* `object_render` (render equation preview or derived visuals)
* `document_export` (PDF/HTML later)
* `thumbnail_generate` (optional)

### 7.2 Job Lifecycle

* `PENDING` → `QUEUED` → `RUNNING` → (`SUCCEEDED` | `FAILED` | `CANCELLED` | `TIMED_OUT`)

### 7.3 Idempotency & Dedupe (required)

To avoid re-running identical computations:

* Derive an `execution_key` from:

  * `document_revision_id`
  * `object_id`
  * `input_hash` (object content + dependencies + params)
  * `env_version`

If an identical `execution_key` exists in a terminal success state, return its outputs.

### 7.4 Retry Rules

* Retry only for **transient** failures (worker crash, infra failure)
* Do not auto-retry deterministic user-code failures unless explicitly requested
* Use a max retry count and poison-queue handling

### 7.5 Result Persistence

Execution results include:

* structured outputs (JSON)
* artifact references (object storage URIs)
* logs (bounded size)
* timing and resource usage

The platform persists:

* job status transitions
* output references tied to the revision + object

## 8. Security Architecture

### 8.1 AuthN

* JWT or secure cookie sessions (implementation choice)
* Refresh token strategy (if JWT)

### 8.2 AuthZ (RBAC)

Every request must resolve:

* user identity
* workspace context
* permission to view/edit/execute/export

### 8.3 Execution Threat Model

* User-submitted code is hostile by default
* No platform secrets are passed to execution
* Execution occurs in sandboxed workers:

  * strict CPU/memory/time limits
  * restricted filesystem (job temp dir only)
  * no outbound network by default
  * dependency whitelist (prebuilt env)

### 8.4 Storage Security

* All artifact downloads via signed URLs
* Private buckets by default
* Artifact metadata is permission-checked at the API

## 9. Observability

### 9.1 Logging

All backend logs must include:

* `request_id`
* `user_id`
* `workspace_id`
* `document_id` (if applicable)
* `revision_id` (if applicable)
* `job_id` (if applicable)

### 9.2 Metrics (minimum)

* request latency (p50/p95/p99)
* job queue latency
* job runtime
* job failure rate by type
* artifact upload/download failures

### 9.3 Tracing (recommended)

Trace spans:

* API request → job creation → worker execution → artifact persistence → client notification

## 10. API Surface (MVP, conceptual)

### 10.1 Documents & Revisions

* Create/read/update document metadata
* Commit a revision
* Fetch a revision (objects + view projection)

### 10.2 Objects

* CRUD objects
* Update semantic dependencies
* Execute object (creates job)

### 10.3 Views

* Slide view projection CRUD (MVP)
* Canvas view projection CRUD (future)
* Toggle view = choose projection, not transform object meaning

### 10.4 Execution Jobs

* Create job
* Get job status
* Fetch job artifacts

## 11. Evolution Plan

### MVP

* Slide view projection only
* Polling-based execution status (WSS optional)
* Basic revisioning (at least revision snapshots)

### Later

* Immersive canvas view projection
* Multi-view coexistence + toggling
* Rich realtime collaboration (CRDT/Yjs)
* Versioned execution environments
* Export pipelines (PDF/HTML)


## 12. Definition of Done for Backend Architecture

Backend is considered architecturally correct when:

* objects are canonical and views are projections
* all executions are traceable and reproducible
* platform never executes code
* security constraints are enforced at boundaries
* scaling execution does not require scaling the platform