import { useState } from "react";
import { Loader2, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GoogleCancelledError,
  isGoogleImportConfigured,
  requestAccessToken,
} from "../services/googleSlides";
import { ImportError } from "../types";

/**
 * The "Import from Google Slides" option: requests a read-only Drive token,
 * then hands off to the in-modal Praxis Drive browser. No Google iframe is
 * involved anywhere in the flow.
 */
export function GoogleSlidesImport({
  onConnected,
  onNotice,
  disabled,
}: {
  onConnected: (accessToken: string) => void;
  /** Cancellations and errors surface as calm notices in the modal. */
  onNotice: (message: string, kind: "info" | "error") => void;
  disabled?: boolean;
}) {
  const configured = isGoogleImportConfigured();
  const [busy, setBusy] = useState(false);
  const blocked = disabled || !configured || busy;

  const start = async () => {
    if (blocked) return;
    setBusy(true);
    try {
      const token = await requestAccessToken();
      onConnected(token);
    } catch (err) {
      if (err instanceof GoogleCancelledError) {
        onNotice(err.message, "info");
      } else if (err instanceof ImportError) {
        onNotice(err.message, "error");
      } else {
        console.error("Google Drive connection failed", err);
        onNotice(
          "Google Drive could not be reached. Check your connection and try again.",
          "error",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={blocked}
      aria-label="Import from Google Slides — choose a presentation from your Google Drive"
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
        blocked && "cursor-not-allowed opacity-50 hover:border-gray-200 hover:bg-white",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Presentation size={17} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">
          Import from Google Slides
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">
          {configured
            ? "Choose a presentation from your Google Drive."
            : "Not available in this deployment — Google API access is not configured."}
        </span>
      </span>
    </button>
  );
}
