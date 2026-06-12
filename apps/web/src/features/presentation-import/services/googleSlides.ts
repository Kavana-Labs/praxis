import {
  DEFAULT_IMPORT_LIMITS,
  ImportError,
  type ImportProgressListener,
  type ImportResult,
} from "../types";
import { importPptxBytes } from "./importPresentation";

/**
 * Google Slides import: Google Identity Services token + Praxis's own Drive
 * file browser (no Google Picker iframe), then a Drive `files.export` to
 * PowerPoint. The exported bytes go through the exact same PPTX pipeline as
 * local uploads.
 *
 * Why no Picker: the Picker iframe depends on third-party cookies for its
 * session, which Safari/Brave/incognito block — users hit an unrecoverable
 * "sign in" wall. Praxis lists presentations directly through the Drive REST
 * API with the bearer token instead, which works in every browser.
 *
 * Security model (static frontend — there is no Praxis server in the MVP):
 *  - Only the OAuth *client id* and *API key* are used. These are
 *    public-by-design values; no client secret exists in this flow.
 *  - Scope is `drive.readonly` (read-only; never write access). This is a
 *    Google "sensitive" scope: until the app passes Google verification,
 *    users see an "unverified app" interstitial they can click through.
 *  - Access tokens stay in memory for the import and are never persisted or
 *    logged.
 */

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const PPTX_EXPORT_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const SLIDES_MIME = "application/vnd.google-apps.presentation";

export type GoogleConfig = {
  clientId: string;
  apiKey: string;
  appId?: string;
};

export function googleConfig(): GoogleConfig | null {
  const env = import.meta.env ?? {};
  const clientId = env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const apiKey = env.VITE_GOOGLE_API_KEY as string | undefined;
  if (!clientId || !apiKey) return null;
  return { clientId, apiKey, appId: env.VITE_GOOGLE_APP_ID as string | undefined };
}

export function isGoogleImportConfigured(): boolean {
  return googleConfig() !== null;
}

/** Thrown when the user dismisses the consent popup. */
export class GoogleCancelledError extends Error {
  constructor() {
    super("Google Drive connection was cancelled. No files were imported.");
    this.name = "GoogleCancelledError";
  }
}

/** Thrown when the access token is no longer valid (reconnect required). */
export class GoogleAuthExpiredError extends Error {
  constructor() {
    super("Your Google Drive session expired. Reconnect and try again.");
    this.name = "GoogleAuthExpiredError";
  }
}

// --- minimal ambient typings for Google Identity Services -------------------

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

type GoogleGlobal = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: {
          access_token?: string;
          error?: string;
        }) => void;
        error_callback?: (error: { type?: string }) => void;
      }) => TokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

// --- script loading ----------------------------------------------------------

const loadedScripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = loadedScripts.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () =>
      reject(
        new ImportError(
          "Google services could not be loaded. Check your connection and try again.",
        ),
      );
    document.head.appendChild(el);
  });
  loadedScripts.set(src, promise);
  return promise;
}

async function ensureGoogleIdentity(): Promise<GoogleGlobal["accounts"]> {
  await loadScript("https://accounts.google.com/gsi/client");
  const accounts = window.google?.accounts;
  if (!accounts) {
    throw new ImportError(
      "Google sign-in is unavailable right now. Try again in a moment.",
    );
  }
  return accounts;
}

// --- auth ---------------------------------------------------------------------

/** Request a short-lived, read-only Drive access token. */
export async function requestAccessToken(): Promise<string> {
  const config = googleConfig();
  if (!config) {
    throw new ImportError(
      "Google Slides import is not configured for this deployment.",
    );
  }
  const accounts = await ensureGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    const client = accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else if (response.error === "access_denied")
          reject(new GoogleCancelledError());
        else
          reject(
            new ImportError(
              "Google did not grant access to Drive. Check your account permissions and try again.",
            ),
          );
      },
      error_callback: (error) => {
        if (error?.type === "popup_closed") reject(new GoogleCancelledError());
        else
          reject(
            new ImportError(
              "Google sign-in could not be completed. Try again in a moment.",
            ),
          );
      },
    });
    client.requestAccessToken();
  });
}

// --- Drive file listing (the Praxis browser's data source) -------------------

export type DriveSlidesFile = {
  id: string;
  name: string;
  modifiedTime?: string;
  owner?: string;
  thumbnailLink?: string;
};

export type DriveSlidesPage = {
  files: DriveSlidesFile[];
  nextPageToken?: string;
};

