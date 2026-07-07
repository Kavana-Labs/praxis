import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createDocument } from "@/domain/factory";
import { exportDocument } from "@/domain/serialize";
import type { PraxisDocument } from "@/domain/types";
import { downloadTextFile, slugify } from "@/lib/download";
import { persistence } from "@/services/persistence";
import type {
  DocumentSummary,
  TrashedDocumentSummary,
} from "@/services/persistence/adapter";
import type { PresentationTemplate } from "@/templates/registry";

/**
 * Dashboard document operations over the persistence adapter: the library
 * list, the trash, and every action a card exposes. All actions refresh the
 * relevant list so the UI stays consistent without a global store.
 */

export function useDocumentLibrary() {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const navigate = useNavigate();

  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    persistence
      .list()
      .then((list) => {
        if (!cancelled) setDocuments(list);
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const openDocument = useCallback(
    async (id: string) => {
      try {
        await persistence.setLastOpenedId(id);
      } catch {
        // navigation still works; the editor will fall back gracefully
      }
      navigate("/editor");
    },
    [navigate],
  );

  const createBlank = useCallback(async () => {
    const doc = createDocument({ title: "Untitled presentation" });
    try {
      await persistence.save(doc);
      await persistence.setLastOpenedId(doc.id);
    } catch {
      // open unsaved; the editor surfaces save failures honestly
    }
    navigate("/editor");
  }, [navigate]);

  const createFromTemplate = useCallback(
    async (template: PresentationTemplate) => {
      const doc = template.build();
      try {
        await persistence.save(doc);
        await persistence.setLastOpenedId(doc.id);
      } catch {
        // as above
      }
      navigate("/editor");
    },
    [navigate],
  );

  const renameDocument = useCallback(
    async (id: string, title: string) => {
      const clean = title.trim();
      if (!clean) return;
      const doc = await persistence.load(id);
      if (!doc) return;
      const renamed: PraxisDocument = {
        ...doc,
        title: clean,
        updatedAt: new Date().toISOString(),
      };
      await persistence.save(renamed);
      refresh();
    },
    [refresh],
  );

  const exportDocumentById = useCallback(async (id: string) => {
    const doc = await persistence.load(id);
    if (!doc) return;
    downloadTextFile(`${slugify(doc.title)}.praxis.json`, exportDocument(doc));
  }, []);

  const trashDocument = useCallback(
    async (id: string) => {
      await persistence.trash(id);
      refresh();
    },
    [refresh],
  );

  return {
    documents,
    refresh,
    openDocument,
    createBlank,
    createFromTemplate,
    renameDocument,
    exportDocumentById,
    trashDocument,
  };
}

export function useTrash() {
  const [items, setItems] = useState<TrashedDocumentSummary[] | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    persistence
      .listTrash()
      .then((trash) => {
        if (!cancelled) setItems(trash);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const restore = useCallback(
    async (id: string) => {
      await persistence.restore(id);
      refresh();
    },
    [refresh],
  );

  const purge = useCallback(
    async (id: string) => {
      await persistence.purge(id);
      refresh();
    },
    [refresh],
  );

  return { items, refresh, restore, purge };
}

/** Load a full document for card previews (cached per id+updatedAt). */
const previewCache = new Map<string, PraxisDocument>();

export function useDocumentPreview(summary: DocumentSummary) {
  const cacheKey = `${summary.id}:${summary.updatedAt}`;
  const [state, setState] = useState<{ key: string; doc: PraxisDocument | null }>(
    () => ({ key: cacheKey, doc: previewCache.get(cacheKey) ?? null }),
  );

  // Reset synchronously when the summary changes (render-time pattern).
  if (state.key !== cacheKey) {
    setState({ key: cacheKey, doc: previewCache.get(cacheKey) ?? null });
  }

  useEffect(() => {
    if (previewCache.has(cacheKey)) return;
    let cancelled = false;
    void persistence.loadForPreview(summary.id).then((loaded) => {
      if (cancelled || !loaded) return;
      previewCache.set(cacheKey, loaded);
      setState({ key: cacheKey, doc: loaded });
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, summary.id]);

  return state.key === cacheKey ? state.doc : null;
}
