# Presentation Import

Praxis imports existing presentations from **PowerPoint (`.pptx`)** files and
**Google Slides**, converting them into native, fully editable Praxis
documents. The feature does not claim perfect fidelity: supported content
becomes editable objects, approximations and fallbacks are clearly reported,
and nothing visible is silently discarded.

## Architecture

One canonical pipeline. Google Slides is an *acquisition path*, not a second
parser — selected presentations are exported to PowerPoint by the Drive API
and fed into the same importer as local uploads.

```
Local PPTX upload ─────────────────┐
                                   ├──→ PPTX parser → intermediate model → Praxis document
Google Slides picker → PPTX export ┘
```

Pipeline stages (`apps/web/src/features/presentation-import/`):

```
Input source (.pptx bytes)
    ↓ packageReader      — hardened OOXML ZIP reading (limits, traversal guards)
    ↓ pptxParser         — manifest, slide size, slide order, theme, media
    ↓ slideParser        — spTree walk: text, images, shapes, lines, tables,
    ↓                      charts, groups (flattened), unsupported content
    ↓ intermediate model — ImportedPresentation (source-faithful, warning-carrying)
    ↓ praxisDocumentConverter — native objects + fallbacks + report
    ↓ normalizeDocument + schema validation
    ↓ persistence (local adapter)
    ↓ editor
```

The pipeline currently runs **in the browser**: Praxis persistence is
local-first (localStorage), so the converted document must land client-side
anyway, and the deployed web app is a static site. The parser and converter
are environment-agnostic modules (no UI imports); the orchestrator
`services/importPresentation.ts` is the seam where a server-backed
implementation can be introduced later without touching the stages.

### Module map

| Module | Responsibility |
| --- | --- |
| `types.ts` | Intermediate model, warnings, report, summary, progress, limits |
| `pptx/packageReader.ts` | ZIP magic check, entry validation, decompression budget |
| `pptx/xml.ts` | Safe XML parsing (DOCTYPE rejected), namespace-tolerant traversal |
| `pptx/relationships.ts` | `.rels` parsing + root-confined target resolution |
| `pptx/unitConversion.ts` | EMU → logical 1600×900 mapping, aspect fitting, rotation |
| `pptx/theme.ts` | Theme color scheme + scheme/srgb/sys color resolution |
| `pptx/textParser.ts` | Paragraphs, runs, styling, bullet/number list metadata |
| `pptx/slideParser.ts` | Shape-tree walk, group flattening, per-element fallbacks |
| `pptx/notesParser.ts` | Speaker notes |
| `pptx/pptxParser.ts` | Orchestration: order, media registration, fonts, deck warnings |
| `convert/richText.ts` | Imported paragraphs → sanitized Praxis rich-text HTML |
| `convert/praxisDocumentConverter.ts` | Intermediate model → validated PraxisDocument |
| `report/importReportBuilder.ts` | Warnings → summary + grouped report |
| `services/importPresentation.ts` | Validation, progress, persistence (service boundary) |
| `services/googleSlides.ts` | GIS token, Picker, Drive export → shared pipeline |
| `components/` | Modal, upload, progress, summary, report UI |

## Fidelity tiers

**Tier 1 — native editable conversion.** Text boxes (bold, italic, underline,
text color, alignment, bullet/numbered lists), titles → heading objects
(placeholder-based detection only; no over-classification), images (PNG, JPEG,
GIF, WebP, SVG, BMP) through the asset abstraction, rectangles and rounded
rectangles, straight lines/dividers, solid slide backgrounds, slide order,
z-order, speaker notes.

**Tier 2 — editable approximation (warned).** Ellipses → fully rounded
rectangles; other shape presets → rectangles with the same fill/border; text
inside shapes → text objects carrying the shape's fill/border; gradients →
first-stop solid color; vertical lines → thin filled rectangles; grouped
elements → flattened children (group transform applied); justified text →
left; nested lists → single-level lists; non-16:9 decks → proportional fit
with padding; custom fonts → Praxis default (reported once per font); theme
colors → resolved static colors (lum/tint/shade approximated).

**Tier 3/4 — fallbacks (warned, review-flagged).** Tables → structured text
block preserving all cell text; charts, SmartArt, embedded objects, and
unsupported image formats (EMF/WMF/TIFF) → labelled placeholder cards with a
manual-replacement hint; videos → poster image where present. Animations and
transitions are reported once per deck and not imported.

Every approximation or fallback adds an entry to the **import report**
(grouped by slide; severity `info`/`warning`/`error`; fallback description;
review flag). The report is embedded in the document metadata
(`metadata.importReport`), so it travels with exports and survives reloads.

## Coordinate conversion

PowerPoint geometry is in EMU (914,400 per inch). The importer reads the
declared slide size, computes a **uniform** scale to fit it inside the Praxis
1600×900 logical canvas, and centers it — 16:9 maps edge-to-edge; 4:3 and
portrait decks are pillar/letter-boxed with a deck-level warning. Content is
never stretched per-axis. Rotation converts from 60,000ths of a degree to
degrees. All conversion lives in `pptx/unitConversion.ts`.

