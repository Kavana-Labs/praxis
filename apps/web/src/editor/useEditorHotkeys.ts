import { useEffect } from "react";
import { INLINE_EDITABLE_TYPES } from "@/domain/constants";
import { useEditorStore } from "@/stores/editor-store";
import { saveNow } from "./usePersistence";

const INLINE_EDITABLE = new Set<string>(INLINE_EDITABLE_TYPES);

/**
 * Editor-wide keyboard shortcuts. Forwards user intent to the command layer;
 * it never mutates the document directly.
 *
 *   Cmd/Ctrl+Z          undo            (document — never while typing)
 *   Cmd/Ctrl+Shift+Z    redo            (also Ctrl+Y)
 *   Cmd/Ctrl+S          save now
 *   Cmd/Ctrl+C / V      copy / paste selected objects
 *   Cmd/Ctrl+D          duplicate selected object
 *   Cmd/Ctrl+] / [      bring forward / send backward
 *   Enter               edit the selected object (inline-editable types)
 *   Delete / Backspace  delete selected objects
 *   Arrows              nudge by 1 (Shift = 10) logical units
 *   Escape              editing → selected → deselected
 *
 * While the user is typing (inputs, textareas, contenteditable — including the
 * Tiptap and CodeMirror editors) every document shortcut is suppressed so the
 * focused editor keeps its own keyboard behavior, including its own undo
 * history. Handlers also respect `defaultPrevented` set by nested editors.
 */

const NUDGE = 1;
const NUDGE_LARGE = 10;

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable === true
  );
}

export function useEditorHotkeys(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // a nested editor already handled it
      const store = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const typing = isTypingTarget(e.target);
      const editing = store.editingObjectId !== null;

      // Explicit save always works, even mid-typing.
      if (mod && key === "s") {
        e.preventDefault();
        void saveNow();
        return;
      }

      // Document undo/redo — but never while typing or inline-editing:
      // Tiptap/CodeMirror own their undo stacks during an editing session, and
      // rewinding the document mid-session would corrupt the session snapshot.
      if (mod && (key === "z" || key === "y")) {
        if (typing || editing) return;
        e.preventDefault();
        if (key === "y" || e.shiftKey) store.redo();
        else store.undo();
        return;
      }

      if (e.key === "Escape") {
        // One level at a time: editing → selected → deselected.
        if (editing) {
          e.preventDefault();
          store.setEditingObject(null);
          return;
        }
        if (typing) {
          (e.target as HTMLElement).blur?.();
          return;
        }
        if (store.selectedObjectIds.length > 0) {
          store.clearSelection();
        }
        return;
      }

      // Inline editing owns the keyboard even before its editor grabs focus
      // (the brief gap after double-click) — object-level shortcuts stay inert.
      if (typing || editing) return;

      const selected = store.selectedObjectIds;

      // Enter opens the selected object for inline editing — the keyboard
      // equivalent of double-click, so editing is reachable without a mouse.
      if (e.key === "Enter") {
        if (selected.length === 1) {
          const obj = store.document.objects[selected[0]];
          if (obj && !obj.locked && INLINE_EDITABLE.has(obj.type)) {
            e.preventDefault();
            store.setEditingObject(selected[0]);
          }
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selected.length > 0) {
          e.preventDefault();
          store.deleteObjects(selected);
        }
        return;
      }

      if (mod && key === "d") {
        if (selected.length === 1) {
          e.preventDefault();
          store.duplicateObject(selected[0]);
        }
        return;
      }

      if (mod && key === "c") {
        if (selected.length > 0 && store.copySelection()) {
          e.preventDefault();
        }
        return;
      }

      if (mod && key === "v") {
        if (store.clipboard) {
          e.preventDefault();
          store.pasteClipboard();
        }
        return;
      }

      if (mod && (e.key === "]" || e.key === "[")) {
        if (selected.length === 1) {
          e.preventDefault();
          if (e.key === "]") store.bringForward(selected[0]);
          else store.sendBackward(selected[0]);
        }
        return;
      }

      if (
        selected.length > 0 &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_LARGE : NUDGE;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        store.nudgeSelected(dx, dy);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
