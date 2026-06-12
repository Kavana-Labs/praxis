import { useRef, useState } from "react";
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

export function FieldRow({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  /** Single-character labels (X/Y/W/H) in dense grids. */
  compact?: boolean;
}) {
  return (
    <label className="mb-2 flex items-center gap-2 text-xs text-gray-600 last:mb-0">
      <span className={`${compact ? "w-3" : "w-16"} shrink-0 text-gray-500`}>
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Validated numeric field. Typing edits a local draft; the value commits on
 * Enter or blur (rejecting NaN/empty and clamping to min/max), so partial
 * input like "15" while typing "150" never reaches the document. ArrowUp/Down
 * step-and-commit immediately; Escape reverts the draft.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  label?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // Ref, not state: blur() fires synchronously inside the Escape handler.
  const cancelled = useRef(false);

  // External changes (drag, undo) drop any stale draft — reset during render.
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(null);
  }

  const clampValue = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const commit = (raw: string) => {
    setDraft(null);
    if (raw.trim() === "") return; // revert — empty is never a value
    const n = Number(raw);
    if (Number.isNaN(n) || !Number.isFinite(n)) return; // revert
    const next = clampValue(n);
    if (next !== value) onChange(next);
  };

  const stepBy = (delta: number) => {
    const base = draft !== null && draft.trim() !== "" ? Number(draft) : value;
    const safe = Number.isFinite(base) ? base : value;
    setDraft(null);
    const next = clampValue(safe + delta);
    if (next !== value) onChange(next);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? String(Math.round(value * 100) / 100)}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        if (cancelled.current) {
          cancelled.current = false;
          setDraft(null);
          return;
        }
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation(); // keep canvas Escape behavior out of it
          cancelled.current = true;
          setDraft(null);
          e.currentTarget.blur();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          stepBy(e.shiftKey ? step * 10 : step);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          stepBy(e.shiftKey ? -step * 10 : -step);
        }
      }}
      className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs tabular-nums text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-300 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
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
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <input
      type="color"
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full cursor-pointer rounded border border-gray-200"
    />
  );
}

/** Compact square icon action with an optional pressed (toggled) state. */
export function IconToggleButton({
  onClick,
  children,
  title,
  pressed,
  danger,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  title: string;
  pressed?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      className={`flex h-8 flex-1 items-center justify-center rounded-md border text-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed
          ? "border-brand-300 bg-brand-50 text-brand-600"
          : danger
            ? "border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            : "border-gray-200 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
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
