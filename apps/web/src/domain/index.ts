/**
 * The Praxis domain model — the source of truth for documents, objects, slides,
 * assets, and citations. This layer is independent of React and rendering.
 *
 * Layering:
 *   schema.ts      Zod schemas (single source of truth)
 *   types.ts       TypeScript types inferred from the schemas
 *   constants.ts   Logical slide dimensions & invariants
 *   geometry.ts    Centralized coordinate transforms (logical <-> screen)
 *   factory.ts     Default constructors
 *   migrations.ts  Forward-only schema migrations
 *   normalize.ts   Reference/bounds/z-index repair
 *   serialize.ts   Deterministic export + validated import
 */
export * from "./constants";
export * from "./geometry";
export * from "./ids";
export * from "./types";
export * from "./factory";
export * from "./migrations";
export * from "./normalize";
export * from "./serialize";
export {
  praxisDocumentSchema,
  praxisObjectSchema,
  objectTypeSchema,
  CURRENT_SCHEMA_VERSION,
} from "./schema";
