# Local Development

## Required tools

- **Node 20+** (Node 22 recommended). Use `nvm`:
  ```bash
  nvm install 22 && nvm use 22
  ```
- **Python 3.11**
- **Docker** (Docker Desktop on macOS/Windows) — required for the isolated execution sandbox.
  Optional if you only want to edit/present without running code, or use the `subprocess`
  backend.

## Install & run

### Frontend (`apps/web`)

```bash
cd apps/web
npm install
npm run dev            # http://localhost:5173  → open /editor
```

Useful scripts:

| Command | What |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit + integration |
| `npm run e2e` | Playwright smoke test (needs the dev server / `npx playwright install chromium`) |

### Execution service (`apps/executor`)

```bash
cd apps/executor
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install pytest httpx            # for tests

docker build -t praxis-runner:latest runner    # one-time
uvicorn app.main:app --reload --port 8000
pytest                                          # run service tests
```

### Everything via Docker Compose

```bash
docker compose up --build
```

## Configuration

| Variable | Where | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_EXECUTOR_URL` | web | `http://localhost:8000` | Execution service base URL |
| `EXECUTOR_BACKEND` | executor | `docker` | `docker` \| `subprocess` \| `fake` |
| `EXECUTOR_TIMEOUT_SECONDS` | executor | `10` | Default per-job wall-clock limit |
| `EXECUTOR_MAX_MEMORY_MB` | executor | `512` | Per-job memory limit |
| `EXECUTOR_RUNNER_IMAGE` | executor | `praxis-runner:latest` | Docker runner image |

Set web variables in `apps/web/.env` (Vite reads `VITE_`-prefixed vars).

## Troubleshooting

- **`npm` errors / `SyntaxError: Unexpected token '&&='`** — your active Node is too old. Run
  `nvm use 22` (the project requires Node ≥ 20).
- **Run button shows “Execution service unavailable”** — the executor isn't running or
  unreachable. Start it (`uvicorn app.main:app --port 8000`) and confirm
  `curl http://localhost:8000/health`.
- **`/health/executor` reports `unavailable`** — Docker isn't running, or the runner image isn't
  built. Start Docker and `docker build -t praxis-runner:latest apps/executor/runner`, or run the
  service with `EXECUTOR_BACKEND=subprocess` for trusted local dev.
- **CORS errors in the browser console** — set `EXECUTOR_CORS_ORIGINS` to include your web origin
  (defaults already cover `localhost:5173`).
- **Editor looks empty on first load** — it seeds *Modeling Harmonic Motion*. If you cleared
  storage, use **File → Load example deck**.
- **Want a clean slate** — clear the site's `localStorage` (keys are prefixed `praxis:`).

## Testing summary

| Suite | Command | Notes |
| --- | --- | --- |
| Frontend unit/integration | `cd apps/web && npm test` | Vitest + Testing Library |
| Frontend e2e smoke | `cd apps/web && npm run e2e` | Playwright (Chromium) |
| Execution service | `cd apps/executor && pytest` | Docker test auto-skips without the runner image |
