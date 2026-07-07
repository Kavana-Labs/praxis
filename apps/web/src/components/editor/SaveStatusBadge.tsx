import {
  Check,
  CircleDashed,
  CloudUpload,
  GitMerge,
  TriangleAlert,
} from "lucide-react";
import { saveNow } from "@/editor/usePersistence";
import { useEditorStore } from "@/stores/editor-store";

const MAP = {
  saved: { label: "Saved", icon: Check, className: "text-emerald-600" },
  saving: { label: "Saving…", icon: CloudUpload, className: "text-gray-500" },
  dirty: { label: "Unsaved", icon: CircleDashed, className: "text-amber-600" },
  error: { label: "Save failed", icon: TriangleAlert, className: "text-red-600" },
  conflict: {
    label: "Edited in another tab — click to save",
    icon: GitMerge,
    className: "text-red-600",
  },
} as const;

export function SaveStatusBadge() {
  const status = useEditorStore((s) => s.saveStatus);
  const { label, icon: Icon, className } = MAP[status];

  // In a conflict the badge becomes an action: clicking forces this tab's
  // version to win. A passive indicator would leave the user stuck.
  if (status === "conflict") {
    return (
      <button
        type="button"
        onClick={() => void saveNow({ force: true })}
        className={`flex items-center gap-1 text-xs font-medium ${className} hover:underline`}
        title={label}
      >
        <Icon size={13} />
        <span className="hidden sm:inline">Conflict — save this version</span>
      </button>
    );
  }

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${className}`}
      title={label}
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
