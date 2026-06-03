import type { PraxisDocument } from "@/domain/types";

/** Lightweight summary used for document lists, without loading full content. */
export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

/**
 * Persistence abstraction. The MVP ships a localStorage implementation, but the
 * editor only ever talks to this interface — a remote API adapter can replace it
 * later without touching the store or UI.
 */
export interface PersistenceAdapter {
  list(): Promise<DocumentSummary[]>;
  load(id: string): Promise<PraxisDocument | null>;
  save(doc: PraxisDocument): Promise<void>;
  remove(id: string): Promise<void>;
  getLastOpenedId(): Promise<string | null>;
  setLastOpenedId(id: string | null): Promise<void>;
}
