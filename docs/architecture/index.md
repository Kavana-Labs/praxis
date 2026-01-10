# Praxis — System Architecture

## 1. Purpose of This Document

This document defines the **high-level architecture and governing principles** of Praxis.

It describes:

* The major subsystems
* Their responsibilities and boundaries
* How they interact
* The conceptual model underlying the product

It intentionally avoids:

* API endpoint listings
* Database schemas
* Framework-specific implementation details

Those live in subsystem-specific architecture documents.

## 2. What Praxis Is (and Is Not)

### Praxis **is**

A scientific thinking, computation, and presentation platform built around **structured scientific objects**, executable computation, and reproducible outputs.

### Praxis **is not**

* A traditional slide tool
* A free-form whiteboard
* A notebook environment with UI layered on top

Praxis supports familiar metaphors **only as projections**, not as its core data model.

## 3. Core Architectural Insight

> **Slides are a view. Objects are the truth.**

Praxis is fundamentally object-centric.

Everything in the system is built around **scientific objects** that:

* have meaning
* may depend on one another
* may execute
* may produce artifacts
* persist independently of layout or presentation mode

Any canvas, slide, or view is a **projection of the same underlying object graph**.

## 4. Scientific Object Model (Conceptual)

A **Scientific Object** is the smallest meaningful unit in Praxis.

Examples include:

* Text (semantic, not decorative)
* Equations (symbolic / LaTeX)
* Code cells (executable)
* Plots / graphs (generated artifacts)
* Tables (structured data)
* Media (images, diagrams)
* Domain-specific objects (circuits, molecules, geometry — future)

Each object may have:

* `type`
* `content`
* `dependencies` (on other objects or data)
* `runtime` requirements
* `outputs` (artifacts)
* `schemaVersion`

Objects live within **document revisions** and are immutable once executed.

## 5. The Scientific Computation Canvas

Praxis supports **multiple interaction modes over the same data model**.

### 5.1 MVP Canvas — Structured Slide Canvas

**Purpose**

* Lower onboarding friction
* Familiar mental model
* Fast iteration and shipping

**Characteristics**

* Slide/page-based layout
* Linear ordering
* Grid-aligned placement
* Objects live *within slides*
* Navigation resembles traditional presentation tools

**Important**

* Slides do not own data
* Objects do not become “shapes”
* Execution, dependencies, and outputs remain intact

This mode is a **compatibility layer**, not the core system.

### 5.2 Future Canvas — Immersive Scientific Computation Canvas

**Purpose**

* Enable deep scientific reasoning
* Visualize relationships and execution flows
* Break free from linear presentation constraints

**Characteristics**

* Infinite or large spatial canvas
* Non-linear layout
* Objects form a visible graph
* Dependencies are explicit
* Zoom-based navigation
* Region-based organization

This mode exposes the **true structure of the document**, rather than hiding it behind slides.

### 5.3 View Toggling

Both canvases operate on the **same underlying document and object graph**.

Users can switch between:

* Legacy slide view
* Immersive scientific view

No data duplication. No forked models.

## 6. System Decomposition

Praxis is composed of two primary layers:

### 6.1 Platform Layer

**Responsibilities**

* User authentication and authorization
* Workspaces and projects
* Document and object state
* Versioning and revisions
* Permissions and access control
* Execution orchestration
* Collaboration primitives (presence, comments, locking)
* Asset management

**Explicitly does not**

* Execute user code
* Render heavy artifacts
* Perform scientific computation

The Platform owns **state and intent**, not computation.

### 6.2 Execution Layer

**Responsibilities**

* Execute scientific code
* Generate plots and visual artifacts
* Produce exportable outputs
* Enforce resource and security constraints

**Characteristics**

* Stateless or ephemeral
* Sandbox-isolated
* Deterministic and reproducible
* No access to platform secrets or user credentials

The Execution Layer owns **computation and artifacts**, not user state.

## 7. Execution Philosophy

All user-provided code is treated as **hostile by default**.

Key principles:

* Platform never executes code directly
* Execution is asynchronous
* Every execution is traceable to:

  * document revision
  * object ID
  * environment version
* Outputs are immutable artifacts
* Failures are first-class outcomes

This aligns Praxis with **scientific reproducibility standards**, not notebook convenience.

## 8. Data Ownership & Persistence

### Canonical State

* Users, documents, objects, permissions, execution metadata
* Stored in a transactional database

### Artifacts

* Plots, renders, exports, datasets
* Stored in object storage
* Referenced immutably from platform state

Execution environments are disposable; artifacts are not.

## 9. Collaboration Model (High-Level)

Collaboration operates at the **object and document level**, not raw pixels.

* Presence and awareness are contextual
* Conflicts are resolved via object-level semantics
* Slides/canvas layouts are views, not merge units

Advanced real-time collaboration is additive, not foundational.

## 10. Scalability & Evolution

The architecture is designed so that:

* Platform and Execution scale independently
* New object types can be added without schema collapse
* New canvas modes can be introduced without data migration
* Execution environments can evolve without breaking documents

This allows Praxis to grow from:

* presentations → reasoning spaces → scientific environments

## 11. Related Architecture Documents

This document is the **entry point**.

Subsystem-specific details are defined in:

* `architecture/backend.md`
* `architecture/executor.md`
* `architecture/job-contracts.md`
* `architecture/data-model.md`
* `architecture/security.md`
* `architecture/deployment.md`

## 12. Guiding Principle (Final)

> **Praxis is a system for thinking scientifically, not decorating slides.**

Every architectural decision must preserve:

* semantic meaning
* reproducibility
* separation of concerns
* future canvas freedom

