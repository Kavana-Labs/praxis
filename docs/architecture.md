# Praxis Architecture

## Overview

Praxis is built as a **hybrid scientific platform** that separates
**real-time collaboration and product logic** from
**scientific computation and execution**.

This separation is intentional and foundational.

- The **Platform Layer** focuses on users, documents, collaboration, and APIs.
- The **Execution Layer** focuses on running scientific code, simulations, and rendering outputs.
- Presentation is treated as a **view of a structured scientific document**, not a static canvas.

---

## High-Level System Diagram
```
┌──────────────────────────────┐
│           Frontend           │
│   React + TypeScript Editor  │
└───────────────┬──────────────┘
                │ HTTPS / WSS
┌───────────────▼──────────────┐
│     Platform API (Node.js)   │
│  Auth • Docs • Collab • API  │
│  WebSockets • Permissions    │
└───────┬──────────────────────┘
        │ enqueue jobs
┌───────▼───────────────┐
│     Job Queue         │
│   (Redis / Broker)    │
└───────────────┬───────┘
                │
┌───────────────▼──────────────┐
│   Execution Service (Python) │
│  Code • Simulations • Plots  │
│  Exports • Rendering         │
└───────────────┬──────────────┘
                │ store artifacts
┌───────────────▼──────────────┐
│      Object Storage          │
│  (PDFs, images, HTML, zips)  │
└──────────────────────────────┘
```
---

## Core Architectural Principles

1. **Separation of concerns**
   - Platform logic never executes scientific code.
   - Execution logic never handles authentication or collaboration.

2. **Deterministic science**
   - Executions are reproducible.
   - Outputs can be regenerated at any time.

3. **Asynchronous execution**
   - Scientific computation never blocks user interaction.

4. **Security by isolation**
   - All code execution is sandboxed and resource-limited.

---

## Platform Layer (Node.js)

### Responsibilities

The Platform Layer owns all **product and collaboration concerns**:

- Authentication (OAuth, email)
- Users, teams, and organizations
- Document metadata and structure
- Slides and block ordering
- Real-time collaboration (presence, cursors, comments)
- Permissions and access control
- API endpoints
- WebSocket events
- Audit logs

### What It Explicitly Does NOT Do

- Execute code
- Run simulations
- Generate plots
- Render PDFs or HTML
- Perform heavy computation

This keeps the platform fast, responsive, and safe.

---

## Execution Layer (Python)

### Responsibilities

The Execution Layer is a **scientific runtime service** responsible for:

- Executing Python code blocks
- Running simulations
- Generating plots and visualizations
- Producing rendered outputs
- Handling export jobs (PDF, HTML, bundles)

It operates as a **worker-based system**, triggered by jobs from the platform.

### Execution Environment

- Sandboxed per job
- CPU, memory, and time limits enforced
- No unrestricted filesystem access
- No outbound network by default
- Controlled dependency set

---

## Job Queue & Asynchronous Processing

All scientific actions are performed via **jobs**, not direct API calls.

### Example Job Types

- `run_code_block`
- `render_plot`
- `export_pdf`
- `export_html`
- `generate_thumbnail`

### Job Lifecycle

1. User triggers an action (e.g. “Run Code”)
2. Platform validates permissions
3. Platform enqueues a job
4. Python worker picks up the job
5. Execution occurs in isolation
6. Outputs are stored
7. Platform broadcasts results to clients

This ensures:
- Non-blocking UI
- Fault isolation
- Horizontal scalability

---

## Document & Block Model

Praxis documents are **structured**, not free-form.

### Document Structure

- Document
  - Slides
    - Blocks

### Core Block Types

- TextBlock
- EquationBlock (LaTeX)
- CodeBlock (Python)
- PlotBlock
- SimulationBlock
- MediaBlock

Each block contains:
- `type`
- `content`
- `runtime` (none | python)
- `dependencies`
- `schemaVersion`

The Platform stores blocks.
The Execution Layer reads them when needed.

---

## Data Ownership Model

### Database (PostgreSQL / Supabase)

Stores:
- Users
- Projects
- Documents
- Slides
- Blocks
- Collaboration events
- Execution metadata

### Object Storage (S3 / R2)

Stores:
- Rendered plots
- Images
- PDFs
- HTML exports
- Bundled archives

Large artifacts are **never** stored directly in the database.

---

## Real-Time Collaboration Model

### MVP Approach

- Presence indicators
- Comments
- Lightweight block-level locking
- Last-write-wins updates

This minimizes complexity while supporting collaboration.

### Future Upgrade

- CRDT / Yjs for block-level merging
- Offline support

---

## Export Architecture

Exports are handled as execution jobs.

### Export Types

- PDF (vector-perfect)
- HTML (interactive)
- Offline bundle

### Flow

1. Platform enqueues export job
2. Python worker renders output
3. Artifacts stored in object storage
4. Platform marks export as ready
5. User downloads via signed URL

---

## Security Considerations

- All execution is sandboxed
- No arbitrary code execution on platform servers
- Resource quotas enforced
- Execution environments are disposable
- Inputs and outputs are validated

Security is treated as a **first-class architectural concern**, not an afterthought.

---

## Scalability Strategy

- Platform layer scales horizontally
- Execution workers scale independently
- Job queues absorb load spikes
- Heavy workloads do not affect collaboration performance

---

## Future Extensions

- Versioned execution environments
- Git-backed projects
- Plugin system for new block types
- LMS integrations
- Research reproducibility tooling

---

## Summary

Praxis’s hybrid architecture enables:

- Real-time collaboration
- Scientific rigor
- Safe execution
- Long-term scalability

This design ensures Praxis remains:
**fast for users, safe for infrastructure, and correct for science.**