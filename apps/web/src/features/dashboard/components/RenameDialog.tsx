import { useEffect, useRef, useState } from "react";
import type { DocumentSummary } from "@/services/persistence/adapter";

/** Small modal for renaming a presentation; Enter saves, Escape cancels. */
export function RenameDialog({
  target,
  onRename,
  onClose,
}: {
  target: DocumentSummary;
  onRename: (id: string, title: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(target.title);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const save = async () => {
    const clean = title.trim();
    if (clean && clean !== target.title) {
      await onRename(target.id, clean);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-950/40" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rename presentation"
        className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
      >
        <h2 className="text-base font-semibold text-gray-900">
          Rename presentation
        </h2>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") onClose();
          }}
          aria-label="Presentation title"
          className="mt-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!title.trim()}
            className="rounded-lg bg-[#652ff3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
