import {
  DEFAULT_IMPORT_LIMITS,
  ImportError,
  type ImportProgressListener,
  type ImportResult,
} from "../types";
import { importPptxBytes } from "./importPresentation";

/**
 * Google Slides import: Google Identity Services token + Google Picker for
 * read-only selection, then a Drive `files.export` to PowerPoint. The
 * exported bytes go through the exact same PPTX pipeline as local uploads.
 *
 * Security model (static frontend — there is no Praxis server in the MVP):
 *  - Only the OAuth *client id*, *API key*, and optional *app id* are used.
 *    These are public-by-design values; no client secret exists in this flow
 *    (token flow, not authorization-code flow).
 *  - Scope is `drive.file`: combined with the Picker, the app can read ONLY
 *    the presentations the user explicitly selects — nothing else.
 *  - Access tokens stay in memory for the import and are never persisted or
 *    logged.
 */

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const PPTX_EXPORT_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

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

/** Thrown when the user dismisses the consent screen or the Picker. */
export class GoogleCancelledError extends Error {
  constructor() {
    super("Google Drive connection was cancelled. No files were imported.");
    this.name = "GoogleCancelledError";
  }
}

// --- minimal ambient typings for the two Google scripts ---------------------

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
  picker: {
    Action: { PICKED: string; CANCEL: string };
    ViewId: { PRESENTATIONS: string };
    PickerBuilder: new () => PickerBuilder;
    Feature: { NAV_HIDDEN: string };
  };
};

type PickerBuilder = {
  addView: (view: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (appId: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
  setSelectableMimeTypes: (mimeTypes: string) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  enableFeature: (feature: string) => PickerBuilder;
  setCallback: (
    cb: (data: {
      action: string;
      docs?: { id: string; name?: string; mimeType?: string }[];
    }) => void,
  ) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};

type GapiGlobal = {
  load: (api: string, callback: () => void) => void;
};

declare global {
  interface Window {
    google?: GoogleGlobal;
    gapi?: GapiGlobal;
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

async function ensurePicker(): Promise<NonNullable<GoogleGlobal["picker"]>> {
  await loadScript("https://apis.google.com/js/api.js");
  const gapi = window.gapi;
  if (!gapi) {
    throw new ImportError(
      "Google Picker is unavailable right now. Try again in a moment.",
    );
  }
  await new Promise<void>((resolve) => gapi.load("picker", resolve));
  const picker = window.google?.picker;
  if (!picker) {
    throw new ImportError(
      "Google Picker is unavailable right now. Try again in a moment.",
    );
  }
  return picker;
}

// --- auth + picker -----------------------------------------------------------

/** Request a short-lived access token (per-file drive scope). */
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
      scope: DRIVE_FILE_SCOPE,
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

export type PickedSlides = { fileId: string; fileName: string };

/** Open the Picker filtered to Google Slides; resolves null on cancel. */
export async function pickSlidesPresentation(
  accessToken: string,
): Promise<PickedSlides | null> {
  const config = googleConfig();
  if (!config) {
    throw new ImportError(
      "Google Slides import is not configured for this deployment.",
    );
  }
  const picker = await ensurePicker();
  return new Promise<PickedSlides | null>((resolve) => {
    let builder = new picker.PickerBuilder()
      .addView(picker.ViewId.PRESENTATIONS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(config.apiKey)
      // Without an explicit origin the Picker can fall back to a separate
      // tab whose postMessage results never reach the app — the selection
      // callback silently never fires. Always anchor it to this origin.
      .setOrigin(window.location.origin)
      .setSelectableMimeTypes("application/vnd.google-apps.presentation")
      .setTitle("Choose a Google Slides presentation")
      .enableFeature(picker.Feature.NAV_HIDDEN)
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          const doc = data.docs?.[0];
          if (doc) {
            resolve({ fileId: doc.id, fileName: doc.name ?? "Google Slides presentation" });
            return;
          }
          resolve(null);
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null);
        }
      });
    if (config.appId) builder = builder.setAppId(config.appId);
    builder.build().setVisible(true);
  });
}

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
      throw new ImportError(
        "Your Google Drive session expired. Reconnect and try again.",
      );
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
    if (err instanceof ImportError) return { ok: false, error: err.message };
    console.error("Google Slides import failed", err);
    return {
      ok: false,
      error:
        "Praxis could not complete the import. Your existing documents were not changed.",
    };
  }
}
