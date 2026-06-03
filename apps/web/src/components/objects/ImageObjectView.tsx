import { ImageIcon } from "lucide-react";
import type { ImageObject } from "@/domain/types";
import type { ObjectViewProps } from "./types";

export function ImageObjectView({ object, document }: ObjectViewProps<ImageObject>) {
  const asset = object.assetId ? document.assets[object.assetId] : undefined;
  const src = asset?.dataUrl ?? asset?.url ?? null;

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
      }}
    >
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        {src ? (
          <img
            src={src}
            alt={object.alt ?? ""}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: object.fit ?? "contain",
            }}
          />
        ) : (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>
            <ImageIcon size={36} strokeWidth={1.5} />
            <div style={{ marginTop: 8, fontSize: 14 }}>No image — choose a file in the inspector</div>
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
          }}
        >
          {object.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
