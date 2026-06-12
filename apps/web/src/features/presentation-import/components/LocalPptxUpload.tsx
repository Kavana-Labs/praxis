import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "Upload PowerPoint" option: a restrained drop zone + file picker.
 * Validation happens in the modal (single source of truth) — this component
 * only surfaces files.
 */
export function LocalPptxUpload({
  onFileSelected,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload PowerPoint — import a .pptx file from your computer"
      onClick={disabled ? undefined : pick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          pick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelected(file);
      }}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
        dragOver
          ? "border-brand-400 bg-brand-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <FileUp size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">
          Upload PowerPoint
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
          Import a .pptx file from your computer — choose a file or drop it
          here.
        </span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        data-testid="pptx-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
