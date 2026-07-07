import { exportDocument } from "@/domain/serialize";
import type { PraxisDocument } from "@/domain/types";

/**
 * Serialize a document, moving the work off the main thread for heavy decks.
 *
 * Small documents (no inline assets) serialize faster synchronously than a
 * worker round-trip costs, so they stay on the main thread. Documents carrying
 * base64 image/artifact blobs are serialized in a Web Worker so JSON.stringify
 * of several megabytes doesn't block typing/rendering. Any failure — no Worker
 * support (tests/SSR), a worker error, or a bundler that can't spawn it — falls
 * back to synchronous serialization, so persistence never breaks.
 */

type WorkerResponse =
  | { id: number; ok: true; json: string }
  | { id: number; ok: false; error: string };

let worker: Worker | null = null;
let workerUsable = true;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (json: string) => void; reject: (err: Error) => void }
>();

function getWorker(): Worker | null {
  if (!workerUsable) return null;
  if (worker) return worker;
  try {
    if (typeof Worker === "undefined") {
      workerUsable = false;
      return null;
    }
    worker = new Worker(new URL("./serialize.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const entry = pending.get(e.data.id);
      if (!entry) return;
      pending.delete(e.data.id);
      if (e.data.ok) entry.resolve(e.data.json);
      else entry.reject(new Error(e.data.error));
    };
    worker.onerror = () => {
      // The worker itself failed — abandon it and let callers fall back to sync.
      workerUsable = false;
      for (const [, entry] of pending) entry.reject(new Error("worker error"));
      pending.clear();
      worker = null;
    };
    return worker;
  } catch {
    workerUsable = false;
    return null;
  }
}

/** A document is "heavy" (worth offloading) when it carries inline assets. */
function isHeavy(doc: PraxisDocument): boolean {
  return Object.keys(doc.assets).length > 0;
}

export function exportDocumentAsync(doc: PraxisDocument): Promise<string> {
  if (!isHeavy(doc)) return Promise.resolve(exportDocument(doc));
  const w = getWorker();
  if (!w) return Promise.resolve(exportDocument(doc));

  const id = nextId++;
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, doc });
  }).catch(() => exportDocument(doc));
}
