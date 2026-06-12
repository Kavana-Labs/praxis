import { useEffect, useMemo, useRef } from "react";
import { Check, CircleAlert, Sigma } from "lucide-react";
import type { MathObject } from "@/domain/types";
import { Katex } from "@/lib/katex";
import { latexParseError } from "@/lib/latex";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Inline LaTeX editor card: a live KaTeX preview, a LaTeX source area, and a
 * footer with parse feedback + Done. The whole editing session is one undo
 * step. Malformed LaTeX shows a calm, specific message — the editor never
 * crashes, and the source is always preserved verbatim.
 */
export function MathObjectEditor({ object }: { object: MathObject }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const beginTransform = useEditorStore((s) => s.beginTransform);
  const endTransform = useEditorStore((s) => s.endTransform);
  const updateObjectLive = useEditorStore((s) => s.updateObjectLive);
  const setEditingObject = useEditorStore((s) => s.setEditingObject);

  const parseError = useMemo(() => latexParseError(object.latex), [object.latex]);

  useEffect(() => {
    beginTransform();
    ref.current?.focus();
    return () => endTransform();
  }, [beginTransform, endTransform]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 14px 36px rgba(15,23,42,0.14)",
      }}
    >
      <div
        style={{
          flex: "0 1 auto",
          maxHeight: "48%",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 12px",
          overflow: "auto",
          borderBottom: "1px solid #f1f5f9",
          fontSize: 26,
        }}
      >
        <Katex latex={object.latex || "\\;"} display={object.display ?? true} />
      </div>

      <textarea
        ref={ref}
        value={object.latex}
        spellCheck={false}
        aria-label="LaTeX source"
        placeholder="\frac{\partial}{\partial t}\Psi"
        onChange={(e) => updateObjectLive(object.id, { latex: e.target.value })}
        style={{
          flex: 1,
          minHeight: 0,
          resize: "none",
          border: "none",
          outline: "none",
          padding: "10px 12px",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 14,
          color: "#334155",
          background: "#fff",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderTop: "1px solid #f1f5f9",
          background: "#f9fafb",
        }}
      >
        {parseError ? (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              minWidth: 0,
              color: "#b45309",
              fontSize: 12,
            }}
            title={parseError}
          >
            <CircleAlert size={14} style={{ flexShrink: 0 }} />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {parseError}
            </span>
          </span>
        ) : (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "#6b7280",
              fontSize: 12,
            }}
          >
            <Sigma size={14} />
            LaTeX
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditingObject(null)}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            background: "#652ff3",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Check size={14} />
          Done
        </button>
      </div>
    </div>
  );
}
