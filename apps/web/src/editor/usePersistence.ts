import { useEffect, useRef } from "react";
import { persistence } from "@/services/persistence";
import { createHarmonicMotionDeck } from "@/seed/harmonic-motion";
import { useEditorStore } from "@/stores/editor-store";

const AUTOSAVE_DELAY_MS = 700;

/**
 * Bootstraps the editor on first mount: opens the user's last document, or
 * seeds the "Modeling Harmonic Motion" example for first-time visitors.
 */
export function useEditorBootstrap(): void {
  const ran = useRef(false);

  useEffect(() => {
    // Guard against React StrictMode's double-invoke. We deliberately do NOT
    // cancel on cleanup: the load is a one-shot global store action, and the
    // first invocation should be allowed to finish.
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const store = useEditorStore.getState();
      try {
        const lastId = await persistence.getLastOpenedId();
        if (lastId) {
          const doc = await persistence.load(lastId);
          if (doc) {
            store.loadDocument(doc);
            return;
          }
        }
        // First run (or corrupt/missing last document): seed the example deck.
        const seed = createHarmonicMotionDeck();
        await persistence.save(seed);
        await persistence.setLastOpenedId(seed.id);
        store.loadDocument(seed);
      } catch {
        // Storage unavailable — fall back to the in-memory seed so the app works.
        store.loadDocument(createHarmonicMotionDeck());
      }
    })();
  }, []);
}

/**
 * Persist the current document immediately (used by autosave and Cmd/Ctrl+S).
 * Safe to call at any time: a save already in flight is not duplicated, and
 * the status only flips to "saved" if nothing changed during the write.
 */
export async function saveNow(): Promise<void> {
  const store = useEditorStore.getState();
  if (store.saveStatus === "saving") return;
  store.setSaveStatus("saving");
  try {
    await persistence.save(store.document);
    await persistence.setLastOpenedId(store.document.id);
    if (useEditorStore.getState().document === store.document) {
      useEditorStore.getState().setSaveStatus("saved");
    } else {
      useEditorStore.getState().setSaveStatus("dirty");
    }
  } catch {
    useEditorStore.getState().setSaveStatus("error");
  }
}

/**
 * Debounced autosave. Persists the document shortly after edits settle and
 * reflects progress through the save-status badge.
 */
export function useAutosave(): void {
  const document = useEditorStore((s) => s.document);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    // Skip the very first render (initial/bootstrap document is already saved).
    if (first.current) {
      first.current = false;
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (useEditorStore.getState().saveStatus !== "dirty") return;
      void saveNow();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [document]);
}
