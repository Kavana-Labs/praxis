# Praxis

**Praxis** is a scientific presentation and knowledge platform for scientists, engineers,
researchers, educators, and technical professionals. It is a flagship product of
**Kavana Labs**.

Conventional slide tools flatten rigorous work into static screenshots and bullet points.
Praxis is built for how technical communication actually works: equations are LaTeX, code is
executable, and generated figures are produced by real computation — all in one document.

> **Slides are a view. Objects are the truth.**

The MVP ships a familiar **slide-bounded editor**, but the underlying document model is
**object-centric**, so the future continuous scientific canvas can be introduced without a
rewrite.

---

## MVP features

- **Object-centric document model** — normalized scientific objects, slides as projections.
- **Bounded 16:9 slide editor** — select, drag, resize objects in a stable logical coordinate
  system (no infinite canvas in the MVP).
- **Eight scientific object types** — text (rich text), heading, math (LaTeX/KaTeX), code
  (CodeMirror), image, citation, generated artifact, and shapes.
- **LaTeX math** rendered with KaTeX, with graceful error display.
- **Executable Python** — run code in an isolated sandbox via a separate execution service and
  insert generated plots back onto a slide.
- **Slides** — add, rename, reorder (drag & drop), duplicate, delete.
- **Undo/redo**, keyboard shortcuts, and a right inspector for object & slide settings.
- **Local autosave** (localStorage) + **versioned JSON import/export** with graceful failure.
- **Present Mode** — a dedicated full-screen renderer with keyboard navigation.
- **Seeded example deck** — *Modeling Harmonic Motion*.

---

## Architecture at a glance

```
Author → Structured Model → Normalize → Project → Render → Present
```

| Layer | Where | Responsibility |
| --- | --- | --- |
| Domain model | `apps/web/src/domain` | Zod schema, types, geometry, migrations, normalize, serialize, **commands**, projection |
| Editor state | `apps/web/src/stores` | Zustand store + undo/redo; all edits go through commands |
| Canvas / objects | `apps/web/src/components` | Bounded slide stage, renderer registry, object editors, inspector |
| Persistence | `apps/web/src/services/persistence` | Adapter interface + localStorage implementation + autosave |
| Execution (client) | `apps/web/src/services/execution` | Typed client to the execution service |
| Execution (service) | `apps/executor` | FastAPI sandbox that runs untrusted Python and returns artifacts |

The web app never executes user code; the execution service never owns document or UI state.
See [`docs/architecture/index.md`](docs/architecture/index.md).

---

## Repository layout

```
praxis/
├── apps/
│   ├── web/             # React 19 + TS + Vite editor (the product)
│   ├── executor/        # FastAPI Python execution service + Docker runner
│   └── api/             # NestJS platform API (scaffold; not on the MVP path)
├── docs/                # architecture, document format, execution service, local dev
├── docker-compose.yaml
└── README.md
```

---

## Local development

### Requirements

- **Node 20+** (Node 22 recommended) — `nvm use 22`
- **Python 3.11**
- **Docker** (for the isolated execution sandbox; optional for a no-execution demo)

### 1. Frontend (the editor)

```bash
cd apps/web
npm install
npm run dev          # http://localhost:5173  → open /editor
```

The editor seeds the *Modeling Harmonic Motion* deck on first run and autosaves locally.

### 2. Execution service (Python sandbox)

```bash
cd apps/executor
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Build the sandbox runner image (one-time; requires Docker running):
docker build -t praxis-runner:latest runner

# Start the service (defaults to the Docker backend):
uvicorn app.main:app --reload --port 8000
```

Health check: `curl http://localhost:8000/health` → `{"status":"ok"}`
Backend status: `curl http://localhost:8000/health/executor`

> **No Docker?** Run with `EXECUTOR_BACKEND=subprocess uvicorn app.main:app` for a
> resource-limited host subprocess. This is **for trusted/local dev only** — it is not a
> security sandbox. The service never silently falls back to unsafe execution.

The web app talks to `http://localhost:8000` by default (override with `VITE_EXECUTOR_URL`).

### 3. Docker Compose (web + executor together)

```bash
docker compose up --build
# web      → http://localhost:5173
# executor → http://localhost:8000
```

The Compose executor uses the `subprocess` backend inside its own container (the scientific
stack is pre-installed). For per-job container isolation, run the executor on the host with the
Docker backend as in step 2.

---

## Tests

```bash
# Frontend unit + integration (Vitest)
cd apps/web && npm test

# Frontend end-to-end smoke (Playwright)
cd apps/web && npx playwright install chromium && npm run e2e

# Execution service (pytest)
cd apps/executor && source .venv/bin/activate && pytest
```

Type-check the frontend: `cd apps/web && npm run typecheck`.

---

## Known MVP limitations

- Single local document focus; no accounts, collaboration, or cloud sync.
- The bounded slide editor only — no infinite-canvas pan/zoom (deliberate; see architecture).
- Python is the only executable language; dependencies are limited to the runner image
  (NumPy, SymPy, Matplotlib, pandas).
- Images and artifacts are stored inline as data URLs (behind an asset abstraction for a future
  object-storage backend).
- The `subprocess` execution backend is best-effort and not a true sandbox.
- No PDF/PPTX export, no bibliography manager, no AI generation (out of MVP scope).

---

## Ownership & branding

Praxis™ is a product of **Kavana Labs**. © 2026 Kavana Labs. All rights reserved.
