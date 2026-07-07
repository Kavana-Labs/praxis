import type { CitationRecord } from "@/domain/types";

/** Format an author list as "A", "A & B", or "A, B & C" / "A et al.". */
export function formatAuthors(authors: string[]): string {
  const list = authors.filter(Boolean);
  if (list.length === 0) return "Unknown author";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  if (list.length === 3) return `${list[0]}, ${list[1]} & ${list[2]}`;
  return `${list[0]} et al.`;
}

/** Compact inline reference, e.g. "Feynman et al. (1965). Title. Source." */
export function formatCitationCompact(record: CitationRecord): string {
  const author = formatAuthors(record.authors);
  const year = record.year != null ? ` (${record.year})` : "";
  const title = record.title ? `. ${record.title}` : "";
  const source = record.source ? `. ${record.source}` : "";
  return `${author}${year}${title}${source}`.replace(/^\.\s*/, "");
}

/**
 * Coerce a user/imported-supplied URL into something safe to place in an
 * `href`. Only http(s) and mailto are allowed. A value carrying any other
 * explicit scheme (`javascript:`, `data:`, `vbscript:`, …) is rejected — this
 * is the guard that stops a crafted citation from injecting script when the
 * link is clicked. A schemeless value is treated as an https host so bare
 * domains still link somewhere sensible instead of resolving as a relative
 * path.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  // Any other explicit scheme is untrusted — reject outright.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  // No scheme: assume https rather than a relative link.
  return `https://${trimmed}`;
}

/** The hyperlink target for a citation, if any (DOI preferred). */
export function citationLink(record: CitationRecord): string | null {
  if (record.doi && record.doi.trim()) {
    const doi = record.doi.trim();
    return /^https?:\/\//i.test(doi)
      ? safeExternalUrl(doi)
      : `https://doi.org/${doi}`;
  }
  return safeExternalUrl(record.url);
}
