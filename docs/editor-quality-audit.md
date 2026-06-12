# Editor Quality Audit — June 2026

Audit of `apps/web` ahead of the editor-refinement pass. Findings are ordered by
subsystem; each item is either fixed by the refinement or explicitly deferred.

## What exists

| Subsystem | Where | State |
| --- | --- | --- |
| Domain model | `src/domain` (schema, types, commands, geometry, factory, serialize, migrations, normalize, projection) | Solid. Zod-derived types, pure command layer, centralized geometry, versioned import. |
| Editor store | `src/stores/editor-store.ts` | Solid core. Zustand + Immer, undo/redo snapshots, transient transform sessions (one undo entry per drag). |
| Canvas | `src/components/canvas/SlideCanvas.tsx` + `SlideStage.tsx` | Logical 1600×900 space + single fit-scale — good. Interaction layer built on `react-rnd` — the main source of bugs (below). |
| Object renderers | `src/components/objects/*` + `registry.tsx` | Registry-style, three render modes (edit/present/thumbnail). Good shape. |
| Inline editors | `src/components/objects/editors/*` | Tiptap (text), CodeMirror 6 (code), textarea (heading, math). Session-based undo coalescing works. |
| Chrome | top bar, slide list, inspector, insert toolbar | Functional but with dead controls, per-keystroke history pollution, and re-render hot spots. |
| Persistence | `src/services/persistence` + `src/editor/usePersistence.ts` | Adapter interface + localStorage impl, debounced autosave, graceful corrupt-data recovery. Good. |
| Present Mode | `src/components/presentation/*` | Separate projection, no editor DOM, keyboard nav. Good. |
| Prototype canvas | `CanvasSurface/SelectionLayer/CustomCursor/objectLayer`, `pages/app/slide/*`, route `/new` | Dead-end infinite-canvas prototype on `interactjs` + `@use-gesture/react`; reachable in the product; 18 of 28 lint errors. **Removed.** |

## Defects found

### Canvas engine (react-rnd)
1. No drag threshold — any click risks a sub-pixel move; selection and drag are entangled.
2. `bounds="parent"` is unreliable inside a `transform: scale()` parent (jitter/clamping errors at small scales; known react-rnd + scale drift on resize).
3. `cmdSetObjectBounds`/`cmdUpdateObject` stamp `updatedAt` unconditionally → a no-move drag still registers as a change → phantom history entries on click.
4. Incremental delta accumulation (`onDrag` deltas) instead of start-bounds + total-delta → drift.
5. No per-type minimum sizes, no Shift/aspect-ratio resize, no image/artifact aspect preservation.
6. Selection handles render under overlapping objects (no overlay layer).
7. Every `ObjectFrame` receives the whole `document` prop → all objects re-render on any document change (memo defeated). CodeMirror instances re-render on every keystroke anywhere.

### Keyboard
8. `Cmd+Z` is intercepted globally even while typing in Tiptap/CodeMirror — hijacks the editors' internal undo *and* can rewind the document mid transform-session, corrupting the session snapshot.
9. Handlers ignore `e.defaultPrevented`.
10. Nudge steps were 8/40 (spec: 1 / Shift = 10). No copy/paste, no Cmd+S, Escape did not step editing → selected → deselected.

### Chrome / state
11. Top-bar title commits a history entry per keystroke (no draft/blur-commit, no Escape cancel).
12. Inspector number inputs commit-and-clamp per keystroke (typing "150" produces 3 history entries and mid-typing clamps). Slide title/notes likewise.
13. `SlideList` subscribes to the entire document → all thumbnails re-render on every keystroke/drag frame.
14. Slide delete had no confirmation, ever (even for slides full of content).
15. HTML5 drag-and-drop reorder: no `dataTransfer.setData` (Firefox no-op), no insertion indicator, drop-on-gap does nothing.
16. Dead controls: inspector "Animation" tab, two decorative icon `<span>`s styled as buttons, duplicate "Preview" button; lock exists in the schema/canvas but has **no UI**; empty-slide hint says "toolbar above" while the toolbar is below.
17. Rich text has no stylesheet — Tailwind preflight strips list markers, so bullet/numbered lists in text objects render unstyled everywhere.
18. Text-editor formatting toolbar renders inside the scaled stage → it scales with the slide and is clipped by `overflow: hidden`.

### Editors
19. Escape did not exit editing for any editor; heading editor accepted newlines (Enter should commit).
20. Math editor showed KaTeX's raw red source for parse errors with no friendly message.
21. Image objects: no upload affordance on the object itself (inspector-only).

## Decisions

- **Replace `react-rnd` with a purpose-built pointer interaction layer** (`useObjectInteraction`) on top of `domain/geometry`: pointer capture, 4-px start threshold, start-bounds + total-delta math, rAF-throttled live commits, per-type minimums, Shift/auto aspect lock, slide-bounds clamping. Selection chrome moves to an overlay above all objects.
- **Delete the prototype canvas** (`/new` route, CanvasSurface stack) and drop `react-rnd`, `interactjs`, `@use-gesture/react`.
- **Draft-commit inputs** (blur/Enter commit, Escape cancel) for the document title and all inspector numeric/text fields.
- **Narrow store subscriptions** per object frame / slide list item; leaf object views subscribe to just their asset/citation slice.
- **Internal clipboard** on the store for Cmd+C/V; paste cascades and works across slides.
- Slide reorder switched to pointer-based DnD with an insertion indicator; delete asks for confirmation only when the slide has objects.
