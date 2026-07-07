import { describe, expect, it } from "vitest";
import { createDocument } from "@/domain/factory";
import { createObject } from "@/domain/factory";
import { exportDocument } from "@/domain/serialize";
import { exportDocumentAsync } from "../exportAsync";

const fixedClock = () => "2020-01-01T00:00:00.000Z";

describe("exportDocumentAsync", () => {
  it("matches sync export byte-for-byte on a small (no-asset) doc", async () => {
    const doc = createDocument({}, fixedClock);
    expect(await exportDocumentAsync(doc)).toBe(exportDocument(doc));
  });

  it("matches sync export byte-for-byte on a heavy (asset-carrying) doc", async () => {
    const doc = createDocument({}, fixedClock);
    const img = createObject("image", {}, fixedClock);
    if (img.type !== "image") throw new Error("expected image");
    img.assetId = "a1";
    doc.objects[img.id] = img;
    doc.slides[0].objectIds = [img.id];
    doc.assets = {
      a1: {
        id: "a1",
        kind: "image",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,AAAA",
        createdAt: fixedClock(),
      },
    };
    // In jsdom there is no usable Worker, so the heavy path must fall back to
    // synchronous serialization and still produce identical bytes.
    expect(await exportDocumentAsync(doc)).toBe(exportDocument(doc));
  });
});
