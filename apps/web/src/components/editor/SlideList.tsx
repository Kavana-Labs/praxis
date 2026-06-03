import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";
import { SlideThumbnail } from "./SlideThumbnail";

/**
 * Left sidebar (Platform Figma): ordered slide thumbnails with circular index
 * badges, a violet ring on the active slide, hover duplicate/delete, drag-and-
 * drop reordering, and a violet "add slide" FAB at the bottom.
 */
export function SlideList() {
  const document = useEditorStore((s) => s.document);
  const activeSlideId = useEditorStore((s) => s.activeSlideId);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const createSlide = useEditorStore((s) => s.createSlide);
  const duplicateSlide = useEditorStore((s) => s.duplicateSlide);
  const deleteSlide = useEditorStore((s) => s.deleteSlide);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const slides = document.slides;

  return (
    <aside className="relative flex h-full w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-20">
        {slides.map((slide, index) => {
          const active = slide.id === activeSlideId;
          return (
            <div
              key={slide.id}
              data-testid="slide-thumb"
              data-slide-index={index}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={() => {
                if (dragIndex !== null && dragIndex !== index) {
                  reorderSlides(dragIndex, index);
                }
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onClick={() => setActiveSlide(slide.id)}
              className="group mb-3 flex cursor-pointer items-center gap-2"
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
                  overIndex === index && dragIndex !== null && dragIndex !== index
                    ? "border-brand-400"
                    : "",
                )}
              >
                <SlideThumbnail slide={slide} document={document} width={186} />

                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    title="Duplicate slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSlide(slide.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-gray-500 shadow-sm hover:text-gray-900"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    title="Delete slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(slide.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-gray-500 shadow-sm hover:text-red-600 disabled:opacity-30"
                    disabled={slides.length <= 1}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add-slide FAB */}
      <button
        type="button"
        onClick={() => createSlide()}
        title="Add slide"
        className="absolute bottom-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_8px_24px_rgba(101,47,243,0.4)] hover:bg-brand-600 transition-colors"
      >
        <Plus size={22} />
      </button>
    </aside>
  );
}
