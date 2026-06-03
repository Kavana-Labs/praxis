# Praxis Document Format

The Praxis document is a **versioned, self-contained JSON object**. It is the source of truth
for a presentation and is independent of the React rendering layer. The canonical definition
lives in `apps/web/src/domain/schema.ts` (Zod), from which the TypeScript types are inferred —
the runtime validator and the compile-time types cannot drift.

---

## 1. Top-level shape

```ts
type PraxisDocument = {
  schemaVersion: number;          // current: 1
  id: string;
  title: string;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
  metadata: { author?: string; description?: string; tags?: string[] };
  theme: PraxisTheme;
  slides: SlideContainer[];       // ordered; a projection over objects
  objects: Record<string, PraxisObject>;   // normalized by id
  assets: Record<string, PraxisAsset>;     // normalized by id
  citations: Record<string, CitationRecord>; // normalized by id
};
```

### Modeling rules

- **Objects are canonical** and stored normalized in `objects`.
- **Slides reference objects by id** (`objectIds`); they never embed object content.
- For any slide, `objectIds` order **is** the paint order, and each object's `zIndex` equals its
  index in that array (enforced by the command layer and the normalizer).
- Assets and citations are normalized and referenced by id.
- Coordinates are in **logical slide units** (a fixed `1600 × 900`, 16:9 space), never pixels.

---

## 2. Objects

Every object shares a base:

```ts
type BasePraxisObject = {
  id: string;
  type: PraxisObjectType;
  x: number; y: number; width: number; height: number;  // logical units
  zIndex: number;
  createdAt: string; updatedAt: string;
  locked?: boolean; hidden?: boolean;
};
```

The union is discriminated on `type`:

| `type` | Key payload fields |
| --- | --- |
| `text` | `html` (sanitized rich text), `align?` |
| `heading` | `text`, `level` (1–3), `align?` |
| `math` | `latex` (source of truth), `display?` |
| `code` | `language`, `source`, `execution?` |
| `image` | `assetId \| null`, `alt?`, `caption?`, `fit?` |
| `citation` | `citationId` (→ `citations`), `style?` |
| `artifact` | `artifactId`, `artifactType`, `mimeType`, `assetId \| null`, `dataUrl?`, `executionId?`, `caption?` |
| `shape` | `shape` (`rectangle \| line \| divider`), `fill?`, `stroke?`, `strokeWidth?`, `radius?` |

`CodeObject.execution` captures the last run (status, stdout, stderr, exitCode, durationMs,
errorCategory, artifacts) for traceability and Present Mode display.

### Supporting records

```ts
type PraxisAsset = { id; kind: "image"|"artifact"; mimeType; dataUrl?; url?; filename?; width?; height?; createdAt };
type CitationRecord = { id; key; title; authors: string[]; year?: number|null; source?; url?; doi? };
type SlideContainer = { id; title?; objectIds: string[]; notes?; background?: { type: "none"|"color"; color? } };
```

---

## 3. Schema versioning & migrations

- Every document carries `schemaVersion` (current `1`).
- Forward-only migrations live in `apps/web/src/domain/migrations.ts`. `migrateToCurrent`
  applies registered migrations in sequence until the document reaches the current version.
- A document from a **newer** version than the running app is rejected with a clear message.
- Adding a new object type is additive and does not require a migration of existing documents.

---

## 4. Import / export

- **Export** (`exportDocument`) produces deterministic, key-sorted JSON, so the same logical
  document always serializes identically (diff-friendly, test-stable).
- **Import** (`importDocument`) runs a strict pipeline and fails gracefully at every step:
  1. parse JSON,
  2. check `schemaVersion`,
  3. migrate to current,
  4. validate against the Zod schema (returns structured issues on failure),
  5. **normalize** — drop dangling references, clamp object bounds, densify z-index, soften
     missing asset/citation references, guarantee ≥ 1 slide.

Invalid input never throws; it returns `{ ok: false, error, issues? }`.

---

## 5. Sample (truncated)

```json
{
  "schemaVersion": 1,
  "id": "doc_seed_harmonic_motion",
  "title": "Modeling Harmonic Motion",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "metadata": { "author": "Kavana Labs", "tags": ["physics", "example"] },
  "theme": { "id": "praxis-light", "background": "#ffffff", "text": "#0f172a", "accent": "#4f46e5" },
  "slides": [
    { "id": "slide_seed_3", "title": "Equation", "objectIds": ["obj_seed_007", "obj_seed_008"] }
  ],
  "objects": {
    "obj_seed_007": {
      "id": "obj_seed_007", "type": "heading", "text": "Equation of motion", "level": 2,
      "x": 120, "y": 90, "width": 1100, "height": 90, "zIndex": 0,
      "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
    },
    "obj_seed_008": {
      "id": "obj_seed_008", "type": "math", "latex": "x(t) = A \\cos(\\omega t + \\phi)", "display": true,
      "x": 300, "y": 280, "width": 1000, "height": 180, "zIndex": 1,
      "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  },
  "assets": {},
  "citations": {}
}
```
