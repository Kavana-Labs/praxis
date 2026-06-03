import { Check, CircleDashed, CloudUpload, TriangleAlert } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";

const MAP = {
  saved: { label: "Saved", icon: Check, className: "text-emerald-600" },
  saving: { label: "Saving…", icon: CloudUpload, className: "text-gray-500" },
  dirty: { label: "Unsaved", icon: CircleDashed, className: "text-amber-600" },
  error: { label: "Save failed", icon: TriangleAlert, className: "text-red-600" },
} as const;

export function SaveStatusBadge() {
  const status = useEditorStore((s) => s.saveStatus);
  const { label, icon: Icon, className } = MAP[status];
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
