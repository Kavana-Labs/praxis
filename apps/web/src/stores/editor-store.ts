import { produce } from "immer";
import { create } from "zustand";
import * as cmd from "@/domain/commands";
import {
  createCitationRecord,
  createDocument,
  createObject,
  createSlide,
} from "@/domain/factory";
import { artifactToAsset } from "@/lib/assets";
import type {
  Bounds,
  CitationRecord,
  CodeExecution,
  PraxisAsset,
  PraxisDocument,
  PraxisObjectType,
  SlideBackground,
} from "@/domain/types";

/**
 * The editor store is the single owner of mutable editor state. Every edit goes
 * through a command method here; UI components never mutate the document
 * directly. The store layers three concerns on top of the pure command layer:
 *
 *   1. Undo/redo — snapshots of the (immutable, Immer-frozen) document.
 *   2. Transient interactions — drag/resize produce many intermediate states
 *      but should collapse into ONE undo step (see begin/end Transform).
 *   3. UI state — active slide, selection, and save status (not undoable).
 */

const HISTORY_LIMIT = 100;

export type SaveStatus = "saved" | "saving" | "dirty" | "error";

type DocRecipe = (doc: PraxisDocument) => void;

export type EditorState = {
  document: PraxisDocument;
  activeSlideId: string;
  selectedObjectIds: string[];
  /** Object currently in inline-edit mode (text/heading/code), if any. */
  editingObjectId: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;

  // history
  past: PraxisDocument[];
  future: PraxisDocument[];

  // transient transform bookkeeping (not serialized)
  _transformSnapshot: PraxisDocument | null;
  _transformDirty: boolean;

  // ---- derived helpers ----
  canUndo: () => boolean;
  canRedo: () => boolean;

  // ---- document-level ----
  loadDocument: (doc: PraxisDocument, opts?: { markSaved?: boolean }) => void;
  newDocument: (title?: string) => void;
  setTitle: (title: string) => void;
  setSaveStatus: (status: SaveStatus, savedAt?: string) => void;

  // ---- slides ----
  createSlide: (afterSlideId?: string) => string;
  deleteSlide: (slideId: string) => void;
  duplicateSlide: (slideId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  setActiveSlide: (slideId: string) => void;
  updateSlide: (
    slideId: string,
    patch: { title?: string; notes?: string; background?: SlideBackground },
  ) => void;

  // ---- objects ----
  insertObject: (type: PraxisObjectType, slideId?: string) => string;
  /**
   * Merge a partial patch into an object (records one history step). The patch
   * is intentionally loosely typed: callers are type-specific field forms and
   * the command layer strips `id`/`type`.
   */
  updateObject: (objectId: string, patch: Record<string, unknown>) => void;
  /** Update without recording history; used inside a begin/endTransform session. */
  updateObjectLive: (objectId: string, patch: Record<string, unknown>) => void;
  moveObject: (objectId: string, bounds: Bounds) => void;
  resizeObject: (objectId: string, bounds: Bounds) => void;
  deleteObjects: (objectIds: string[]) => void;
  duplicateObject: (objectId: string) => void;
  bringForward: (objectId: string) => void;
  sendBackward: (objectId: string) => void;
  bringToFront: (objectId: string) => void;
  sendToBack: (objectId: string) => void;
  alignObject: (objectId: string, edge: cmd.AlignEdge) => void;

  // ---- selection ----
  select: (objectIds: string[]) => void;
  toggleSelect: (objectId: string) => void;
  clearSelection: () => void;
  setEditingObject: (objectId: string | null) => void;

  // ---- assets & citations ----
  addAsset: (asset: PraxisAsset) => void;
  insertImageFromAsset: (asset: PraxisAsset) => string;
  /** Attach an image asset to an existing image object in one undo step. */
  attachImageAsset: (objectId: string, asset: PraxisAsset) => void;
  updateCitation: (citationId: string, patch: Partial<CitationRecord>) => void;

  // ---- execution ----
  /** Store a code object's execution result. Not undoable (derived output). */
  setCodeExecution: (objectId: string, execution: CodeExecution | undefined) => void;
  /** Insert a generated artifact onto the active slide as an ArtifactObject. */
  insertArtifact: (artifact: {
    mimeType: string;
    dataUrl: string;
    filename?: string;
    executionId?: string;
    caption?: string;
  }) => string;

  // ---- transient transforms (drag/resize) ----
  beginTransform: () => void;
  transformLive: (recipe: DocRecipe) => void;
  endTransform: () => void;

  // ---- history ----
  undo: () => void;
  redo: () => void;
};

const nowIso = () => new Date().toISOString();

/** Drop selection/active references that no longer resolve after history ops. */
function reconcileRefs(
  doc: PraxisDocument,
  activeSlideId: string,
  selected: string[],
): { activeSlideId: string; selectedObjectIds: string[] } {
  const slideExists = doc.slides.some((s) => s.id === activeSlideId);
  const nextActive = slideExists
    ? activeSlideId
    : (doc.slides[0]?.id ?? activeSlideId);
  const nextSelected = selected.filter((id) => Boolean(doc.objects[id]));
  return { activeSlideId: nextActive, selectedObjectIds: nextSelected };
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** Apply a history-recording mutation. The pre-mutation doc becomes undoable. */
  const mutate = (recipe: DocRecipe) => {
    const { document, past } = get();
    // Apply the recipe first WITHOUT stamping updatedAt, so a recipe that
    // changes nothing (e.g. targeting a missing object) is a true no-op and is
    // detected regardless of the wall clock.
    const changed = produce(document, (draft) => {
      recipe(draft as PraxisDocument);
    });
    if (changed === document) return; // no-op recipe; don't pollute history
    const next = produce(changed, (draft) => {
      draft.updatedAt = nowIso();
    });
    set({
      document: next,
      past: [...past, document].slice(-HISTORY_LIMIT),
      future: [],
      saveStatus: "dirty",
    });
  };

  return {
    document: createDocument(),
    activeSlideId: "",
    selectedObjectIds: [],
    editingObjectId: null,
    saveStatus: "saved",
    lastSavedAt: null,
    past: [],
    future: [],
    _transformSnapshot: null,
    _transformDirty: false,

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    // ---- document-level ----
    loadDocument: (doc, opts) =>
      set({
        document: doc,
        activeSlideId: doc.slides[0]?.id ?? "",
        selectedObjectIds: [],
        editingObjectId: null,
        past: [],
        future: [],
        _transformSnapshot: null,
        _transformDirty: false,
        saveStatus: opts?.markSaved === false ? "dirty" : "saved",
        lastSavedAt: opts?.markSaved === false ? null : nowIso(),
      }),

    newDocument: (title) => {
      const doc = createDocument({ title });
      get().loadDocument(doc, { markSaved: false });
    },

    setTitle: (title) => mutate((doc) => cmd.cmdSetTitle(doc, title)),

    setSaveStatus: (status, savedAt) =>
      set((s) => ({
        saveStatus: status,
        lastSavedAt: status === "saved" ? (savedAt ?? nowIso()) : s.lastSavedAt,
      })),

    // ---- slides ----
    createSlide: (afterSlideId) => {
      const slide = createSlide({ title: "Untitled slide" });
      const anchor = afterSlideId ?? get().activeSlideId;
      mutate((doc) => cmd.cmdCreateSlide(doc, slide, anchor));
      set({ activeSlideId: slide.id, selectedObjectIds: [] });
      return slide.id;
    },

    deleteSlide: (slideId) => {
      const { document, activeSlideId } = get();
      const index = document.slides.findIndex((s) => s.id === slideId);
      if (index < 0) return;

      mutate((doc) => {
        cmd.cmdDeleteSlide(doc, slideId);
        // Never allow an empty deck.
        if (doc.slides.length === 0) {
          doc.slides.push(createSlide({ title: "Title slide" }));
        }
      });

      const slides = get().document.slides;
      let nextActive = activeSlideId;
      if (activeSlideId === slideId) {
        const neighbor = slides[Math.min(index, slides.length - 1)];
        nextActive = neighbor?.id ?? slides[0].id;
      }
      set({ activeSlideId: nextActive, selectedObjectIds: [] });
    },

    duplicateSlide: (slideId) => {
      let newId: string | null = null;
      mutate((doc) => {
        newId = cmd.cmdDuplicateSlide(doc, slideId);
      });
      if (newId) set({ activeSlideId: newId, selectedObjectIds: [] });
    },

    reorderSlides: (fromIndex, toIndex) =>
      mutate((doc) => cmd.cmdReorderSlides(doc, fromIndex, toIndex)),

    setActiveSlide: (slideId) =>
      set({ activeSlideId: slideId, selectedObjectIds: [] }),

    updateSlide: (slideId, patch) =>
      mutate((doc) => cmd.cmdUpdateSlide(doc, slideId, patch)),

    // ---- objects ----
    insertObject: (type, slideId) => {
      const targetSlide = slideId ?? get().activeSlideId;
      const object = createObject(type);
      mutate((doc) => {
        // Citations and references need a backing record.
        if (object.type === "citation") {
          const record = createCitationRecord({ id: object.citationId });
          cmd.cmdAddCitation(doc, record);
        }
        cmd.cmdInsertObject(doc, targetSlide, object);
      });
      set({ selectedObjectIds: [object.id] });
      return object.id;
    },

    updateObject: (objectId, patch) =>
      mutate((doc) => cmd.cmdUpdateObject(doc, objectId, patch)),

    updateObjectLive: (objectId, patch) =>
      get().transformLive((doc) => cmd.cmdUpdateObject(doc, objectId, patch)),

    moveObject: (objectId, bounds) =>
      mutate((doc) => cmd.cmdSetObjectBounds(doc, objectId, bounds)),

    resizeObject: (objectId, bounds) =>
      mutate((doc) => cmd.cmdSetObjectBounds(doc, objectId, bounds)),

    deleteObjects: (objectIds) => {
      if (objectIds.length === 0) return;
      mutate((doc) => cmd.cmdDeleteObjects(doc, objectIds));
      set((s) => ({
        selectedObjectIds: s.selectedObjectIds.filter(
          (id) => !objectIds.includes(id),
        ),
      }));
    },

    duplicateObject: (objectId) => {
      let cloneId: string | null = null;
      mutate((doc) => {
        cloneId = cmd.cmdDuplicateObject(doc, objectId);
      });
      if (cloneId) set({ selectedObjectIds: [cloneId] });
    },

    bringForward: (objectId) =>
      mutate((doc) => cmd.cmdReorderObjectZ(doc, objectId, "forward")),
    sendBackward: (objectId) =>
      mutate((doc) => cmd.cmdReorderObjectZ(doc, objectId, "backward")),
    bringToFront: (objectId) =>
      mutate((doc) => cmd.cmdReorderObjectZ(doc, objectId, "front")),
    sendToBack: (objectId) =>
      mutate((doc) => cmd.cmdReorderObjectZ(doc, objectId, "back")),
    alignObject: (objectId, edge) =>
      mutate((doc) => cmd.cmdAlignObject(doc, objectId, edge)),

    // ---- selection ----
    select: (objectIds) =>
      set((s) => ({
        selectedObjectIds: objectIds,
        // Exit inline editing when selecting a different object.
        editingObjectId:
          s.editingObjectId && objectIds.includes(s.editingObjectId)
            ? s.editingObjectId
            : null,
      })),
    toggleSelect: (objectId) =>
      set((s) => {
        const has = s.selectedObjectIds.includes(objectId);
        return {
          selectedObjectIds: has
            ? s.selectedObjectIds.filter((id) => id !== objectId)
            : [...s.selectedObjectIds, objectId],
        };
      }),
    clearSelection: () => set({ selectedObjectIds: [], editingObjectId: null }),
    setEditingObject: (objectId) => set({ editingObjectId: objectId }),

    // ---- assets & citations ----
    addAsset: (asset) => mutate((doc) => cmd.cmdAddAsset(doc, asset)),

    insertImageFromAsset: (asset) => {
      const object = createObject("image");
      if (object.type !== "image") throw new Error("expected image");
      object.assetId = asset.id;
      object.alt = asset.filename ?? "";
      if (asset.width && asset.height) {
        const ratio = asset.height / asset.width;
        object.height = Math.round(object.width * ratio);
      }
      const targetSlide = get().activeSlideId;
      mutate((doc) => {
        cmd.cmdAddAsset(doc, asset);
        cmd.cmdInsertObject(doc, targetSlide, object);
      });
      set({ selectedObjectIds: [object.id] });
      return object.id;
    },

    attachImageAsset: (objectId, asset) =>
      mutate((doc) => {
        cmd.cmdAddAsset(doc, asset);
        const obj = doc.objects[objectId];
        if (obj?.type === "image") {
          obj.assetId = asset.id;
          if (!obj.alt) obj.alt = asset.filename ?? "";
          if (asset.width && asset.height) {
            const ratio = asset.height / asset.width;
            obj.height = Math.round(obj.width * ratio);
          }
        }
      }),

    updateCitation: (citationId, patch) =>
      mutate((doc) => cmd.cmdUpdateCitation(doc, citationId, patch)),

    // ---- execution ----
    setCodeExecution: (objectId, execution) => {
      // Execution results are computed outputs, not authored edits, so they are
      // applied without recording undo history.
      const { document } = get();
      const next = produce(document, (draft) => {
        const obj = draft.objects[objectId];
        if (obj?.type === "code") obj.execution = execution;
        draft.updatedAt = nowIso();
      });
      if (next === document) return;
      set({ document: next, saveStatus: "dirty" });
    },

    insertArtifact: (artifact) => {
      const asset = artifactToAsset(
        artifact.mimeType,
        artifact.dataUrl,
        artifact.filename,
      );
      const object = createObject("artifact");
      if (object.type !== "artifact") throw new Error("expected artifact");
      object.artifactType = artifact.mimeType.startsWith("image/") ? "image" : "data";
      object.mimeType = artifact.mimeType;
      object.assetId = asset.id;
      object.executionId = artifact.executionId;
      object.caption = artifact.caption ?? "";
      const targetSlide = get().activeSlideId;
      mutate((doc) => {
        cmd.cmdAddAsset(doc, asset);
        cmd.cmdInsertObject(doc, targetSlide, object);
      });
      set({ selectedObjectIds: [object.id] });
      return object.id;
    },

    // ---- transient transforms ----
    beginTransform: () =>
      set({ _transformSnapshot: get().document, _transformDirty: false }),

    transformLive: (recipe) => {
      const { document } = get();
      const changed = produce(document, (draft) => {
        recipe(draft as PraxisDocument);
      });
      if (changed === document) return; // true no-op
      const next = produce(changed, (draft) => {
        draft.updatedAt = nowIso();
      });
      set({ document: next, _transformDirty: true, saveStatus: "dirty" });
    },

    endTransform: () => {
      const { _transformSnapshot, _transformDirty, past } = get();
      if (_transformDirty && _transformSnapshot) {
        set({
          past: [...past, _transformSnapshot].slice(-HISTORY_LIMIT),
          future: [],
        });
      }
      set({ _transformSnapshot: null, _transformDirty: false });
    },

    // ---- history ----
    undo: () => {
      const { past, future, document, activeSlideId, selectedObjectIds } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const refs = reconcileRefs(previous, activeSlideId, selectedObjectIds);
      set({
        document: previous,
        past: past.slice(0, -1),
        future: [document, ...future].slice(0, HISTORY_LIMIT),
        saveStatus: "dirty",
        ...refs,
      });
    },

    redo: () => {
      const { past, future, document, activeSlideId, selectedObjectIds } = get();
      if (future.length === 0) return;
      const next = future[0];
      const refs = reconcileRefs(next, activeSlideId, selectedObjectIds);
      set({
        document: next,
        past: [...past, document].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        saveStatus: "dirty",
        ...refs,
      });
    },
  };
});

/** Initialize active slide on first load (store starts with a fresh document). */
const initial = useEditorStore.getState();
if (!initial.activeSlideId && initial.document.slides[0]) {
  useEditorStore.setState({ activeSlideId: initial.document.slides[0].id });
}

// Dev-only handle for debugging and end-to-end tests.
if (import.meta.env?.DEV && typeof window !== "undefined") {
  (window as unknown as { __praxisStore?: typeof useEditorStore }).__praxisStore =
    useEditorStore;
}
