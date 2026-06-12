import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * Imported rich text passes through the Praxis sanitizer. These tests pin the
 * strict color-only style policy that the importer relies on.
 */
describe("sanitizeHtml import policy", () => {
  it("keeps the exact color-only span style", () => {
    const html = sanitizeHtml('<p><span style="color: #652ff3">x</span></p>');
    expect(html).toContain('style="color: #652ff3"');
  });

  it("strips every other style declaration", () => {
    expect(
      sanitizeHtml('<p><span style="position:fixed;inset:0">x</span></p>'),
    ).not.toContain("style=");
    expect(
      sanitizeHtml('<p><span style="color: url(javascript:1)">x</span></p>'),
    ).not.toContain("style=");
    expect(
      sanitizeHtml('<p><span style="color:#fff;background:#000">x</span></p>'),
    ).not.toContain("style=");
    // style is span-only
    expect(sanitizeHtml('<p style="color:#fff">x</p>')).not.toContain("style=");
  });

  it("removes scripts and event handlers from imported markup", () => {
    const html = sanitizeHtml(
      '<p onclick="alert(1)">a<script>alert(2)</script><img src=x onerror=alert(3)></p>',
    );
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<img");
  });
});
