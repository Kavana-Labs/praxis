/**
 * The Praxis brand mark: a precise, mathematically-set lambda. Kept subtle and
 * monoline so it never competes with slide content.
 */
export function PraxisMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 8,
        background: "#1f2937",
        color: "#652ff3",
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: size * 0.6,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      λ
    </span>
  );
}

export function PraxisWordmark() {
  return (
    <div className="flex items-center gap-2 select-none">
      <PraxisMark />
      <span className="text-[15px] font-semibold tracking-tight text-gray-900">
        Praxis
      </span>
    </div>
  );
}
