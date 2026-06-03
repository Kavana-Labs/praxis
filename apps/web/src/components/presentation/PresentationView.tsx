import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize, X } from "lucide-react";
import { projectPresentation } from "@/domain/projection";
import { useEditorStore } from "@/stores/editor-store";
import { PresentationSlideView } from "./PresentationSlideView";

/**
 * Full-screen Present Mode. Renders the presentation projection of the current
 * document with keyboard navigation. Independent of the editor: it shares only
 * the document model, never editor controls or DOM.
 *
 *   →  Space  PageDown   next slide
 *   ←  PageUp            previous slide
 *   Home / End           first / last
 *   F                    toggle fullscreen
 *   Esc                  exit
 */
export function PresentationView({ onExit }: { onExit: () => void }) {
  const document = useEditorStore((s) => s.document);
  const activeSlideId = useEditorStore((s) => s.activeSlideId);
  const model = useMemo(() => projectPresentation(document), [document]);

  const startIndex = Math.max(
    0,
    model.slides.findIndex((s) => s.id === activeSlideId),
  );
  const [index, setIndex] = useState(startIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touch = useRef({ x: 0, swiped: false });

  const count = model.slides.length;
  const clampedIndex = Math.min(index, Math.max(0, count - 1));
  const slide = model.slides[clampedIndex];

  const next = useCallback(() => setIndex((i) => Math.min(count - 1, i + 1)), [count]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!window.document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await window.document.exitFullscreen();
      }
    } catch {
      /* fullscreen not permitted — no-op */
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(count - 1);
          break;
        case "f":
        case "F":
          void toggleFullscreen();
          break;
        case "Escape":
          // If we're in browser fullscreen, the first Esc exits fullscreen;
          // otherwise exit Present Mode.
          if (!window.document.fullscreenElement) onExit();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, count, toggleFullscreen, onExit]);

  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(Boolean(window.document.fullscreenElement));
    window.document.addEventListener("fullscreenchange", onFsChange);
    return () => window.document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!slide) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Nothing to present.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative h-screen w-screen touch-pan-y overflow-hidden bg-slate-950"
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, swiped: false };
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touch.current.x;
        if (Math.abs(dx) > 40) {
          touch.current.swiped = true;
          if (dx < 0) next();
          else prev();
        }
      }}
      onClick={(e) => {
        // A swipe already navigated — don't also treat it as a tap.
        if (touch.current.swiped) {
          touch.current.swiped = false;
          return;
        }
        // Tap the right two-thirds to advance, left third to go back.
        const x = e.clientX / window.innerWidth;
        if (x < 0.33) prev();
        else next();
      }}
    >
      <div className="absolute inset-0 p-[3vmin]">
        <PresentationSlideView slide={slide} document={document} theme={model.theme} />
      </div>

      {/* Controls — always visible on touch; fade in on hover on desktop. */}
      <div
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-slate-200 opacity-100 backdrop-blur transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={prev}
          disabled={clampedIndex === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30"
          title="Previous"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[64px] text-center text-sm tabular-nums">
          {clampedIndex + 1} / {count}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={clampedIndex === count - 1}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30"
          title="Next"
        >
          <ChevronRight size={18} />
        </button>
        <div className="mx-1 h-5 w-px bg-white/20" />
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
          title="Fullscreen (F)"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
          title="Exit (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Slide counter, always visible but subtle. */}
      <div className="absolute bottom-4 right-5 text-xs font-medium text-slate-400">
        {clampedIndex + 1} / {count}
      </div>
    </div>
  );
}
