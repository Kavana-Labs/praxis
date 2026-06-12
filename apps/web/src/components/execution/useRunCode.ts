import { useCallback } from "react";
import type { CodeExecution, CodeObject } from "@/domain/types";
import { executePython } from "@/services/execution/client";
import type { ExecuteResponse } from "@/services/execution/types";
import { useEditorStore } from "@/stores/editor-store";

function mapToCodeExecution(response: ExecuteResponse): CodeExecution {
  return {
    executionId: response.executionId,
    status: response.status === "success" ? "success" : "error",
    stdout: response.stdout ?? "",
    stderr: response.stderr ?? "",
    exitCode: response.exitCode ?? undefined,
    durationMs: response.durationMs,
    errorCategory: response.errorCategory,
    artifacts: (response.artifacts ?? []).map((a) => ({
      artifactId: a.artifactId,
      type: a.type,
      mimeType: a.mimeType,
      dataUrl: a.dataUrl,
      filename: a.filename,
    })),
    ranAt: new Date().toISOString(),
  };
}

/**
 * Encapsulates running a code object against the execution service. The
 * callback identity is stable per object and always executes the *latest*
 * source from the store (never a stale closure).
 */
export function useRunCode(object: CodeObject) {
  const setCodeExecution = useEditorStore((s) => s.setCodeExecution);
  const running = object.execution?.status === "running";

  const run = useCallback(async () => {
    const current = useEditorStore.getState().document.objects[object.id];
    if (!current || current.type !== "code") return;
    if (current.execution?.status === "running") return;
    setCodeExecution(object.id, {
      executionId: "",
      status: "running",
      stdout: "",
      stderr: "",
      artifacts: [],
    });
    const { response } = await executePython(current.source, 15);
    setCodeExecution(object.id, mapToCodeExecution(response));
  }, [object.id, setCodeExecution]);

  return { run, running };
}
