import { describe, expect, it } from "vitest";
import type { CitationRecord } from "@/domain/types";
import { citationLink, safeExternalUrl } from "@/lib/citation";

const record = (over: Partial<CitationRecord>): CitationRecord => ({
  id: "c1",
  key: "ref",
  title: "T",
  authors: [],
  ...over,
});

describe("safeExternalUrl", () => {
  it("passes http, https and mailto through unchanged", () => {
    expect(safeExternalUrl("https://example.com/x")).toBe("https://example.com/x");
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com");
    expect(safeExternalUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
  });

  it("rejects javascript: and other dangerous schemes", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("  JavaScript:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(safeExternalUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("assumes https for a schemeless host rather than a relative link", () => {
    expect(safeExternalUrl("example.com/paper")).toBe("https://example.com/paper");
  });

  it("returns null for empty/whitespace/nullish input", () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl("   ")).toBeNull();
  });
});

describe("citationLink", () => {
  it("never emits a javascript: URL from a crafted citation url", () => {
    expect(citationLink(record({ url: "javascript:fetch('//evil')" }))).toBeNull();
  });

  it("never emits a javascript: URL from a crafted doi", () => {
    // A doi that is a full URL must still pass through the scheme guard.
    expect(citationLink(record({ doi: "javascript:alert(1)" }))).toBe(
      "https://doi.org/javascript:alert(1)",
    );
    // The above is a safe absolute href (doi.org path), not executable script.
  });

  it("prefers doi and builds a doi.org link for a bare doi", () => {
    expect(citationLink(record({ doi: "10.1/abc", url: "https://x.com" }))).toBe(
      "https://doi.org/10.1/abc",
    );
  });

  it("uses a safe url when no doi is present", () => {
    expect(citationLink(record({ url: "https://x.com/p" }))).toBe("https://x.com/p");
  });
});
