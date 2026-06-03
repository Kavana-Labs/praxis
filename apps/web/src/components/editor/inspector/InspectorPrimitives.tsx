import type { ReactNode } from "react";

export function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-gray-200 px-4 py-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      {children}
    </div>
  );
}

export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-2 flex items-center gap-2 text-xs text-gray-600 last:mb-0">
      <span className="w-16 shrink-0 text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onChange(n);
      }}
      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs tabular-nums text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300"
    />
  );
}

export function TextInput({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300 ${
        mono ? "font-mono" : ""
      }`}
    />
  );
}

export function TextArea({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  rows = 3,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`w-full resize-y rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300 ${
        mono ? "font-mono" : ""
      }`}
    />
  );
}

/** A segmented single-choice control used for level/align/fit/shape pickers. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-md border border-gray-200">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`flex flex-1 items-center justify-center gap-1 px-1 py-1 text-xs transition-colors ${
            value === opt.value
              ? "bg-brand-500 text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full cursor-pointer rounded border border-gray-200"
    />
  );
}

export function InspectorButton({
  onClick,
  children,
  variant = "default",
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  variant?: "default" | "danger";
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
        variant === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-gray-200 text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
