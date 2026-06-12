import { Check, Loader2 } from "lucide-react";
import { IMPORT_STAGES, type ImportProgress as Progress } from "../types";

/**
 * Step-based progress: completed stages get a check, the active stage a
 * spinner (plus a real fraction where the pipeline can measure one). No fake
 * percentages.
 */
export function ImportProgress({ progress }: { progress: Progress }) {
  const activeIndex = IMPORT_STAGES.findIndex((s) => s.id === progress.stage);

  return (
    <div className="px-1 py-2" aria-live="polite">
      <ol className="space-y-2.5">
        {IMPORT_STAGES.map((stage, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={stage.id} className="flex items-center gap-2.5 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-emerald-100 text-emerald-600"
                    : active
                      ? "text-brand-500"
                      : "border border-gray-200 text-transparent"
                }`}
              >
                {done ? (
                  <Check size={12} />
                ) : active ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
              </span>
              <span
                className={
                  done
                    ? "text-gray-400"
                    : active
                      ? "font-medium text-gray-900"
                      : "text-gray-400"
                }
              >
                {stage.label}
                {active && progress.stageProgress !== undefined
                  ? ` (${Math.round(progress.stageProgress * 100)}%)`
                  : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
