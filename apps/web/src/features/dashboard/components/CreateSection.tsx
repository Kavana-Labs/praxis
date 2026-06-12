import { Plus, Upload } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

/**
 * "Create a New Presentation": the blank-canvas card and the import card,
 * per the Figma create section (330×182 cards, violet vs dashed borders).
 */
export function CreateSection({ onCreateBlank }: { onCreateBlank: () => void }) {
  const openImportModal = useUiStore((s) => s.openImportModal);

  return (
    <section aria-labelledby="create-heading">
      <h2
        id="create-heading"
        className="text-[22px] font-bold tracking-[-0.44px] text-gray-800"
      >
        Create a New Presentation
      </h2>
      <p className="mt-2 text-base text-gray-600">
        Start with a blank canvas, import a file, or choose a template to begin
      </p>

      <div className="mt-8 flex flex-wrap gap-6">
        <div className="flex w-[330px] flex-col gap-3">
          <button
            type="button"
            onClick={onCreateBlank}
            aria-label="Create a blank presentation"
            className="flex h-[182px] w-full items-center justify-center rounded-2xl border-2 border-[#c4bcfb] bg-gray-50 shadow-[0_3px_3px_rgba(156,163,175,0.09),0_1px_2px_rgba(156,163,175,0.1)] transition-colors hover:bg-[#f2eeff]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <Plus size={48} strokeWidth={2.2} className="text-[#652ff3]" />
          </button>
          <span className="text-lg font-semibold text-gray-800">
            Blank Presentation
          </span>
        </div>

        <div className="flex w-[330px] flex-col gap-3">
          <button
            type="button"
            onClick={openImportModal}
            aria-label="Import an existing presentation file"
            className="flex h-[182px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400 hover:bg-gray-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <span className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-1.5 text-base text-gray-500">
              <Upload size={20} />
              Browse
            </span>
          </button>
          <span className="flex flex-col gap-1">
            <span className="text-lg font-semibold text-gray-800">
              Import an Existing File
            </span>
            <span className="text-sm text-gray-500">
              (PowerPoint or Google Slides)
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
