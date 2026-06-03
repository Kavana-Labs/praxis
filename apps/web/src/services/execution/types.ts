import type { ErrorCategory, ExecutionStatus } from "@/domain/types";

/** Mirrors the execution service's response contract (camelCase over the wire). */
export type ServiceArtifact = {
  artifactId: string;
  type: string;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  dataUrl?: string;
};

export type ExecuteResponse = {
  executionId: string;
  status: "success" | "error";
  stdout: string;
  stderr: string;
  exitCode?: number | null;
  durationMs: number;
  errorCategory?: ErrorCategory;
  artifacts: ServiceArtifact[];
};

export type RunResult = {
  response: ExecuteResponse;
  /** True when the service could not be reached at all (network/DNS/refused). */
  serviceUnavailable: boolean;
};

// Re-export for convenience at call sites.
export type { ExecutionStatus };
