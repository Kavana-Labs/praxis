import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import type { CodeObject } from "@/domain/types";
import { CodeRunControls } from "@/components/execution/CodeRunControls";
import type { ObjectViewProps } from "./types";

/**
 * Display renderer for code objects — a light, macOS-window styled code block
 * (Platform Figma): a title bar with traffic-light dots + filename, syntax-
 * highlighted source, and a Run button + Output pill. Editing happens in
 * CodeObjectEditor; this renders read-only for the canvas, Present Mode, and
 * thumbnails.
 */
const DOTS = ["#ff5f57", "#febc2e", "#28c840"];

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.length > 60 ? `${line.slice(0, 60)}…` : line;
}

export function CodeObjectView({ object, mode }: ObjectViewProps<CodeObject>) {
  const exec = object.execution;
  const thumb = mode === "thumbnail";
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
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
      }}
    >
      {/* macOS-style title bar */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: thumb ? "6px 10px" : "9px 14px",
          background: "#f3f4f6",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {DOTS.map((c) => (
          <span
            key={c}
            style={{ width: thumb ? 7 : 11, height: thumb ? 7 : 11, borderRadius: 999, background: c }}
          />
        ))}
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: thumb ? 9 : 13,
            color: "#6b7280",
          }}
        >
          {filename}
        </span>
        {exec && exec.status !== "idle" ? (
          <span
            style={{
              marginLeft: "auto",
              zIndex: 1,
              fontSize: 11,
              padding: "1px 8px",
              borderRadius: 999,
              background:
                exec.status === "success"
                  ? "#dcfce7"
                  : exec.status === "error"
                    ? "#fee2e2"
                    : "#e5e7eb",
              color:
                exec.status === "success"
                  ? "#15803d"
                  : exec.status === "error"
                    ? "#b91c1c"
                    : "#6b7280",
            }}
          >
            {exec.status}
          </span>
        ) : null}
      </div>

      {/* Source */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "#ffffff" }}>
        {thumb ? (
          <pre
            style={{
              margin: 0,
              padding: "8px 12px",
              fontSize: 9,
              lineHeight: 1.5,
              color: "#334155",
              whiteSpace: "pre",
            }}
          >
            <code>{object.source}</code>
          </pre>
        ) : (
          <CodeMirror
            value={object.source}
            editable={false}
            extensions={[python()]}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
            }}
            style={{ fontSize: 14 }}
          />
        )}
      </div>

      {/* Run + output (not in thumbnails) */}
      {!thumb ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          {mode === "edit" ? (
            <div style={{ pointerEvents: "auto" }}>
              <CodeRunControls object={object} label="Run code" />
            </div>
          ) : null}
          {exec && (exec.stdout || exec.stderr) ? (
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
              }}
            >
              <span style={{ color: "#6b7280" }}>Output:</span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderRadius: 8,
                  background: "#f3f4f6",
                  padding: "4px 10px",
                  color: exec.stderr && !exec.stdout ? "#b91c1c" : "#334155",
                }}
              >
                {firstLine(exec.stderr && !exec.stdout ? exec.stderr : exec.stdout)}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
