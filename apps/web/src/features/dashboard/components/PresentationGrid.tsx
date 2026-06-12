import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  List,
  MoreVertical,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";
import type { DocumentSummary } from "@/services/persistence/adapter";
import { SlideThumbnail } from "@/components/editor/SlideThumbnail";
import { getSlideObjects } from "@/stores/selectors";
import { cn } from "@/lib/utils";
import { useDocumentPreview } from "../hooks/useDocuments";
import { relativeTime } from "../lib/relativeTime";

/**
 * "My Presentations": sort control, grid/list toggle, presentation cards with
 * real slide-1 previews, a kebab menu (Rename / Export / Move to trash),
 * pagination, and the designed empty state.
 */

const PAGE_SIZE = 8;

export type SortKey = "modified" | "title";

type CardActions = {
  onOpen: (id: string) => void;
  onRename: (summary: DocumentSummary) => void;
  onExport: (id: string) => void;
  onTrash: (id: string) => void;
};

function CardMenu({
  summary,
  actions,
  onClose,
}: {
  summary: DocumentSummary;
  actions: CardActions;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
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
      aria-label="Presentation actions"
      className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-gray-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className={`${item} text-gray-700 hover:bg-gray-100`}
        onClick={() => {
          actions.onRename(summary);
          onClose();
        }}
      >
        <PencilLine size={13} /> Rename
      </button>
      <button
        type="button"
        role="menuitem"
        className={`${item} text-gray-700 hover:bg-gray-100`}
        onClick={() => {
          void actions.onExport(summary.id);
          onClose();
        }}
      >
        <Download size={13} /> Export JSON
      </button>
      <button
        type="button"
        role="menuitem"
        className={`${item} text-red-600 hover:bg-red-50`}
        onClick={() => {
          void actions.onTrash(summary.id);
          onClose();
        }}
      >
        <Trash2 size={13} /> Move to trash
      </button>
    </div>
  );
}

function CardCover({ summary }: { summary: DocumentSummary }) {
  const doc = useDocumentPreview(summary);
  if (!doc || !doc.slides[0]) {
    return <div className="h-full w-full animate-pulse bg-gray-200" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <SlideThumbnail
        slide={doc.slides[0]}
        objects={getSlideObjects(doc, doc.slides[0])}
        theme={doc.theme}
        width={266}
      />
    </div>
  );
}

function SlideCount({ summary }: { summary: DocumentSummary }) {
  const doc = useDocumentPreview(summary);
  if (!doc) return null;
  return (
    <>
      <span aria-hidden className="mx-1 inline-block h-1 w-1 rounded-full bg-gray-400 align-middle" />
      {doc.slides.length} Slide{doc.slides.length === 1 ? "" : "s"}
    </>
  );
}

