import { LocalStorageAdapter } from "./local-adapter";
import type { PersistenceAdapter } from "./adapter";

export type { PersistenceAdapter, DocumentSummary } from "./adapter";
export { LocalStorageAdapter } from "./local-adapter";

/**
 * The active persistence adapter. Swap this single line to move from local
 * storage to a remote backend; nothing else in the app references the concrete
 * implementation.
 */
export const persistence: PersistenceAdapter = new LocalStorageAdapter();
