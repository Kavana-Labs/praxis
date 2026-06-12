import { FileText } from "lucide-react";
import type { ArtifactObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import type { ObjectViewProps } from "./types";

/**
 * Renders a generated computation artifact. Image artifacts (PNG/SVG) render
 * directly; anything else falls back to a labelled card so an unsupported
 * artifact type never breaks the slide.
 */
export function ArtifactObjectView({ object, document }: ObjectViewProps<ArtifactObject>) {
  const storeAsset = useEditorStore((s) =>
    object.assetId ? s.document.assets[object.assetId] : undefined,
  );
  const asset = document
    ? object.assetId
      ? document.assets[object.assetId]
      : undefined
    : storeAsset;
  const src = object.dataUrl ?? asset?.dataUrl ?? asset?.url ?? null;
  const isImage = object.mimeType.startsWith("image/");

  return (
    <figure
      style={{
        margin: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          padding: 8,
        }}
      >
        {isImage && src ? (
          <img
            src={src}
            alt={object.caption ?? "Generated artifact"}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        ) : (
          <div style={{ textAlign: "center", color: "#64748b", padding: 16 }}>
            <FileText size={32} strokeWidth={1.5} />
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {object.artifactType} · {object.mimeType}
            </div>
            <div style={{ marginTop: 2, fontSize: 12, color: "#94a3b8" }}>
              Preview not available
            </div>
          </div>
        )}
      </div>
      {object.caption ? (
        <figcaption
          style={{
            padding: "6px 10px",
            fontSize: 14,
            color: "#475569",
            textAlign: "center",
            fontStyle: "italic",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {object.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
