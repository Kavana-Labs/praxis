# Data Model Architecture

This document defines the **canonical data model** for Praxis.

It explains:
- What entities exist
- What is canonical vs projected
- How revisions, execution, and artifacts are modeled
- How the model supports **MVP slide canvas** and **future immersive canvas** without migration breakage

This is a **view-agnostic**, **execution-safe**, **future-proof** data model.

---

## 1. Core Modeling Principles

1. **Objects are canonical**
   - Scientific objects are the source of truth.
2. **Views are projections**
   - Slides, canvas layouts, regions are projections over objects.
3. **Revisions are immutable**
   - Every meaningful state is captured as a revision.
4. **Execution binds to revisions**
   - No execution is allowed against a moving target.
5. **Artifacts are immutable**
   - Outputs are content-addressed and never overwritten.

---

## 2. Entity Overview (Conceptual)

```text
User
 └── Workspace
      └── Project
           └── Document
                └── DocumentRevision
                     ├── ScientificObject*
                     ├── ViewProjection*
                     └── ExecutionJob*
````

Artifacts, datasets, and execution outputs are referenced, not embedded.

---

## 3. Identity & Access Entities

### 3.1 User

Represents an authenticated human or system actor.

**Fields**

* `id`
* `email`
* `name`
* `created_at`

---

### 3.2 Workspace

Top-level multi-tenant boundary.

**Fields**

* `id`
* `name`
* `created_by`
* `created_at`

---

### 3.3 WorkspaceMembership

RBAC binding between users and workspaces.

**Fields**

* `id`
* `workspace_id`
* `user_id`
* `role` (owner | editor | viewer)
* `joined_at`

---

## 4. Project & Document Entities

### 4.1 Project

Logical grouping of documents.

**Fields**

* `id`
* `workspace_id`
* `name`
* `description`
* `created_at`

---

### 4.2 Document

Logical identity of a document across revisions.

**Fields**

* `id`
* `project_id`
* `title`
* `description`
* `created_at`
* `archived_at` (nullable)

**Important**

* A Document does **not** store content.
* All content lives in revisions.

---

## 5. Revision Model (Critical)

### 5.1 DocumentRevision

Immutable snapshot of a document at a point in time.

**Fields**

* `id`
* `document_id`
* `created_by`
* `created_at`
* `parent_revision_id` (nullable)
* `message` (commit-style description)
* `is_head` (boolean)

**Rules**

* Once created, a revision is immutable.
* Only one revision per document may be `is_head = true`.

---

## 6. Scientific Object Model (Canonical)

### 6.1 ScientificObject

The canonical unit of meaning.

**Fields**

* `id`
* `document_revision_id`
* `type` (text | equation | code | plot | table | media | …)
* `content` (structured block document)
* `schema_version`
* `created_at`

---

### 6.2 ObjectSemantic

Semantic metadata separated for clarity and indexing.

**Fields**

* `id`
* `object_id`
* `dependencies` (array of object IDs / dataset digests)
* `references` (citations, definitions)
* `tags`
* `metadata` (JSON)

---

### 6.3 ObjectRuntime (Optional)

Compute configuration (exists only for executable objects).

**Fields**

* `id`
* `object_id`
* `language`
* `entrypoint`
* `parameters` (JSON)
* `env_requirements` (resolved at execution time)

---

### 6.4 ObjectOutput (Materialized Results)

Logical link between object and produced artifacts.

**Fields**

* `id`
* `object_id`
* `execution_job_id`
* `kind` (plot | table | log | preview | export)
* `artifact_id`
* `created_at`

**Rule**

* Outputs are append-only.
* New execution → new outputs.

---

## 7. View Projection Model (Non-Canonical)

Views describe **how objects appear**, not **what they mean**.

---

### 7.1 ViewProjection (Abstract)

Base table for all views.

**Fields**

* `id`
* `document_revision_id`
* `view_type` (`slide` | `canvas` | future)
* `created_at`

---

### 7.2 SlideView (MVP)

Represents linear presentation layout.

**Fields**

* `id`
* `view_projection_id`
* `slide_order` (array of slide IDs)

---

### 7.3 SlideObjectPlacement

Placement of an object within a slide.

**Fields**

* `id`
* `slide_id`
* `object_id`
* `x`
* `y`
* `width`
* `height`
* `z_index`

---

### 7.4 CanvasView (Future)

Represents spatial reasoning layout.

**Fields**

* `id`
* `view_projection_id`
* `coordinate_space` (world settings)

---

### 7.5 CanvasObjectPlacement

**Fields**

* `id`
* `canvas_view_id`
* `object_id`
* `x`
* `y`
* `scale`
* `rotation`
* `group_id` (optional)

---

## 8. Execution Model

### 8.1 ExecutionJob

Represents a single unit of computation.

**Fields**

* `id`
* `job_type`
* `status`
* `execution_key`
* `workspace_id`
* `project_id`
* `document_id`
* `document_revision_id`
* `object_id` (nullable for doc-wide jobs)
* `env_version`
* `created_at`
* `started_at`
* `finished_at`

---

### 8.2 ExecutionResult

Structured summary of job outcome.

**Fields**

* `id`
* `job_id`
* `status`
* `resource_usage`
* `stdout` (bounded)
* `stderr` (bounded)
* `error` (nullable JSON)
* `created_at`

---

## 9. Artifact & Storage Model

### 9.1 Artifact

Immutable binary output stored externally.

**Fields**

* `id`
* `kind` (plot | export | dataset | preview)
* `format` (png | svg | pdf | json)
* `digest` (sha256)
* `size_bytes`
* `storage_uri`
* `content_type`
* `created_at`

---

### 9.2 Dataset (Optional, Future)

Immutable dataset reference.

**Fields**

* `id`
* `digest`
* `source`
* `size_bytes`
* `created_at`

---

## 10. Canonical vs Non-Canonical Summary

| Entity           | Canonical |
| ---------------- | --------- |
| ScientificObject | ✅         |
| ObjectSemantic   | ✅         |
| ObjectRuntime    | ✅         |
| DocumentRevision | ✅         |
| ExecutionJob     | ✅         |
| Artifact         | ✅         |
| SlideView        | ❌         |
| CanvasView       | ❌         |
| Placements       | ❌         |

---

## 11. Migration & Evolution Strategy

### 11.1 Schema versioning

* Every ScientificObject has `schema_version`
* New object types do not break old ones

### 11.2 View evolution

* New views = new projection tables
* No migration of objects required

### 11.3 Execution evolution

* Execution environment versioned separately
* Old outputs remain valid and traceable

---

## 12. Why This Model Works

This data model ensures:

* Slides can disappear without breaking data
* Canvas can evolve freely
* Execution remains reproducible
* Collaboration works at semantic level
* Long-lived scientific documents remain interpretable

---

## 13. Final Invariant

> **Objects encode meaning.
> Views encode presentation.
> Execution encodes computation.
> Revisions bind them in time.**

Any change violating this invariant is architecturally invalid.