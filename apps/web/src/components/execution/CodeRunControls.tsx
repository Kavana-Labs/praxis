import { Loader2, Play } from "lucide-react";
import type { CodeObject } from "@/domain/types";
import { useRunCode } from "./useRunCode";

/**
 * The Run button for a code object. Wired to the execution service via
 * useRunCode; reflects idle/running state. Results and artifacts are rendered by
 * the code renderer and the inspector's ExecutionPanel.
 */
export function CodeRunControls({
  object,
  compact = false,
  label = "Run",
}: {
  object: CodeObject;
  compact?: boolean;
  label?: string;
}) {
  const { run, running } = useRunCode(object);
  const isPython = object.language.toLowerCase() === "python";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void run();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={running || !isPython}
      title={isPython ? "Run (Python)" : "Only Python is executable in the MVP"}
      className={`flex items-center gap-1.5 rounded-lg font-semibold transition-colors ${
        compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm justify-center"
      } ${
        running
          ? "bg-gray-200 text-gray-500"
          : isPython
            ? "bg-brand-500 text-white hover:bg-brand-600"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
      }`}
    >
      {running ? (
        <Loader2 size={compact ? 13 : 15} className="animate-spin" />
      ) : (
        <Play size={compact ? 13 : 15} />
      )}
      {running ? "Running…" : label}
    </button>
  );
}
