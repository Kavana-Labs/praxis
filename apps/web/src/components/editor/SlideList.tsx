import { memo, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { Copy, EllipsisVertical, Plus, Trash2 } from "lucide-react";
import type { SlideContainer } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { getSlideObjects, useTheme } from "@/stores/selectors";
import { cn } from "@/lib/utils";
import { SlideThumbnail } from "./SlideThumbnail";

/**
 * Left sidebar: ordered slide thumbnails with index badges, a violet ring on
 * the active slide, a per-slide ⋯ menu (duplicate / delete with confirm), and
 * pointer-based drag reordering with an insertion indicator.
 *
 * Reordering uses a small movement threshold so a click reliably selects and a
 * drag reliably reorders — never both.
 */

const DRAG_THRESHOLD_PX = 5;

type DragState = {
  pointerId: number;
  fromIndex: number;
  startY: number;
  started: boolean;
  /** Gap index the slide would be inserted into (0..slides.length). */
  gap: number;
};

function SlideItemMenu({
  slide,
  canDelete,
  onClose,
}: {
  slide: SlideContainer;
  canDelete: boolean;
  onClose: () => void;
}) {
  const duplicateSlide = useEditorStore((s) => s.duplicateSlide);
  const deleteSlide = useEditorStore((s) => s.deleteSlide);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const hasContent = slide.objectIds.length > 0;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const item =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors";

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Slide actions"
      className="absolute right-0 top-7 z-30 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className={`${item} text-gray-700 hover:bg-gray-100`}
        onClick={() => {
          duplicateSlide(slide.id);
          onClose();
        }}
      >
        <Copy size={13} /> Duplicate
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canDelete}
        className={cn(
          item,
          confirming
            ? "bg-red-50 text-red-700 hover:bg-red-100"
            : "text-red-600 hover:bg-red-50",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
        onClick={() => {
          // Slides with content ask once; empty slides delete immediately.
          if (hasContent && !confirming) {
            setConfirming(true);
            return;
          }
          deleteSlide(slide.id);
          onClose();
        }}
      >
        <Trash2 size={13} />
        {confirming ? "Confirm delete" : "Delete"}
      </button>
    </div>
  );
}

type SlideListItemProps = {
  slide: SlideContainer;
  index: number;
  active: boolean;
  isDragSource: boolean;
  canDelete: boolean;
  onPointerDown: (e: ReactPointerEvent, index: number) => void;
  onSelect: (slideId: string) => void;
};

const SlideListItem = memo(function SlideListItem({
  slide,
  index,
  active,
  isDragSource,
  canDelete,
  onPointerDown,
  onSelect,
}: SlideListItemProps) {
  const theme = useTheme();
  const objects = useEditorStore(
    useShallow((s) => getSlideObjects(s.document, slide)),
  );
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      data-testid="slide-thumb"
      data-slide-index={index}
      role="button"
      tabIndex={0}
      aria-label={`Slide ${index + 1}${slide.title ? `: ${slide.title}` : ""}`}
      aria-current={active ? "true" : undefined}
      onPointerDown={(e) => onPointerDown(e, index)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(slide.id);
        }
      }}
      className={cn(
        "group relative mb-3 flex cursor-pointer items-center gap-2 rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-brand-400",
        isDragSource ? "opacity-40" : "opacity-100",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
          active
            ? "bg-brand-500 text-white"
            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200",
        )}
      >
        {index + 1}
      </span>

      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-lg border bg-white transition-colors",
          active
            ? "border-brand-500 ring-1 ring-brand-500"
            : "border-gray-200 group-hover:border-gray-300",
        )}
      >
        <SlideThumbnail slide={slide} objects={objects} theme={theme} width={186} />

        <button
          type="button"
          title="Slide actions"
          aria-label={`Slide ${index + 1} actions`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={cn(
            "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-gray-500 shadow-sm transition-opacity hover:text-gray-900 focus-visible:opacity-100",
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <EllipsisVertical size={13} />
        </button>

        {menuOpen ? (
          <SlideItemMenu
            slide={slide}
            canDelete={canDelete}
            onClose={() => setMenuOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
});

export function SlideList({ onSlideChosen }: { onSlideChosen?: () => void }) {
  const slides = useEditorStore((s) => s.document.slides);
  const activeSlideId = useEditorStore((s) => s.activeSlideId);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const createSlide = useEditorStore((s) => s.createSlide);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);

  const listRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const select = (slideId: string) => {
    setActiveSlide(slideId);
    onSlideChosen?.();
  };

  /** Insertion gap (0..n) for a pointer at clientY, from item midpoints. */
  const gapForPointer = (clientY: number): number => {
    const list = listRef.current;
    if (!list) return 0;
    const items = Array.from(
      list.querySelectorAll<HTMLElement>("[data-slide-index]"),
    );
    let gap = items.length;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        gap = i;
        break;
      }
    }
    return gap;
  };

  const onItemPointerDown = (e: ReactPointerEvent, index: number) => {
    if (e.button !== 0) return;
    const slide = slides[index];
    if (!slide) return;
    // Select immediately (predictable), then watch for a reorder drag.
    select(slide.id);

    const start: DragState = {
      pointerId: e.pointerId,
      fromIndex: index,
      startY: e.clientY,
      started: false,
      gap: index,
    };
    dragRef.current = start;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      if (!d.started) {
        if (Math.abs(ev.clientY - d.startY) < DRAG_THRESHOLD_PX) return;
        d.started = true;
      }
      d.gap = gapForPointer(ev.clientY);
      setDrag({ ...d });
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      dragRef.current = null;
      setDrag(null);
    };

    const onUp = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      if (d.started) {
        const to = d.gap > d.fromIndex ? d.gap - 1 : d.gap;
        if (to !== d.fromIndex) reorderSlides(d.fromIndex, to);
      }
      cleanup();
    };

    const onCancel = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;
      cleanup();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const showIndicator = drag?.started ?? false;

  return (
    <aside
      aria-label="Slides"
      className="relative flex h-full w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white"
    >
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-4 pb-20">
        {slides.map((slide, index) => (
          <div key={slide.id} className="relative">
            {showIndicator && drag?.gap === index ? <InsertionLine /> : null}
            <SlideListItem
              slide={slide}
              index={index}
              active={slide.id === activeSlideId}
              isDragSource={showIndicator && drag?.fromIndex === index}
              canDelete={slides.length > 1}
              onPointerDown={onItemPointerDown}
              onSelect={select}
            />
          </div>
        ))}
        {showIndicator && drag?.gap === slides.length ? (
          <div className="relative">
            <InsertionLine />
          </div>
        ) : null}
      </div>

      {/* Add-slide FAB */}
      <button
        type="button"
        onClick={() => createSlide()}
        title="Add slide"
        aria-label="Add slide"
        className="absolute bottom-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_24px_rgba(101,47,243,0.4)] transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <Plus size={22} />
      </button>
    </aside>
  );
}

function InsertionLine() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -top-2 left-8 right-0 z-20 h-0.5 rounded bg-brand-500"
    />
  );
}
