import { useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import type { CodeObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { CodeRunControls } from "@/components/execution/CodeRunControls";

/**
 * Inline code editor (CodeMirror 6) — light, macOS-window styled to match the
 * Platform Figma. Edits are coalesced into one undo step. The Run button +
 * execution output sit in the footer.
 */
const DOTS = ["#ff5f57", "#febc2e", "#28c840"];

export function CodeObjectEditor({ object }: { object: CodeObject }) {
  const beginTransform = useEditorStore((s) => s.beginTransform);
  const endTransform = useEditorStore((s) => s.endTransform);
  const updateObjectLive = useEditorStore((s) => s.updateObjectLive);

  useEffect(() => {
    beginTransform();
    return () => endTransform();
  }, [beginTransform, endTransform]);

  const exec = object.execution;
  const filename = object.language === "python" ? "script.py" : object.language;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "9px 14px",
          background: "#f3f4f6",
          borderBottom: "1px solid #e5e7eb",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        {DOTS.map((c) => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: 999, background: c }} />
        ))}
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: 13,
            color: "#6b7280",
          }}
        >
          {filename}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <CodeMirror
          value={object.source}
          extensions={[python()]}
          basicSetup={{ lineNumbers: true, highlightActiveLine: true, foldGutter: false }}
          onChange={(value) => updateObjectLive(object.id, { source: value })}
          style={{ fontSize: 14 }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <CodeRunControls object={object} label="Run code" />
        {exec && (exec.stdout || exec.stderr) ? (
          <pre
            style={{
              flex: 1,
              minWidth: 0,
              margin: 0,
              maxHeight: 96,
              overflow: "auto",
              borderRadius: 8,
              background: "#f8fafc",
              padding: "6px 10px",
              fontSize: 12.5,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: exec.stderr && !exec.stdout ? "#b91c1c" : "#334155",
              whiteSpace: "pre-wrap",
            }}
          >
            {exec.stdout || exec.stderr}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
