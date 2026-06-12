import { Quote } from "lucide-react";
import type { CitationObject } from "@/domain/types";
import { citationLink, formatCitationCompact } from "@/lib/citation";
import { useEditorStore } from "@/stores/editor-store";
import type { ObjectViewProps } from "./types";

export function CitationObjectView({ object, document, theme }: ObjectViewProps<CitationObject>) {
  const storeRecord = useEditorStore(
    (s) => s.document.citations[object.citationId],
  );
  const record = document ? document.citations[object.citationId] : storeRecord;

  if (!record) {
    return (
      <div style={{ padding: 16, color: "#94a3b8", fontStyle: "italic" }}>
        Missing citation reference
      </div>
    );
  }

  const link = citationLink(record);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        gap: 12,
        padding: "14px 16px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderLeft: `3px solid ${theme.accent}`,
        borderRadius: 8,
        fontFamily: theme.fontBody,
        overflow: "hidden",
      }}
    >
      <Quote size={20} color={theme.accent} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        {record.key ? (
          <div style={{ fontSize: 12, color: theme.muted, fontFamily: theme.fontMono, marginBottom: 4 }}>
            [{record.key}]
          </div>
        ) : null}
        <div style={{ fontSize: 17, color: theme.text, lineHeight: 1.4 }}>
          {formatCitationCompact(record)}
        </div>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: theme.accent, wordBreak: "break-all" }}
          >
            {link}
          </a>
        ) : null}
      </div>
    </div>
  );
}
