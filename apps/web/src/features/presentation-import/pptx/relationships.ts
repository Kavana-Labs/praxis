import type { PptxPackage } from "./packageReader";
import { attr, descendants } from "./xml";

/**
 * OOXML relationship (.rels) parsing and safe target resolution. Relationship
 * targets are attacker-controlled strings, so resolution never escapes the
 * package root and external-mode targets are kept but never fetched.
 */

export type Relationship = {
  id: string;
  type: string;
  target: string;
  external: boolean;
};

export type RelationshipMap = Map<string, Relationship>;

/** `.rels` part name for a given part, e.g. ppt/slides/slide1.xml → ppt/slides/_rels/slide1.xml.rels */
export function relsPartFor(partName: string): string {
  const slash = partName.lastIndexOf("/");
  const dir = slash >= 0 ? partName.slice(0, slash) : "";
  const base = slash >= 0 ? partName.slice(slash + 1) : partName;
  return `${dir ? `${dir}/` : ""}_rels/${base}.rels`;
}

/**
 * Resolve a relationship target relative to the owning part's directory,
 * collapsing `.`/`..` segments without ever escaping the package root.
 * Returns null for unsafe or absolute targets.
 */
export function resolveTarget(
  ownerPart: string,
  target: string,
): string | null {
  if (!target || target.includes("\\") || target.includes(":")) return null;
  const slash = ownerPart.lastIndexOf("/");
  const baseSegments =
    slash >= 0 ? ownerPart.slice(0, slash).split("/") : [];
  const stack = target.startsWith("/") ? [] : [...baseSegments];

  for (const segment of target.replace(/^\//, "").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (stack.length === 0) return null; // would escape the package
      stack.pop();
      continue;
    }
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f]/.test(segment)) return null;
    stack.push(segment);
  }
  return stack.length > 0 ? stack.join("/") : null;
}

export function parseRelationships(
  pkg: PptxPackage,
  ownerPart: string,
  maxXmlBytes: number,
): RelationshipMap {
  const map: RelationshipMap = new Map();
  const relsName = relsPartFor(ownerPart);
  if (!pkg.has(relsName)) return map;

  const doc = pkg.xml(relsName, maxXmlBytes);
  if (!doc?.documentElement) return map;

  for (const rel of descendants(doc.documentElement, "Relationship")) {
    const id = attr(rel, "Id");
    const type = attr(rel, "Type") ?? "";
    const target = attr(rel, "Target") ?? "";
    if (!id || !target) continue;
    const external = attr(rel, "TargetMode") === "External";
    map.set(id, { id, type, target, external });
  }
  return map;
}

/** Resolve a relationship id to a package part name (null if external/unsafe). */
export function relTargetPart(
  rels: RelationshipMap,
  ownerPart: string,
  relId: string,
): string | null {
  const rel = rels.get(relId);
  if (!rel || rel.external) return null;
  return resolveTarget(ownerPart, rel.target);
}
