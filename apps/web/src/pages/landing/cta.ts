/**
 * Shared landing CTA button styles, so the hero, "why", and ending sections
 * stay visually identical. Clean single-direction shadows (no multi-layer
 * stacks) for a sharper, more premium feel.
 */
export const ctaPrimary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B16E1] to-[#805DF7] text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(92,23,226,0.55)] transition-all duration-200 ease-out hover:shadow-[0_16px_30px_-10px_rgba(92,23,226,0.6)] hover:brightness-[1.03] active:scale-[0.985] sm:h-[52px] sm:w-[190px]";

export const ctaSecondary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-[15px] font-semibold text-[#4B5563] transition-colors duration-200 hover:border-[#D1D5DB] hover:bg-[#FAFAFB] active:scale-[0.985] sm:h-[52px] sm:w-[190px]";
