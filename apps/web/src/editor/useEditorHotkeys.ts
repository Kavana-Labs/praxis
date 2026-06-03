import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Editor-wide keyboard shortcuts. Forwards user intent to the command layer;
 * it never mutates the document directly.
 *
 *   Cmd/Ctrl+Z         undo
 *   Cmd/Ctrl+Shift+Z   redo  (also Ctrl+Y)
 *   Delete / Backspace delete selected objects
 *   Cmd/Ctrl+D         duplicate selected object
 *   Cmd/Ctrl+] / [     bring forward / send backward
 *   Arrows             nudge selected object (Shift = larger step)
 *   Escape             clear selection
 *
 * Shortcuts are suppressed while the user is typing in an input, textarea, or
 * contenteditable surface (e.g. the rich-text or code editors).
 */

const NUDGE = 8;
const NUDGE_LARGE = 40;

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
      const store = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const typing = isTypingTarget(e.target);

      // Undo / redo work even mid-typing only when the modifier is held.
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
        return;
      }

      if (typing) return;

      const selected = store.selectedObjectIds;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selected.length > 0) {
          e.preventDefault();
          store.deleteObjects(selected);
        }
        return;
      }

      if (mod && e.key.toLowerCase() === "d") {
        if (selected.length === 1) {
          e.preventDefault();
          store.duplicateObject(selected[0]);
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

      if (e.key === "Escape") {
        if (selected.length > 0) store.clearSelection();
        return;
      }

      if (
        selected.length === 1 &&
        (e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight")
      ) {
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_LARGE : NUDGE;
        const obj = store.document.objects[selected[0]];
        if (!obj) return;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        store.moveObject(selected[0], {
          x: obj.x + dx,
          y: obj.y + dy,
          width: obj.width,
          height: obj.height,
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
