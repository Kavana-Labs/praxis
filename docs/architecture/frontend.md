# Frontend Architecture (Web App)

This document defines the architecture of the Praxis frontend (web app).

It describes:
- Frontend responsibilities and boundaries
- Core UI subsystems (editor, views, execution UX)
- State management strategy (canonical vs local vs ephemeral)
- How MVP slide mode and future immersive canvas share one data model
- Contracts with the Platform API and Execution pipeline

This is view-agnostic and remains valid when slides are no longer the default.

---

## 1. Purpose

The frontend is the **interaction and rendering layer** for Praxis.

It provides:
- An authoring environment for scientific objects (text, equation, code, etc.)
- Multiple views over the same document:
  - MVP: structured slide canvas
  - Future: immersive scientific computation canvas
- Execution UX (run, status, outputs, artifacts)
- Collaboration UX (presence/comments/locking), if enabled

The frontend does **not**:
- Own canonical document truth
- Execute scientific code locally (unless explicitly used for lightweight preview rendering)
- Store long-lived authoritative state outside revisions

---

## 2. Non-Negotiable Frontend Rules

1. **Objects are canonical**
   - The frontend edits objects, but canonical persistence happens via revisions.
2. **Views are projections**
   - Slide view and canvas view are projections that reference objects.
3. **Execution binds to revisions**
   - The UI must never execute against “dirty” state without committing or otherwise pinning the execution to a stable revision snapshot (depending on your workflow).
4. **Local UI state is not a database**
   - Local state is for responsiveness, drafts, and interaction, not truth.

---

## 3. High-Level UI Subsystems

### 3.1 Editor Core (Object Authoring)
A type-driven authoring system for scientific objects:
- Text object editor (semantic text)
- Equation editor (LaTeX + preview)
- Code editor (Python cell)
- Table editor (structured tabular)
- Media object tools (image upload + placement)
- Future: domain objects (circuits, molecules, geometry)

The object editor must preserve:
- structured content format (blockdoc / JSON)
- object metadata for semantics and dependencies
- schema version compatibility

---

### 3.2 View Layer (Projections)

#### MVP: Slide View
- Linear slide navigation
- Grid alignment and object placement within slides
- Slide ordering
- Placement metadata is stored as a projection referencing object IDs

#### Future: Immersive Canvas View
- Spatial layout (x,y, scale, grouping)
- Zoom navigation
- Regions/frames (optional)
- The same object graph is rendered in a different projection

#### View Toggle
Toggling does NOT transform objects.
It switches which projection is active.

---

### 3.3 Execution UX Layer
The execution layer in the UI is responsible for:
- “Run” actions on executable objects
- Status display (queued/running/succeeded/failed/timed out)
- Rendering outputs:
  - structured JSON results
  - plots (png/svg)
  - logs (bounded)
- Showing artifact references (download/view)
- Re-run with parameter tweaks (if supported)

Key requirement:
- every execution must be traceable to:
  - document_revision_id
  - object_id
  - env_version

---

### 3.4 Asset & Artifact UX
The frontend supports:
- Uploading assets (images, datasets)
- Referencing artifact outputs (plots, exports)
- Download/view via signed URLs
- Preview thumbnails for objects and documents (optional)

---

## 4. Frontend State Model

Frontend state is split into three categories:

### 4.1 Canonical Remote State (Source of Truth)
Fetched from the Platform API (and persisted there):
- document metadata
- the current head revision
- objects (content + semantics + runtime config)
- view projections (slide/canvas layout)
- execution jobs + results metadata
- artifact descriptors (not raw binaries)

This state should be treated as authoritative.

---

### 4.2 Local Draft State (Ephemeral)
Used for responsiveness while editing:
- in-progress editor drafts (unsaved object edits)
- UI layout interactions (dragging/resizing before commit)
- selection, hover, inspector panels, search filters

Draft state must be mergeable into canonical state via:
- object updates -> revision creation
- projection updates -> revision creation
(or a staged autosave mechanism that still creates revisions)

---

### 4.3 UI Interaction State
Purely local and disposable:
- modal open/close
- toolbar state
- cursor position
- zoom level (per view session)
- panel widths

---

## 5. Revision Workflow (Frontend Behavior)

The UI must enforce one of these patterns (choose implementation):

### Option A: Explicit “Commit Revision”
- User edits objects and projection locally
- User clicks “Commit”
- Frontend sends new revision snapshot (or patch) to API
- Execution runs only against committed revisions

Best for reproducibility and early MVP clarity.

### Option B: Autosave Revisions
- Frontend periodically creates revisions (debounced)
- Execution can run against latest autosaved revision
- UI still shows revision boundaries for traceability

Best for smooth UX; slightly more backend complexity.

Regardless of option:
- Execution must always reference a stable `document_revision_id`.

---

## 6. Execution Workflow (Frontend ↔ Backend)

### 6.1 Run action
1. Ensure a stable `document_revision_id` (commit/autosave)
2. POST execute request with:
   - revision_id
   - object_id
   - desired output formats (if configurable)
3. Receive `job_id`
4. Poll or subscribe (WSS optional)
5. Render outputs and artifacts
6. Attach outputs to the object view (read-only display)

### 6.2 Failure handling
UI should categorize errors by:
- user code error (actionable; show traceback snippet)
- resource limit (suggest optimization)
- sandbox violation (explain forbidden action)
- internal error (allow retry)

UI must display bounded logs only.

---

## 7. Collaboration (Optional MVP / Later)

Collaboration is object-centric, not pixel-centric.

Possible features:
- presence (who is viewing)
- comments anchored to objects
- optional soft-locking of an object while editing
- later: CRDT/Yjs for realtime object-level sync

Key rule:
- merges are resolved at object/projection semantic level, not by rendering output.

---

## 8. Frontend Security Responsibilities

Frontend is not a trusted environment. Still, it must:
- avoid leaking signed URLs unnecessarily
- never store sensitive tokens in localStorage (prefer secure cookies or short-lived memory tokens)
- validate file uploads client-side (type/size) as an early gate (server remains authoritative)
- prevent XSS in rendered content:
  - sanitize Markdown/HTML (if any)
  - render LaTeX safely
  - treat code output as text unless explicitly safe

---

## 9. Performance & Scalability Considerations

### 9.1 Rendering performance
- Virtualize lists (slides, object outlines)
- Avoid full document re-render on small edits
- Use memoization for object components
- Debounce projection updates while dragging

### 9.2 Execution responsiveness
- optimistic UI: show “queued/running” immediately
- background polling with exponential backoff
- cache artifact URLs until expiry; refresh on demand

### 9.3 Large documents
- incremental loading:
  - load document structure first
  - load objects by viewport/slide
  - lazy-load artifacts

---

## 10. Recommended Frontend Module Layout

Suggested folder structure (adapt to repo):

- `src/app/` (routing, boot, providers)
- `src/api/` (typed API client)
- `src/state/` (query cache + local store)
- `src/domain/`
  - `objects/` (object model + renderers)
  - `views/` (slide + canvas projections)
  - `execution/` (job UX, status, outputs)
- `src/components/` (shared UI)
- `src/editor/`
  - `ObjectEditor/`
  - `Inspector/`
  - `Toolbar/`
- `src/views/`
  - `SlideView/`
  - `CanvasView/` (future)
- `src/security/` (sanitizers, safe renderers)
- `src/utils/`

---

## 11. Definition of Done (Frontend Architecture)

Frontend is architecturally correct when:
- editing is object-centric
- projections do not duplicate object meaning
- execution is pinned to revisions
- outputs are rendered from artifact references and bounded logs
- the app can add a new view mode without redesigning the data model

