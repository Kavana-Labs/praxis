import { ID } from "@/domain/ids";
import type { PraxisAsset } from "@/domain/types";

/**
 * Asset abstraction for the local MVP: images are read into data URLs and
 * stored inline in the document. The PraxisAsset shape (with optional `url`)
 * lets an external object-storage backend replace this later without touching
 * the renderers.
 */
function readDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function measureImage(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB guard for inline data URLs

export async function fileToImageAsset(file: File): Promise<PraxisAsset> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selected file is not an image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is larger than 8 MB. Please choose a smaller file.");
  }
  const dataUrl = await readDataUrl(file);
  const { width, height } = await measureImage(dataUrl);
  return {
    id: ID.asset(),
    kind: "image",
    mimeType: file.type,
    dataUrl,
    filename: file.name,
    width,
    height,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Open the system file picker for a single image and return it as an asset.
 * Resolves to null when the user cancels or the file is invalid; callers that
 * need the error message should use `fileToImageAsset` directly.
 */
export function pickImageFile(): Promise<PraxisAsset | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        resolve(await fileToImageAsset(file));
      } catch {
        resolve(null);
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Build an asset from a base64 artifact returned by the execution service. */
export function artifactToAsset(
  mimeType: string,
  dataUrl: string,
  filename?: string,
): PraxisAsset {
  return {
    id: ID.asset(),
    kind: "artifact",
    mimeType,
    dataUrl,
    filename,
    createdAt: new Date().toISOString(),
  };
}
