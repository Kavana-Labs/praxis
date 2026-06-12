import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  exportSlidesAsPptx,
  GoogleAuthExpiredError,
  importFromGoogleSlides,
  isGoogleImportConfigured,
  listSlidesPresentations,
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

describe("listSlidesPresentations (Praxis Drive browser)", () => {
  it("queries Slides files with recency ordering and maps the result", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({
            nextPageToken: "page2",
            files: [
              {
                id: "f1",
                name: "Wave Optics",
                modifiedTime: "2026-06-01T10:00:00Z",
                owners: [{ displayName: "Desmond" }],
                thumbnailLink: "https://lh3.example/thumb",
              },
              { id: "f2" }, // minimal file
              { name: "no-id-dropped" },
            ],
          }),
          { status: 200 },
        ),
    );
    const page = await listSlidesPresentations("token");
    const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
    const readable = decodeURIComponent(url).replace(/\+/g, " ");
    expect(url).toContain("drive/v3/files");
    expect(readable).toContain(
      "mimeType = 'application/vnd.google-apps.presentation'",
    );
    expect(readable).toContain("trashed = false");
    expect(readable).toContain("viewedByMeTime desc");
    expect(page.nextPageToken).toBe("page2");
    expect(page.files).toHaveLength(2);
    expect(page.files[0]).toMatchObject({
      id: "f1",
      name: "Wave Optics",
      owner: "Desmond",
    });
    expect(page.files[1].name).toBe("Untitled presentation");
  });

  it("escapes quotes in search terms and passes page tokens", async () => {
    mockFetch(() => new Response(JSON.stringify({ files: [] }), { status: 200 }));
    await listSlidesPresentations("token", {
      query: "Frank's 'deck'",
      pageToken: "tok123",
    });
    const url = decodeURIComponent(
      String(vi.mocked(globalThis.fetch).mock.calls[0][0]),
    ).replace(/\+/g, " ");
    expect(url).toContain("name contains 'Frank\\'s \\'deck\\''".replace(/\\\\/g, "\\"));
    expect(url).toContain("pageToken=tok123");
  });

  it("maps 401 to GoogleAuthExpiredError for the reconnect flow", async () => {
    mockFetch(() => new Response("{}", { status: 401 }));
    await expect(listSlidesPresentations("expired")).rejects.toBeInstanceOf(
      GoogleAuthExpiredError,
    );
  });

  it("maps network failure to a calm unreachable message", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.reject(new Error("offline")),
    ) as unknown as typeof fetch;
    await expect(listSlidesPresentations("t")).rejects.toThrow(
      /could not be reached/i,
    );
  });
});