## Google Slides flow

1. The user clicks **Import from Google Slides** and grants a token via
   Google Identity Services with the **`drive.file`** scope — combined with
   the Picker, Praxis can read *only* the presentations the user explicitly
   selects. The integration is read-only.
2. The Picker (filtered to presentations, single-select) yields a file id.
3. The file is exported as `.pptx` via
   `GET drive/v3/files/{id}/export?mimeType=…presentationml.presentation`.
4. The bytes enter the same pipeline as a local upload.

Handled error paths: consent or Picker cancelled (calm notice), expired
token, missing permission, file not found, Google unreachable, export
failure, and the Drive **export size limit** (~10 MB), which shows:

> This Google Slides presentation is too large to import directly. Download
> it as a `.pptx` file from Google Slides and upload the PowerPoint file
> instead.

### Configuration

Set in `apps/web/.env.local` (all three are **public-by-design frontend
values** — the token flow uses no client secret anywhere):

```
VITE_GOOGLE_CLIENT_ID=   # OAuth 2.0 Web client id (Google Cloud Console)
VITE_GOOGLE_API_KEY=     # API key with the Picker API enabled
VITE_GOOGLE_APP_ID=      # optional: Cloud project number (improves drive.file scoping)
```

Cloud Console setup: enable **Google Picker API** and **Google Drive API**,
create an OAuth Web client (authorized JavaScript origins: your dev/prod
URLs), and create an API key. `GOOGLE_CLIENT_SECRET` / redirect URIs are
**not used** — they belong to server-side authorization-code flows, which
this MVP deliberately avoids; if a Praxis backend later takes over the
export, the secret would live only in backend environment variables.

When the variables are absent the option renders disabled with a clear
"not configured" note; nothing else degrades.

## Security controls

Uploaded files are untrusted input:

- extension + MIME validation; legacy `.ppt` rejected with guidance;
- ZIP magic check; entry-name validation (no traversal, no absolute paths,
  no control characters, length caps); entry-count cap;
- per-entry and package-wide decompression budgets enforced from declared
  sizes *before* inflation (ZIP-bomb guard);
- XML size caps; `<!DOCTYPE` rejected outright (no entity expansion of any
  kind); parser errors fail closed per part;
- relationship targets resolved inside the package root only;
- media filenames sanitized; only allow-listed image MIME types embedded;
  SVG rejected if it contains DOCTYPE or scripts;
- imported rich text is generated from escaped text and passes through the
  DOMPurify sanitizer (span `style` restricted to a literal `color: #hex`);
- macros, embedded scripts, and OLE objects are never executed — they become
  placeholders;
- Google access tokens stay in memory, are never persisted, and never logged.

## Limits (configurable in `types.ts` → `DEFAULT_IMPORT_LIMITS`)

| Limit | Default |
| --- | --- |
| `.pptx` upload size | 50 MB |
| Slides per import | 200 |
| Extracted assets | 500 |
| Total decompressed size | 250 MB |
| Single extracted asset | 20 MB |
| Single XML part | 10 MB |

Browser `localStorage` (~5–10 MB) bounds *persistence* of very media-heavy
decks: such imports still open and present, with a clear notice that they
won't survive a reload. This is a storage-backend limitation, not a parser
limit.

## Testing

- `src/features/presentation-import/__tests__/fixtures.ts` builds real
  `.pptx` packages programmatically (also used by the Playwright smoke).
- `pptx-import.test.ts` — coordinates (16:9, 4:3, portrait, invalid),
  security (non-ZIP, missing manifest, traversal names, DOCTYPE, limits),
  text/image/shape/line/notes/background extraction, groups, ellipses,
  SmartArt, layout-inherited placeholders, empty decks, conversion,
  schema validation, report contents.
- `google-slides.test.ts` — export client error mapping (oversize, expired,
  not-found, unreachable) and shared-pipeline invocation, with mocked fetch.
- `sanitize-import.test.ts` — the color-only style policy.
- `e2e/import.spec.ts` — upload → progress → summary → report → open →
  edit imported text → drag imported image → reload persistence → Present
  Mode; `.ppt`/invalid-file rejection; discard.

## Troubleshooting

- **"We could not read this PowerPoint file"** — the file is not a valid
  OOXML package (or is a renamed `.ppt`). Re-save as `.pptx`.
- **Google option disabled** — `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_API_KEY`
  are not set for this deployment.
- **Google popup closes immediately** — the origin is missing from the OAuth
  client's authorized JavaScript origins.
- **"too large to import directly" (Google)** — Drive's export limit;
  download as `.pptx` from Google Slides and upload it.
- **Deck imports but doesn't persist** — browser storage quota; the notice in
  the summary explains the session-only state.

## Non-goals (this phase)

Pixel-perfect fidelity, `.ppt`/Keynote, Google Slides live sync or
round-trip, PowerPoint export, animation/transition import, macro execution,
embedded video playback, chart/table/SmartArt editors, bulk imports, font
downloading.
