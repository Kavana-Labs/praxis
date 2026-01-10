# Security Architecture

This document defines the security model for Praxis.

It covers:
- Threat model
- Authentication and authorization (Platform Layer)
- Data access boundaries and storage security
- Execution Layer sandboxing and constraints
- Auditability, abuse prevention, and incident response hooks

This security model is designed to remain valid across:
- MVP structured slide canvas
- Future immersive scientific computation canvas

---

## 1. Security Principles

1. **Assume user content is untrusted**
   - Documents, objects, imports, and especially code are hostile by default.
2. **Separation of concerns**
   - Platform owns identity, permissions, and state.
   - Execution owns computation in isolation.
3. **Least privilege everywhere**
   - Users, services, and workers get the minimum access required.
4. **Defense in depth**
   - Multiple layers: authZ checks, sandboxing, limits, storage controls, auditing.
5. **Immutable outputs**
   - Artifacts are content-addressed; no in-place overwrite.
6. **Security must survive view toggling**
   - Slides/canvas are projections; permissions apply to canonical objects/revisions.

---

## 2. Threat Model

### 2.1 Assets to protect
- User accounts and sessions
- Workspace/project/document confidentiality
- Integrity of documents and revisions
- Execution infrastructure (CPU, memory, storage, worker fleet)
- Artifact storage contents
- Platform secrets (DB credentials, signing keys, service tokens)
- Availability (prevent abuse, resource exhaustion)

### 2.2 Adversaries
- Malicious authenticated user (most important)
- Compromised client browser/session token
- Untrusted third-party content uploads (images, datasets)
- External attacker probing API endpoints
- Insider mistakes / misconfiguration

### 2.3 Primary attack surfaces
- Platform API endpoints
- WebSocket (if enabled)
- File uploads / asset pipeline
- Execution job submission pipeline
- Execution runtime escape attempts
- Object storage access paths (public/private URLs)
- Dependency ingestion (datasets, libraries, renderers)

---

## 3. Platform Layer Security

## 3.1 Authentication (AuthN)

Supported approaches (choose one implementation; both acceptable):
- **Secure session cookies** (recommended for web app)
- **JWT access token + refresh token** (API-first)

**Requirements**
- Transport security: HTTPS only
- Secure cookie settings if cookie-based:
  - `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` where possible)
- Session rotation on privilege change
- Optional MFA later (not required for MVP)

---

## 3.2 Authorization (AuthZ)

### 3.2.1 RBAC model (workspace-scoped)
A user’s permissions are derived from:
- Workspace membership role (owner/editor/viewer)
- Optional project/document overrides (later)

**Permissions must be enforced server-side** on every request.

### 3.2.2 Authorization invariants
- All access checks must be scoped by `workspace_id`
- If a resource is accessed, the user must have:
  - membership in that workspace
  - the required role or explicit grant
- Never trust client-provided workspace context

### 3.2.3 What is protected
At minimum:
- Document metadata
- Document revisions
- Scientific objects
- View projections
- Execution job data
- Artifacts and download URLs

---

## 3.3 Multi-tenancy Isolation

### 3.3.1 Tenant boundaries
Workspaces are the tenant boundary.

**Isolation requirements**
- No cross-workspace queries without an explicit join on workspace membership
- All queries must include `workspace_id` filters (or equivalent scoping)

### 3.3.2 Database-level reinforcement (optional but recommended)
- Use row-level security (RLS) in Postgres later
- Or enforce strict scoping in service layer with standardized query helpers

---

## 3.4 API Hardening

### 3.4.1 Input validation
- Validate payload schemas (types, size limits, allowed fields)
- Reject unknown fields for security-sensitive endpoints (job creation, uploads)

### 3.4.2 Rate limiting
Protect endpoints by category:
- Auth endpoints (login, token refresh)
- Job submission
- Upload initiation
- Artifact download URL generation

### 3.4.3 Idempotency
Use idempotency keys for job creation and uploads to prevent replay spam.

### 3.4.4 CSRF protection
- Required for cookie-based auth (CSRF tokens, origin checks)
- For JWT header auth, CSRF risk is reduced but still validate Origin/Referer where relevant

---

## 3.5 WebSocket Security (if enabled)

- Authenticate handshake (cookie/JWT)
- Authorize subscriptions to:
  - workspace channels
  - document channels
- Rate limit events
- Never accept “state authority” from WS; treat as a transport only

---

## 4. Storage Security

## 4.1 Object Storage
Artifacts, uploads, exports are stored in private buckets by default.

