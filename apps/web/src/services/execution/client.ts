import type { ExecuteResponse, RunResult } from "./types";

/**
 * Client for the Praxis execution service. The base URL is configurable via
 * `VITE_EXECUTOR_URL` (defaults to the local service). All failures resolve to a
 * structured result — the caller never has to catch — so the UI can always show
 * a clear message, including a distinct "service unavailable" state.
 */
export const EXECUTOR_URL: string =
  (import.meta.env?.VITE_EXECUTOR_URL as string | undefined) ??
  "http://localhost:8000";

function unavailable(message: string): RunResult {
  return {
    serviceUnavailable: true,
    response: {
      executionId: "",
      status: "error",
      stdout: "",
      stderr: message,
      durationMs: 0,
      errorCategory: "INTERNAL_ERROR",
      artifacts: [],
    },
  };
}

export async function executePython(
  code: string,
  timeoutSeconds = 15,
): Promise<RunResult> {
  let res: Response;
  try {
    res = await fetch(`${EXECUTOR_URL}/execute/python`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, timeoutSeconds }),
    });
  } catch {
    return unavailable(
      `Could not reach the execution service at ${EXECUTOR_URL}.\n` +
        "Start it with:  cd apps/executor && uvicorn app.main:app",
    );
  }

  let body: ExecuteResponse | null = null;
  try {
    body = (await res.json()) as ExecuteResponse;
  } catch {
    body = null;
  }

  if (!body) {
    return unavailable(
      `The execution service returned an unexpected response (HTTP ${res.status}).`,
    );
  }

  // 503 from the service means the sandbox backend itself is unavailable
  // (e.g. Docker not running). Surface it as a service problem, not user error.
  return { response: body, serviceUnavailable: res.status === 503 };
}

export async function checkExecutorHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${EXECUTOR_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
