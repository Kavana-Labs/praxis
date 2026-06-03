# Deployment (Vercel + GitHub Actions)

The web editor (`apps/web`) deploys to **Vercel** via the
[`.github/workflows/deploy-vercel.yml`](../.github/workflows/deploy-vercel.yml)
workflow:

- **Preview** deploy on every branch push (and `feat/*`, PRs).
- **Production** deploy on push to `master`/`main`.
- Both are gated on a passing **type-check + unit-test** job.

## One-time setup

### 1. Create the Vercel project

Link the repo to a Vercel project:

```bash
cd apps/web
npx vercel link          # choose/create the project
```

`vercel link` writes `apps/web/.vercel/project.json` containing `orgId` and
`projectId` — you'll need those next. (`.vercel` is git-ignored.)

The workflow runs the Vercel CLI **inside `apps/web`**, so it builds the app in
isolation (where `vite` is installed). **Leave the Vercel project's Root
Directory at its default** — do not set it to `apps/web`, or the CLI would look
for `apps/web/apps/web`. The framework auto-detects as Vite.

### 2. Add the GitHub Actions secrets

Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Where to find it |
| --- | --- |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `apps/web/.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | `apps/web/.vercel/project.json` → `projectId` |

Or with the GitHub CLI:

```bash
gh secret set VERCEL_TOKEN
gh secret set VERCEL_ORG_ID --body "$(jq -r .orgId apps/web/.vercel/project.json)"
gh secret set VERCEL_PROJECT_ID --body "$(jq -r .projectId apps/web/.vercel/project.json)"
```

### 3. Push

Any push triggers the workflow. The deployment URL is printed in the job
summary.

## SPA routing

`apps/web/vercel.json` rewrites all paths to `/index.html` so client-side routes
(`/editor`, `/present`) work on hard refresh / deep links.

## Execution service note

Vercel hosts the **static editor only**. The Python execution sandbox needs
Docker, which Vercel's serverless platform cannot run, so live code execution is
**not** available on a plain Vercel deploy — the Run button degrades gracefully
to a "service unavailable" message.

To enable execution against the deployed editor, host the executor separately
(a small VM, Fly.io, Render, etc. — anywhere it can run `docker run`) and point
the editor at it by setting a Vercel **Environment Variable**:

```
VITE_EXECUTOR_URL = https://your-executor-host
```

(Also add that origin to the executor's `EXECUTOR_CORS_ORIGINS`.)
