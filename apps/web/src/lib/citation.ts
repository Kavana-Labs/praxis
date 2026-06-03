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

/** The hyperlink target for a citation, if any (DOI preferred). */
export function citationLink(record: CitationRecord): string | null {
  if (record.doi) {
    return record.doi.startsWith("http")
      ? record.doi
      : `https://doi.org/${record.doi}`;
  }
  return record.url ?? null;
}
