import type { MathObject } from "@/domain/types";
import { Katex } from "@/lib/katex";
import type { ObjectViewProps } from "./types";

export function MathObjectView({ object }: ObjectViewProps<MathObject>) {
  const empty = object.latex.trim().length === 0;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        fontSize: 30,
        overflow: "auto",
      }}
    >
      {empty ? (
        <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 18 }}>
          Empty equation — add LaTeX in the inspector
        </span>
      ) : (
        <Katex latex={object.latex} display={object.display ?? true} />
      )}
    </div>
  );
}
