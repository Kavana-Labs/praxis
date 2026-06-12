import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  Loader2,
  Presentation,
  RefreshCw,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GoogleAuthExpiredError,
  listSlidesPresentations,
  type DriveSlidesFile,
  type PickedSlides,
} from "../services/googleSlides";
import { ImportError } from "../types";

/**
 * Praxis's own Google Drive browser: lists the user's Slides presentations
 * through the Drive REST API with the bearer token — no Google iframe, no
 * third-party-cookie dependence. Search, recency ordering, and paging.
 */

const SEARCH_DEBOUNCE_MS = 300;

type LoadState =
  | { name: "loading" }
  | { name: "ready" }
  | { name: "error"; message: string; expired: boolean };

function formatModified(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FileRow({
  file,
  onSelect,
}: {
  file: DriveSlidesFile;
  onSelect: (pick: PickedSlides) => void;
}) {
  const [thumbBroken, setThumbBroken] = useState(false);
  const modified = formatModified(file.modifiedTime);
  const meta = [modified, file.owner].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect({ fileId: file.id, fileName: file.name })}
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-amber-50 text-amber-600">
        {file.thumbnailLink && !thumbBroken ? (
          <img
            src={file.thumbnailLink}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setThumbBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <Presentation size={16} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-gray-800">
          {file.name}
        </span>
        {meta ? (
          <span className="block truncate text-xs text-gray-500">{meta}</span>
        ) : null}
      </span>
    </button>
  );
}

export function GoogleDriveBrowser({
  accessToken,
  onSelect,
  onReconnect,
}: {
  accessToken: string;
  onSelect: (pick: PickedSlides) => void;
  /** Re-run the consent flow after an expired token. */
  onReconnect: () => void;
}) {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DriveSlidesFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [state, setState] = useState<LoadState>({ name: "loading" });
  const [loadingMore, setLoadingMore] = useState(false);
  const requestSeq = useRef(0);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const runSearch = useCallback(
    async (search: string) => {
      const seq = ++requestSeq.current;
      setState({ name: "loading" });
      try {
        const page = await listSlidesPresentations(accessToken, {
          query: search || undefined,
        });
        if (seq !== requestSeq.current) return; // superseded
        setFiles(page.files);
        setNextPageToken(page.nextPageToken);
        setState({ name: "ready" });
      } catch (err) {
        if (seq !== requestSeq.current) return;
        const expired = err instanceof GoogleAuthExpiredError;
        const message =
          err instanceof GoogleAuthExpiredError || err instanceof ImportError
            ? err.message
            : "Google Drive could not list your presentations. Try again in a moment.";
        setState({ name: "error", message, expired });
      }
    },
    [accessToken],
  );

  // Initial load + debounced re-query on search changes.
  useEffect(() => {
    const timer = setTimeout(
      () => void runSearch(query),
      query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    const seq = requestSeq.current;
    try {
      const page = await listSlidesPresentations(accessToken, {
        query: query || undefined,
        pageToken: nextPageToken,
      });
      if (seq !== requestSeq.current) return;
      setFiles((prev) => [...prev, ...page.files]);
      setNextPageToken(page.nextPageToken);
    } catch {
      // Leave the list as-is; the user can retry by scrolling actions again.
      setNextPageToken(undefined);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <div className="relative mb-2.5">
        <Search
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your presentations…"
          aria-label="Search your Google Slides presentations"
          className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
        />
      </div>

      <div
        className="max-h-72 overflow-y-auto rounded-lg border border-gray-100"
        role="listbox"
        aria-label="Google Slides presentations"
      >
        {state.name === "loading" ? (
          <div className="flex items-center justify-center gap-2 px-3 py-10 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin text-brand-500" />
            Loading your presentations…
          </div>
        ) : state.name === "error" ? (
          <div className="px-3 py-6 text-center">
            <p className="mb-3 inline-flex items-start gap-1.5 text-left text-xs leading-relaxed text-amber-800">
              <CircleAlert size={14} className="mt-0.5 shrink-0 text-amber-500" />
              {state.message}
            </p>
            <div>
              <button
                type="button"
                onClick={() =>
                  state.expired ? onReconnect() : void runSearch(query)
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <RefreshCw size={13} />
                {state.expired ? "Reconnect Google Drive" : "Try again"}
              </button>
            </div>
          </div>
        ) : files.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-gray-500">
            {query
              ? `No presentations found for “${query}”.`
              : "No Google Slides presentations were found in this Drive."}
          </p>
        ) : (
          <div className="divide-y divide-gray-100 p-1">
            {files.map((file) => (
              <FileRow key={file.id} file={file} onSelect={onSelect} />
            ))}
            {nextPageToken ? (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-brand-300",
                  loadingMore && "cursor-wait",
                )}
              >
                {loadingMore ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : null}
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
        Praxis has read-only access and only imports the presentation you
        choose.
      </p>
    </div>
  );
}