**Rules**
- Clients never receive raw storage credentials.
- All artifact downloads must flow through:
  - signed URLs issued by Platform
  - short TTL (e.g., minutes)
  - permission checks at issuance time

## 4.2 Artifact immutability
Artifacts are content-addressed by digest:
- prevents overwrite attacks
- enables caching and reproducibility
- creates auditability

## 4.3 Upload pipeline
For user uploads:
- Prefer “signed upload URL” flow
- Validate:
  - content type
  - maximum size
  - checksum/digest on completion
- Run malware scanning later (optional; consider if external sharing exists)

---

## 5. Execution Layer Security (Core)

## 5.1 Threat Model for Execution
The executor runs untrusted code which may attempt:
- data exfiltration
- network scanning
- crypto mining / DoS
- privilege escalation
- sandbox escape
- filesystem abuse
- fork bombs and resource exhaustion

---

## 5.2 Execution Isolation Requirements

### 5.2.1 No trust boundary collapse
- Executor must never receive platform secrets
- Executor must not have DB credentials that allow wide access
- Executor should not be able to query arbitrary platform state

### 5.2.2 Sandboxing (minimum)
Each job executes in an isolated environment:
- container/namespace isolation
- read-only base image (where possible)
- dedicated temp workspace per job
- controlled stdout/stderr capture
- process limits

### 5.2.3 Resource limits (mandatory)
Enforce at runtime:
- wall clock timeout
- CPU time limit
- memory limit
- max output size (stdout/stderr/logs)
- max artifacts count and max artifact size
- max file writes

### 5.2.4 Network policy (default deny)
- No outbound network by default
- Any exception must be explicit and policy-controlled (future)

### 5.2.5 Filesystem policy
- Only a job-specific temp directory is writable
- No access to host filesystem
- No ability to write into executor image layers
- No reading of worker environment secrets

---

## 5.3 Dependency Control

- No arbitrary `pip install` inside jobs (default deny)
- Dependencies must come from:
  - pre-built executor images
  - curated/whitelisted library sets
- Environment version is explicit (`env_version`) and included in job dedupe keys

This prevents supply chain injection and makes outputs reproducible.

---

## 5.4 Output Sanitization & Safety

- Bound stdout/stderr length, truncate on overflow
- Sanitize logs and error payloads:
  - remove absolute paths
  - remove environment variables
  - remove internal host identifiers
- Validate artifacts:
  - enforce content type consistency
  - compute digest server-side
  - reject unexpected formats

---

## 6. Permission Model for Execution

Execution requires explicit permission (e.g., `execute` capability) in addition to edit rights.

**Minimum rule**
- Viewers cannot execute by default.
- Editors can execute objects they can edit.
- Owners can execute anything in workspace.

Platform must enforce:
- user can access the revision and object referenced by the job
- user is allowed to execute within that workspace

Executor trusts the platform’s authorization but still enforces sandbox constraints.

---

## 7. Auditability

### 7.1 Audit events (minimum)
Record:
- login/logout (optional MVP)
- workspace membership changes
- document revision creation
- job creation
- job completion (success/failure)
- artifact generation
- artifact download URL issuance

Each event should include:
- `timestamp`
- `actor_user_id`
- `workspace_id`
- `document_id` / `revision_id` / `object_id` (if applicable)
- `job_id` (if applicable)
- `ip_address` and user agent (optional; privacy-aware)

---

## 8. Abuse Prevention & Quotas

### 8.1 Rate limits
Apply limits for:
- job submissions per minute
- concurrent running jobs per workspace
- artifact generation bandwidth
- uploads

### 8.2 Quotas
Introduce workspace quotas:
- max storage
- max compute minutes
- max concurrent jobs

Enforce quotas at job creation time (Platform), not inside executor.

---

## 9. Incident Response Hooks (Practical)

### 9.1 Kill switches
Platform should support:
- disabling job execution for a workspace
- banning a user
- pausing workers (global)

### 9.2 Forensics readiness
Store:
- job metadata and error categories
- bounded logs
- resource usage metrics
- execution environment version

Do not store full user code logs beyond necessary bounds.

---

## 10. Security “Definition of Done”

Praxis security is considered acceptable when:

Platform Layer:
- enforces RBAC on all resource access
- issues signed URLs only after permission checks
- validates request payloads and rate-limits critical endpoints

Execution Layer:
- runs all code in a sandbox with strict limits
- has network disabled by default
- cannot access platform secrets
- produces bounded and sanitized outputs

System-wide:
- executions are traceable to a revision
- artifacts are immutable and content-addressed
- audit events exist for critical actions

---