function PresentationCard({
  summary,
  actions,
  view,
}: {
  summary: DocumentSummary;
  actions: CardActions;
  view: "grid" | "list";
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const meta = (
    <p className="text-sm text-gray-500">
      <span className="font-semibold">Modified:</span> {relativeTime(summary.updatedAt)}
      <SlideCount summary={summary} />
    </p>
  );

  const kebab = (
    <span className="relative inline-flex">
      <button
        type="button"
        title="Presentation actions"
        aria-label={`Actions for ${summary.title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <MoreVertical size={18} />
      </button>
      {menuOpen ? (
        <CardMenu summary={summary} actions={actions} onClose={() => setMenuOpen(false)} />
      ) : null}
    </span>
  );

  if (view === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        data-testid="presentation-card"
        onClick={() => void actions.onOpen(summary.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void actions.onOpen(summary.id);
        }}
        className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-[#c4bcfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <span className="block h-[68px] w-[112px] shrink-0 overflow-hidden rounded-lg border border-gray-100">
          <CardCover summary={summary} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold text-gray-800">
            {summary.title}
          </span>
          {meta}
        </span>
        {kebab}
      </div>
    );
  }

  return (
    <div data-testid="presentation-card" className="flex w-full flex-col gap-2">
      <button
        type="button"
        onClick={() => void actions.onOpen(summary.id)}
        aria-label={`Open ${summary.title}`}
        className="block h-40 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all hover:border-[#c4bcfb] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#805df7]"
      >
        <CardCover summary={summary} />
      </button>
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-gray-800">
            {summary.title}
          </p>
          {meta}
        </div>
        {kebab}
      </div>
    </div>
  );
}

function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  // Compact page list: 1 … around current … last
  const pages: (number | "gap")[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "gap") {
      pages.push("gap");
    }
  }

  const navButton =
    "flex h-10 items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300";

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Presentation pages">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        className={cn(navButton, page === 1 ? "cursor-not-allowed text-gray-300" : "text-gray-500 hover:bg-gray-100")}
      >
        <ChevronLeft size={16} /> Back
      </button>
      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-2 text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPage(p)}
            className={cn(
              "flex h-10 min-w-10 items-center justify-center rounded-xl border bg-white px-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              p === page
                ? "border-[#805df7] text-[#652ff3]"
                : "border-gray-200 text-gray-400 hover:text-gray-600",
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page === pageCount}
        onClick={() => onPage(page + 1)}
        className={cn(navButton, page === pageCount ? "cursor-not-allowed text-gray-300" : "text-gray-500 hover:bg-gray-100")}
      >
        Next <ChevronRight size={16} />
      </button>
    </nav>
  );
}

export function PresentationGrid({
  documents,
  query,
  heading = "My Presentations",
  actions,
  onCreateBlank,
}: {
  documents: DocumentSummary[] | null;
  query: string;
  heading?: string;
  actions: CardActions;
  onCreateBlank: () => void;
}) {
  const [sort, setSort] = useState<SortKey>("modified");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!documents) return null;
    const q = query.trim().toLowerCase();
    const matched = q
      ? documents.filter((d) => d.title.toLowerCase().includes(q))
      : documents;
    return [...matched].sort((a, b) =>
      sort === "modified"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.title.localeCompare(b.title),
    );
  }, [documents, query, sort]);

  const pageCount = filtered ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, pageCount);
  const visible = filtered?.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section aria-labelledby="presentations-heading">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2
          id="presentations-heading"
          className="text-2xl font-bold tracking-[-0.48px] text-gray-800"
        >
          {heading}
        </h2>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setSort((s) => (s === "modified" ? "title" : "modified"))}
            title="Change sort order"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-base transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <ArrowUpDown size={16} className="text-gray-600" />
            <span className="font-semibold text-gray-600">Sort:</span>
            <span className="text-gray-500">
              {sort === "modified" ? "Last Modified" : "Title"}
            </span>
          </button>
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-2">
            <button
              type="button"
              title="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
              className={cn(
                "rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                view === "grid" ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:text-gray-700",
              )}
            >
              <LayoutGrid size={22} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              title="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={cn(
                "rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                view === "list" ? "bg-gray-200 text-gray-800" : "text-gray-500 hover:text-gray-700",
              )}
            >
              <List size={22} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {!visible ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-xl font-bold text-gray-800">
              {query ? `No presentations match “${query}”` : "No Presentation Yet"}
            </p>
            {!query ? (
              <>
                <button
                  type="button"
                  onClick={onCreateBlank}
                  className="flex items-center gap-2 rounded-xl bg-[#652ff3] px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <Plus size={18} /> New Presentation
                </button>
                <p className="text-sm text-gray-500">
                  or choose a template above to get started
                </p>
              </>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <div
              className={cn(
                view === "grid"
                  ? "grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-4"
                  : "flex flex-col gap-3",
              )}
            >
              {visible.map((summary) => (
                <PresentationCard
                  key={summary.id}
                  summary={summary}
                  actions={actions}
                  view={view}
                />
              ))}
            </div>
            <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
          </div>
        )}
      </div>
    </section>
  );
}
