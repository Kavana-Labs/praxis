import type { PraxisDocument } from "@/domain/types";

/** Lightweight summary used for document lists, without loading full content. */
export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

/** A trashed document's summary, with when it was moved to the trash. */
export type TrashedDocumentSummary = DocumentSummary & {
  deletedAt: string;
};

/**
 * Persistence abstraction. The MVP ships a localStorage implementation, but the
 * editor only ever talks to this interface — a remote API adapter can replace it
 * later without touching the store or UI.
 *
 * Deletion is two-stage: `trash` soft-deletes (recoverable from the dashboard's
 * Trash view via `restore`), `purge` removes the document permanently. `remove`
 * remains as the immediate hard delete used by flows that own their lifecycle
 * (e.g. discarding a just-imported document).
 */
export interface PersistenceAdapter {
  list(): Promise<DocumentSummary[]>;
  load(id: string): Promise<PraxisDocument | null>;
  save(doc: PraxisDocument): Promise<void>;
  remove(id: string): Promise<void>;
  /** Move a document to the trash (it disappears from `list`). */
  trash(id: string): Promise<void>;
  /** Documents currently in the trash, most recently deleted first. */
  listTrash(): Promise<TrashedDocumentSummary[]>;
  /** Move a trashed document back into the library. */
  restore(id: string): Promise<void>;
  /** Permanently delete a trashed document. */
  purge(id: string): Promise<void>;
  getLastOpenedId(): Promise<string | null>;
  setLastOpenedId(id: string | null): Promise<void>;
}
