import {
  STORAGE_INDEX_KEY,
  STORAGE_LAST_OPENED_KEY,
  STORAGE_PREFIX,
  STORAGE_TRASH_KEY,
} from "@/domain/constants";
import { importDocument } from "@/domain/serialize";
import type { PraxisDocument } from "@/domain/types";
import { exportDocumentAsync } from "./exportAsync";
import type {
  DocumentSummary,
  PersistenceAdapter,
  TrashedDocumentSummary,
} from "./adapter";

/**
 * localStorage-backed persistence. Documents are stored as deterministic JSON
 * (one key per document) plus a small index for listing. Loads run through the
 * validating importer so a corrupt entry fails gracefully (returns null) rather
 * than crashing the app.
 */
export class LocalStorageAdapter implements PersistenceAdapter {
  private storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  private readIndex(): DocumentSummary[] {
    const raw = this.storage.getItem(STORAGE_INDEX_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as DocumentSummary[]) : [];
    } catch {
      return [];
    }
  }

  private writeIndex(index: DocumentSummary[]): void {
    this.storage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
  }

  async list(): Promise<DocumentSummary[]> {
    return this.readIndex().sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  async load(id: string): Promise<PraxisDocument | null> {
    const raw = this.storage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const result = importDocument(raw);
    return result.ok ? result.document : null;
  }

  async loadForPreview(id: string): Promise<PraxisDocument | null> {
    const raw = this.storage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const result = importDocument(raw, { normalize: false });
    return result.ok ? result.document : null;
  }

  async save(doc: PraxisDocument): Promise<void> {
    // Heavy decks serialize off the main thread; small ones stay synchronous.
    const json = await exportDocumentAsync(doc);
    this.storage.setItem(STORAGE_PREFIX + doc.id, json);
    const index = this.readIndex().filter((s) => s.id !== doc.id);
    index.push({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt });
    this.writeIndex(index);
  }

  async remove(id: string): Promise<void> {
    this.storage.removeItem(STORAGE_PREFIX + id);
    this.writeIndex(this.readIndex().filter((s) => s.id !== id));
    this.writeTrash(this.readTrash().filter((s) => s.id !== id));
    if ((await this.getLastOpenedId()) === id) {
      await this.setLastOpenedId(null);
    }
  }

  private readTrash(): TrashedDocumentSummary[] {
    const raw = this.storage.getItem(STORAGE_TRASH_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as TrashedDocumentSummary[]) : [];
    } catch {
      return [];
    }
  }

  private writeTrash(trash: TrashedDocumentSummary[]): void {
    this.storage.setItem(STORAGE_TRASH_KEY, JSON.stringify(trash));
  }

  async trash(id: string): Promise<void> {
    const index = this.readIndex();
    const summary = index.find((s) => s.id === id);
    if (!summary) return; // unknown or already trashed
    this.writeIndex(index.filter((s) => s.id !== id));
    this.writeTrash([
      { ...summary, deletedAt: new Date().toISOString() },
      ...this.readTrash().filter((s) => s.id !== id),
    ]);
    if ((await this.getLastOpenedId()) === id) {
      await this.setLastOpenedId(null);
    }
  }

  async listTrash(): Promise<TrashedDocumentSummary[]> {
    return this.readTrash().sort((a, b) =>
      b.deletedAt.localeCompare(a.deletedAt),
    );
  }

  async restore(id: string): Promise<void> {
    const trash = this.readTrash();
    const entry = trash.find((s) => s.id === id);
    if (!entry) return;
    this.writeTrash(trash.filter((s) => s.id !== id));
    const { deletedAt: _deletedAt, ...summary } = entry;
    void _deletedAt;
    this.writeIndex([
      ...this.readIndex().filter((s) => s.id !== id),
      summary,
    ]);
  }

  async purge(id: string): Promise<void> {
    this.writeTrash(this.readTrash().filter((s) => s.id !== id));
    this.storage.removeItem(STORAGE_PREFIX + id);
  }

  async getLastOpenedId(): Promise<string | null> {
    return this.storage.getItem(STORAGE_LAST_OPENED_KEY);
  }

  async setLastOpenedId(id: string | null): Promise<void> {
    if (id) this.storage.setItem(STORAGE_LAST_OPENED_KEY, id);
    else this.storage.removeItem(STORAGE_LAST_OPENED_KEY);
  }
}
