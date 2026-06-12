import { CircleCheck, TriangleAlert } from "lucide-react";
import type { ImportResultOk } from "../types";

/** Completion summary: the headline numbers plus any persistence caveat. */
export function ImportSummary({ result }: { result: ImportResultOk }) {
  const s = result.report.summary;
  const needsReview = s.elementsWithWarnings + s.unsupportedElements > 0;

  const rows: { value: number; label: string }[] = [
    { value: s.slidesImported, label: `slide${s.slidesImported === 1 ? "" : "s"} imported` },
    {
      value: s.editableElementsConverted,
      label: "editable elements converted",
    },
    { value: s.imagesExtracted, label: `image${s.imagesExtracted === 1 ? "" : "s"} extracted` },
  ];
  if (s.elementsWithWarnings > 0) {
    rows.push({ value: s.elementsWithWarnings, label: "elements may need review" });
  }
  if (s.unsupportedElements > 0) {
    rows.push({
      value: s.unsupportedElements,
      label: "unsupported elements replaced with placeholders",
    });
  }

  return (
    <div className="px-1 py-2">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            needsReview
              ? "bg-amber-50 text-amber-500"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {needsReview ? <TriangleAlert size={18} /> : <CircleCheck size={18} />}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Import complete</h3>
          <p className="truncate text-xs text-gray-500" title={s.title}>
            {s.title}
          </p>
        </div>
      </div>

      <ul className="space-y-1 text-sm text-gray-700">
        {rows.map((row) => (
          <li key={row.label} className="flex items-baseline gap-2">
            <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-gray-900">
              {row.value}
            </span>
            <span>{row.label}</span>
          </li>
        ))}
      </ul>

      {needsReview ? (
        <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
          Your presentation was imported, but some elements could not be
          converted into editable Praxis objects. Review the import report for
          details.
        </p>
      ) : null}

      {!result.persisted && result.persistenceError ? (
        <p className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {result.persistenceError}
        </p>
      ) : null}
    </div>
  );
}