/** Escape a user-supplied string for a Drive `q` query literal. */
function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * List the user's Google Slides presentations, newest activity first,
 * optionally filtered by name. Paged via `pageToken`.
 */
export async function listSlidesPresentations(
  accessToken: string,
  opts: { query?: string; pageToken?: string } = {},
): Promise<DriveSlidesPage> {
  const terms = [`mimeType = '${SLIDES_MIME}'`, "trashed = false"];
  const query = opts.query?.trim();
  if (query) {
    terms.push(`name contains '${escapeDriveQuery(query)}'`);
  }

  const params = new URLSearchParams({
    q: terms.join(" and "),
    orderBy: "viewedByMeTime desc,modifiedTime desc",
    pageSize: "20",
    fields:
      "nextPageToken,files(id,name,modifiedTime,owners(displayName),thumbnailLink)",
    includeItemsFromAllDrives: "true",
    supportsAllDrives: "true",
  });
  if (opts.pageToken) params.set("pageToken", opts.pageToken);

  let response: Response;
  try {
    response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch {
    throw new ImportError(
      "Google Drive could not be reached. Check your connection and try again.",
    );
  }

  if (response.status === 401) throw new GoogleAuthExpiredError();
  if (!response.ok) {
    throw new ImportError(
      "Google Drive could not list your presentations. Try again in a moment.",
    );
  }

  const body = (await response.json()) as {
    nextPageToken?: string;
    files?: {
      id?: string;
      name?: string;
      modifiedTime?: string;
      owners?: { displayName?: string }[];
      thumbnailLink?: string;
    }[];
  };

  return {
    nextPageToken: body.nextPageToken,
    files: (body.files ?? [])
      .filter((f): f is typeof f & { id: string } => Boolean(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name ?? "Untitled presentation",
        modifiedTime: f.modifiedTime,
        owner: f.owners?.[0]?.displayName,
        thumbnailLink: f.thumbnailLink,
      })),
  };
}

export type PickedSlides = { fileId: string; fileName: string };

// --- export ------------------------------------------------------------------

/** Export a Google Slides file as .pptx bytes via the Drive API. */
export async function exportSlidesAsPptx(
  fileId: string,
  accessToken: string,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(PPTX_EXPORT_MIME)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  } catch {
    throw new ImportError(
      "Google Drive could not be reached. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    let reason = "";
    try {
      const body = (await response.json()) as {
        error?: { errors?: { reason?: string }[]; message?: string };
      };
      reason =
        body.error?.errors?.[0]?.reason ?? body.error?.message ?? "";
    } catch {
      // non-JSON error body
    }

    if (response.status === 403 && /exportsizelimitexceeded/i.test(reason)) {
      throw new ImportError(
        "This Google Slides presentation is too large to import directly. Download it as a .pptx file from Google Slides and upload the PowerPoint file instead.",
      );
    }
    if (response.status === 401) {
      throw new GoogleAuthExpiredError();
    }
    if (response.status === 404) {
      throw new ImportError(
        "The selected presentation could not be found in Google Drive.",
      );
    }
    if (response.status === 403) {
      throw new ImportError(
        "Praxis does not have permission to read the selected presentation.",
      );
    }
    throw new ImportError(
      "Google Drive could not export this presentation. Try again, or download it as a .pptx file and upload it instead.",
    );
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > DEFAULT_IMPORT_LIMITS.maxFileBytes) {
    throw new ImportError(
      "This Google Slides presentation is too large to import directly. Download it as a .pptx file from Google Slides and upload the PowerPoint file instead.",
    );
  }
  return new Uint8Array(buffer);
}

/** Full Google flow after selection: export → shared PPTX pipeline. */
export async function importFromGoogleSlides(
  pick: PickedSlides,
  accessToken: string,
  onProgress?: ImportProgressListener,
): Promise<ImportResult> {
  try {
    onProgress?.({ stage: "uploading" });
    const bytes = await exportSlidesAsPptx(pick.fileId, accessToken);
    return await importPptxBytes(bytes, {
      sourceType: "google-slides",
      sourceFilename: `${pick.fileName}.pptx`,
      onProgress,
    });
  } catch (err) {
    if (err instanceof GoogleAuthExpiredError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof ImportError) return { ok: false, error: err.message };
    console.error("Google Slides import failed", err);
    return {
      ok: false,
      error:
        "Praxis could not complete the import. Your existing documents were not changed.",
    };
  }
}
