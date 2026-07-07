/// <reference lib="webworker" />
import { stableStringify } from "@/domain/stableStringify";

/**
 * Off-thread serialization. Serializing a document with several megabytes of
 * inline base64 assets blocks the main thread inside JSON.stringify; running it
 * here keeps typing and autosave smooth. Correlated by request id so concurrent
 * saves don't cross wires.
 */
type Request = { id: number; doc: unknown };
type Response =
  | { id: number; ok: true; json: string }
  | { id: number; ok: false; error: string };

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, doc } = e.data;
  try {
    const json = stableStringify(doc);
    (self as unknown as Worker).postMessage({ id, ok: true, json } as Response);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      ok: false,
      error: (err as Error).message,
    } as Response);
  }
};
