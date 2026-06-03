import { useMemo } from "react";
import type { TextObject } from "@/domain/types";
import { sanitizeHtml } from "@/lib/sanitize";
import type { ObjectViewProps } from "./types";

export function TextObjectView({ object, theme }: ObjectViewProps<TextObject>) {
  const html = useMemo(() => sanitizeHtml(object.html), [object.html]);
  return (
    <div
      className="praxis-richtext"
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        padding: "8px 10px",
        fontFamily: theme.fontBody,
        fontSize: 22,
        lineHeight: 1.5,
        color: theme.text,
        textAlign: object.align ?? "left",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
