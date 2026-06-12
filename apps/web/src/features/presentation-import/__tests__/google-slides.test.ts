import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportSlidesAsPptx,
  importFromGoogleSlides,
  isGoogleImportConfigured,
  requestAccessToken,
} from "../services/googleSlides";
import { sampleDeck } from "./fixtures";

/**
 * Google Slides export client tests. The Drive API and GIS are mocked — these
 * verify error mapping, the oversize message, and that a successful export
 * flows through the shared PPTX pipeline.
 */

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string) => Promise<Response> | Response) {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input))),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("configuration", () => {
  it("is unconfigured without env vars and fails token requests calmly", async () => {
    expect(isGoogleImportConfigured()).toBe(false);
    await expect(requestAccessToken()).rejects.toThrow(/not configured/i);
  });
});

describe("exportSlidesAsPptx", () => {
  it("returns bytes for a successful export", async () => {
    const payload = sampleDeck();
    mockFetch(
      () =>
        new Response(payload.slice().buffer as ArrayBuffer, {
          status: 200,
        }),
    );
    const bytes = await exportSlidesAsPptx("file123", "token");
    expect(bytes.byteLength).toBe(payload.byteLength);
    const call = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(call[0])).toContain("/files/file123/export");
    expect(String(call[0])).toContain(
      encodeURIComponent("officedocument.presentationml.presentation"),
    );
  });

  it("maps the Drive export size limit to the documented message", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            error: { errors: [{ reason: "exportSizeLimitExceeded" }] },
          }),
          { status: 403 },
        ),
    );
    await expect(exportSlidesAsPptx("big", "token")).rejects.toThrow(
      /too large to import directly.*upload the PowerPoint file instead/i,
    );
  });

  it("maps 401 to an expired-session message", async () => {
    mockFetch(() => new Response("{}", { status: 401 }));
    await expect(exportSlidesAsPptx("f", "expired")).rejects.toThrow(
      /session expired/i,
    );
  });

  it("maps 404 to a not-found message", async () => {
    mockFetch(() => new Response("{}", { status: 404 }));
    await expect(exportSlidesAsPptx("gone", "token")).rejects.toThrow(
      /could not be found/i,
    );
  });

  it("maps network failure to an unreachable message", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error("offline")),
    ) as unknown as typeof fetch;
    await expect(exportSlidesAsPptx("f", "t")).rejects.toThrow(
      /could not be reached/i,
    );
  });
});

describe("importFromGoogleSlides (shared pipeline)", () => {
  it("exports then runs the same PPTX pipeline as local uploads", async () => {
    const payload = sampleDeck();
    mockFetch(
      () => new Response(payload.slice().buffer as ArrayBuffer, { status: 200 }),
    );
    const stages: string[] = [];
    const result = await importFromGoogleSlides(
      { fileId: "deck", fileName: "Wave Optics" },
      "token",
      (p) => stages.push(p.stage),
    );
    if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
    expect(result.document.metadata.importedFrom).toBe("google-slides");
    expect(result.document.metadata.originalFilename).toBe("Wave Optics.pptx");
    expect(result.document.slides).toHaveLength(2);
    expect(result.report.summary.sourceType).toBe("google-slides");
    expect(stages[0]).toBe("uploading");
    expect(stages).toContain("creating-document");
  });

  it("returns a calm error result on export failure", async () => {
    mockFetch(() => new Response("{}", { status: 500 }));
    const result = await importFromGoogleSlides(
      { fileId: "deck", fileName: "X" },
      "token",
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.error).toMatch(/could not export/i);
  });
});
