import { FileText, ImagePlus, TriangleAlert } from "lucide-react";
import type { ArtifactRef, CodeObject } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Inspector panel showing the latest execution result for a code object:
 * status, timing, a clear service-unavailable message, and a gallery of
 * generated artifacts each with an "Insert into slide" action.
 */
export function ExecutionPanel({ object }: { object: CodeObject }) {
  const exec = object.execution;
  const insertArtifact = useEditorStore((s) => s.insertArtifact);

  if (!exec || exec.status === "idle") return null;

  const serviceDown =
    exec.status === "error" && exec.errorCategory === "INTERNAL_ERROR";

  const imageArtifacts = exec.artifacts.filter(
    (a) => a.mimeType.startsWith("image/") && a.dataUrl,
  );
  const otherArtifacts = exec.artifacts.filter(
    (a) => !(a.mimeType.startsWith("image/") && a.dataUrl),
  );

  const insert = (a: ArtifactRef) => {
    if (!a.dataUrl) return;
    insertArtifact({
      mimeType: a.mimeType,
      dataUrl: a.dataUrl,
      filename: a.filename,
      executionId: exec.executionId,
      caption: a.filename,
    });
  };

  return (
    <div className="border-b border-gray-200 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Execution
        </span>
        <StatusPill status={exec.status} durationMs={exec.durationMs} />
      </div>

      {serviceDown ? (
        <div className="mb-2 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Execution service unavailable</div>
            <div className="mt-0.5 whitespace-pre-wrap font-mono">{exec.stderr}</div>
          </div>
        </div>
      ) : null}

      {imageArtifacts.length > 0 ? (
        <div className="space-y-2">
          {imageArtifacts.map((a) => (
            <div key={a.artifactId} className="overflow-hidden rounded-md border border-gray-200">
              <img
                src={a.dataUrl}
                alt={a.filename ?? "artifact"}
                className="block max-h-32 w-full bg-gray-50 object-contain"
              />
              <button
                type="button"
                onClick={() => insert(a)}
                className="flex w-full items-center justify-center gap-1.5 border-t border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
              >
                <ImagePlus size={13} /> Insert into slide
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {otherArtifacts.length > 0 ? (
        <div className="mt-2 space-y-1">
          {otherArtifacts.map((a) => (
            <div
              key={a.artifactId}
              className="flex items-center gap-1.5 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-600"
            >
              <FileText size={12} />
              <span className="truncate">{a.filename}</span>
              <span className="ml-auto font-mono text-gray-400">{a.mimeType}</span>
            </div>
          ))}
        </div>
      ) : null}

      {!serviceDown && exec.status === "success" && exec.artifacts.length === 0 ? (
        <p className="text-[11px] text-gray-400">
          Ran successfully. Save a file to <span className="font-mono">/workspace/output</span> to produce an artifact.
        </p>
      ) : null}
    </div>
  );
}

function StatusPill({
  status,
  durationMs,
}: {
  status: string;
  durationMs?: number;
}) {
  const map: Record<string, string> = {
    running: "bg-gray-100 text-gray-500",
    success: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] ?? ""}`}>
      {status}
      {durationMs ? ` · ${durationMs}ms` : ""}
    </span>
  );
}
