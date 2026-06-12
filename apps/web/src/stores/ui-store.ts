import { create } from "zustand";

/**
 * Ephemeral editor-UI state that is deliberately kept OUT of the document
 * store: it is never undoable, never persisted, and changes at interaction
 * frequency (so keeping it here avoids waking document subscribers).
 */
export type CanvasInteraction = "idle" | "dragging" | "resizing";

type UiState = {
  /** Current logical→pixel scale of the editor slide viewport (for the zoom readout). */
  canvasScale: number;
  /** What the pointer is doing on the canvas right now. */
  interaction: CanvasInteraction;
  setCanvasScale: (scale: number) => void;
  setInteraction: (interaction: CanvasInteraction) => void;
};

export const useUiStore = create<UiState>((set) => ({
  canvasScale: 1,
  interaction: "idle",
  setCanvasScale: (canvasScale) =>
    set((s) => (s.canvasScale === canvasScale ? s : { canvasScale })),
  setInteraction: (interaction) =>
    set((s) => (s.interaction === interaction ? s : { interaction })),
}));
