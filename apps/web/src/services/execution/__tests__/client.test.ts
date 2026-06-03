import { afterEach, describe, expect, it, vi } from "vitest";
import { executePython } from "../client";
import type { ExecuteResponse } from "../types";

const ok = (body: ExecuteResponse, status = 200): Response =>
  ({
    status,
    ok: status < 400,
    json: async () => body,
  }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

const successBody: ExecuteResponse = {
  executionId: "e1",
  status: "success",
  stdout: "2.0\n",
  stderr: "",
  exitCode: 0,
  durationMs: 50,
  artifacts: [],
};

describe("executePython", () => {
  it("returns the parsed response on success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ok(successBody)));
    const result = await executePython("print(1)");
    expect(result.serviceUnavailable).toBe(false);
    expect(result.response.status).toBe("success");
    expect(result.response.stdout).toBe("2.0\n");
  });

  it("flags service-unavailable when the network throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const result = await executePython("print(1)");
    expect(result.serviceUnavailable).toBe(true);
    expect(result.response.errorCategory).toBe("INTERNAL_ERROR");
    expect(result.response.stderr).toMatch(/Could not reach/i);
  });

  it("flags service-unavailable on a 503 from the service", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ok(
          {
            ...successBody,
            status: "error",
            errorCategory: "INTERNAL_ERROR",
            stderr: "Docker is not running",
          },
          503,
        ),
      ),
    );
    const result = await executePython("print(1)");
    expect(result.serviceUnavailable).toBe(true);
  });

  it("sends the code and timeout in the request body", async () => {
    const fetchMock = vi.fn(async () => ok(successBody));
    vi.stubGlobal("fetch", fetchMock);
    await executePython("print('hi')", 12);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      code: "print('hi')",
      timeoutSeconds: 12,
    });
  });
});
