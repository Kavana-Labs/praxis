import { CircleAlert, Info, OctagonAlert } from "lucide-react";
import { groupReportBySlide } from "../report/importReportBuilder";
import type { ImportReport as Report, ImportSeverity } from "../types";

/** Grouped-by-slide import report (slide 0 = whole presentation). */
export function ImportReport({ report }: { report: Report }) {
  const groups = groupReportBySlide(report);

  if (groups.length === 0) {
    return (
      <p className="px-1 py-3 text-sm text-gray-500">
        Everything in this presentation was converted without warnings.
      </p>
    );
  }

  return (
    <div className="max-h-72 space-y-4 overflow-y-auto px-1 py-2">
      {groups.map((group) => (
        <section key={group.slideNumber}>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {group.slideNumber === 0
              ? "Whole presentation"
              : `Slide ${group.slideNumber}`}
          </h4>
          <ul className="space-y-1.5">
            {group.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug">
                <SeverityIcon severity={item.severity} />
                <span className="min-w-0">
                  <span className="text-gray-800">{item.message}</span>{" "}
                  <span className="text-gray-500">{item.fallback}</span>
                  {item.actionRecommended ? (
                    <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">
                      review
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SeverityIcon({ severity }: { severity: ImportSeverity }) {
  switch (severity) {
    case "error":
      return (
        <OctagonAlert size={15} className="mt-0.5 shrink-0 text-red-500" />
      );
    case "warning":
      return (
        <CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-500" />
      );
    default:
      return <Info size={15} className="mt-0.5 shrink-0 text-gray-400" />;
  }
}
