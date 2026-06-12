import { useState } from "react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import type { DocumentSummary } from "@/services/persistence/adapter";
import { useDashboardSearch } from "./searchContext";
import { CreateSection } from "./components/CreateSection";
import { PresentationGrid } from "./components/PresentationGrid";
import { RenameDialog } from "./components/RenameDialog";
import { TemplateSection } from "./components/TemplateSection";
import { useDocumentLibrary, useTrash } from "./hooks/useDocuments";
import { relativeTime } from "./lib/relativeTime";

/** The four dashboard views rendered inside the shell's outlet. */

function usePresentationActions() {
  const library = useDocumentLibrary();
  const [renaming, setRenaming] = useState<DocumentSummary | null>(null);

  const actions = {
    onOpen: library.openDocument,
    onRename: (summary: DocumentSummary) => setRenaming(summary),
    onExport: library.exportDocumentById,
    onTrash: library.trashDocument,
  };

  const renameDialog = renaming ? (
    <RenameDialog
      target={renaming}
      onRename={library.renameDocument}
      onClose={() => setRenaming(null)}
    />
  ) : null;

  return { library, actions, renameDialog };
}

export function DashboardHomeView() {
  const query = useDashboardSearch();
  const { library, actions, renameDialog } = usePresentationActions();

  return (
    <div className="flex flex-col gap-8">
      <CreateSection onCreateBlank={() => void library.createBlank()} />
      <hr className="border-gray-200" />
      <TemplateSection onUse={(t) => void library.createFromTemplate(t)} />
      <hr className="border-gray-200" />
      <PresentationGrid
        documents={library.documents}
        query={query}
        heading={
          library.documents && library.documents.length === 0
            ? "Recent Presentations"
            : "My Presentations"
        }
        actions={actions}
        onCreateBlank={() => void library.createBlank()}
      />
      {renameDialog}
    </div>
  );
}

export function TemplatesView() {
  const { library } = usePresentationActions();
  return (
    <TemplateSection
      heading="Template Library"
      onUse={(t) => void library.createFromTemplate(t)}
    />
  );
}

export function PresentationsView() {
  const query = useDashboardSearch();
  const { library, actions, renameDialog } = usePresentationActions();
  return (
    <>
      <PresentationGrid
        documents={library.documents}
        query={query}
        heading="My Presentations"
        actions={actions}
        onCreateBlank={() => void library.createBlank()}
      />
      {renameDialog}
    </>
  );
}

export function TrashView() {
  const { items, restore, purge } = useTrash();
  const [confirmingPurge, setConfirmingPurge] = useState<string | null>(null);

  return (
    <section aria-labelledby="trash-heading">
      <h2
        id="trash-heading"
        className="text-2xl font-bold tracking-[-0.48px] text-gray-800"
      >
        Trash
      </h2>
      <p className="mt-2 text-base text-gray-600">
        Trashed presentations stay here until you restore or permanently
        delete them.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {!items ? (
          <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
            <Trash2 size={28} className="text-gray-400" strokeWidth={1.5} />
            <p className="text-base font-semibold text-gray-700">
              The trash is empty
            </p>
            <p className="text-sm text-gray-500">
              Presentations you move to trash will appear here.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              data-testid="trash-item"
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold text-gray-800">
                  {item.title}
                </p>
                <p className="text-sm text-gray-500">
                  Deleted {relativeTime(item.deletedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void restore(item.id)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <ArchiveRestore size={15} /> Restore
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmingPurge === item.id) {
                    void purge(item.id);
                    setConfirmingPurge(null);
                  } else {
                    setConfirmingPurge(item.id);
                  }
                }}
                className={
                  confirmingPurge === item.id
                    ? "flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300"
                    : "flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-300"
                }
              >
                <Trash2 size={15} />
                {confirmingPurge === item.id ? "Confirm delete" : "Delete forever"}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
