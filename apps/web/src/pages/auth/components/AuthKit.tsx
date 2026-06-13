import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { CircleAlert, CircleCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import authFormulaBg from "@/assets/auth/auth-formula-bg.png";
import authGlow from "@/assets/auth/auth-glow.svg";
import praxisGlyph from "@/assets/auth/praxis-glyph.svg";
import googleLogo from "@/assets/auth/google-logo.svg";
import { cn } from "@/lib/utils";

/**
 * Shared authentication UI, matching the Platform Figma auth screens: a
 * formula-texture backdrop with a violet glow, a centered 460px card with the
 * bare Praxis glyph, notched-label inputs, and the gradient CTA.
 */

export function AuthLayout({
  title,
  subtitle,
  children,
  below,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered under the card (e.g. the signup terms line). */
  below?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f4f6] px-4 py-10">
      {/* Formula texture (the design's own asset). Multiply drops the source
          white so only the equations darken the gray base — matching the
          two stacked formula layers in the Figma frame. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] [mix-blend-mode:multiply]"
        style={{
          backgroundImage: `url(${authFormulaBg})`,
          backgroundSize: "126%",
          backgroundPosition: "center",
          backgroundRepeat: "repeat",
        }}
      />
      {/* Violet glow — the design's exact "Ellipse 6" (#805DF7 circle r=289,
          Gaussian blur σ=200, 31% opacity). The SVG carries the blur; we only
          anchor its centre 37px from the right edge and 31px below the top. */}
      <img
        aria-hidden
        src={authGlow}
        alt=""
        className="pointer-events-none absolute h-[1378px] w-[1378px] max-w-none"
        style={{ top: -658, right: -652 }}
      />

      <div className="relative w-full max-w-[460px]">
        <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] shadow-[0_60px_12px_rgba(75,85,99,0.01),0_34px_10px_rgba(75,85,99,0.02),0_12px_7.5px_rgba(75,85,99,0.03),0_4px_4px_rgba(75,85,99,0.04)]">
          <div className="flex flex-col items-center gap-6 bg-white p-8">
            <img src={praxisGlyph} alt="Praxis" className="h-10 w-[50px]" />
            <div className="flex w-full flex-col items-center gap-8">
              <h1 className="text-center text-[32px] font-bold leading-tight text-[#1f2937]">
                {title}
              </h1>
              {subtitle ? (
                <p className="max-w-[394px] text-center text-base leading-snug text-[#1f2937]">
                  {subtitle}
                </p>
              ) : null}
              {children}
            </div>
          </div>
          <div className="flex h-14 items-center justify-center border-t border-[#eceaf3] bg-[#fbfaff] px-2">
            <p className="text-center text-xs font-medium text-[#6b7880]">
              LaTeX-native&ensp;•&ensp;Academic-ready exports&ensp;•&ensp;Built for
              scientists &amp; engineers
            </p>
          </div>
        </div>
        {below ? <div className="mt-6 text-center">{below}</div> : null}
      </div>
    </div>
  );
}

type NotchedFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> & {
  label: string;
  error?: string | null;
  /** Adds a show/hide toggle and manages the input type. */
  password?: boolean;
};

export function NotchedField({
  label,
  error,
  password,
  ...inputProps
}: NotchedFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full">
      <div
        className={cn(
          "relative flex h-12 items-center rounded-xl border bg-white transition-colors focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-300",
          error ? "border-red-300" : "border-[#e6e4ec]",
        )}
      >
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute -top-[9px] left-[15px] bg-white px-2 text-xs",
            error ? "text-red-500" : "text-gray-400",
          )}
        >
          {label}
        </label>
        <input
          id={id}
          {...inputProps}
          type={password ? (visible ? "text" : "password") : (inputProps.type ?? "text")}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-full w-full rounded-xl bg-transparent px-4 text-base font-medium text-gray-600 placeholder:text-gray-300 focus:outline-none"
        />
        {password ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
            className="mr-4 shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          >
            {visible ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 pl-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GradientButton({
  children,
  busy,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5b16e1] to-[#805df7] text-base font-semibold text-white transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function GoogleButton({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-gray-400 bg-gray-50 text-base font-bold text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <img src={googleLogo} alt="" className="h-6 w-6" />
      )}
      {label}
    </button>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="h-px flex-1 bg-gray-200" />
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

export function AuthNotice({
  kind,
  children,
}: {
  kind: "error" | "success" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-[13px] leading-snug",
        kind === "error" && "border-red-200 bg-red-50 text-red-700",
        kind === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        kind === "info" && "border-gray-200 bg-gray-50 text-gray-600",
      )}
    >
      {kind === "error" ? (
        <CircleAlert size={15} className="mt-0.5 shrink-0" />
      ) : kind === "success" ? (
        <CircleCheck size={15} className="mt-0.5 shrink-0" />
      ) : (
        <CircleAlert size={15} className="mt-0.5 shrink-0 text-gray-400" />
      )}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** Small banner shown when accounts are browser-local (no backend configured). */
export function LocalModeNote() {
  return (
    <AuthNotice kind="info">
      This deployment stores accounts <strong>locally in your browser</strong>.
      Confirmation and reset links appear here instead of arriving by email.
    </AuthNotice>
  );
}
