/**
 * Generates a clean, restrained SVG plot of x(t) = A·cos(ωt + φ) for the seeded
 * deck's artifact. Using an SVG keeps the seed self-contained (no binary blob)
 * while looking like a real generated figure. At runtime, the execution service
 * produces an equivalent matplotlib PNG.
 */
export function harmonicPlotSvg(): string {
  const W = 800;
  const H = 420;
  const margin = { left: 70, right: 30, top: 50, bottom: 60 };
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;
  const midY = margin.top + plotH / 2;
  const amplitude = plotH / 2 - 10;

  const periods = 2;
  const samples = 240;
  const points: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const frac = i / samples;
    const t = frac * periods * 2 * Math.PI;
    const x = margin.left + frac * plotW;
    const y = midY - amplitude * Math.cos(t);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const path = `M ${points.join(" L ")}`;

  // vertical gridlines at each period boundary
  const grid: string[] = [];
  for (let p = 0; p <= periods * 2; p++) {
    const gx = margin.left + (p / (periods * 2)) * plotW;
    grid.push(
      `<line x1="${gx}" y1="${margin.top}" x2="${gx}" y2="${margin.top + plotH}" stroke="#e2e8f0" stroke-width="1"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${grid.join("\n  ")}
  <line x1="${margin.left}" y1="${midY}" x2="${margin.left + plotW}" y2="${midY}" stroke="#94a3b8" stroke-width="1"/>
  <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" stroke="#94a3b8" stroke-width="1"/>
  <path d="${path}" fill="none" stroke="#652ff3" stroke-width="2.5"/>
  <text x="${W / 2}" y="28" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="600" fill="#0f172a">Harmonic Motion: x(t) = A cos(ωt + φ)</text>
  <text x="${W / 2}" y="${H - 18}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" fill="#475569">time →</text>
  <text x="22" y="${midY}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="13" fill="#475569" transform="rotate(-90 22 ${midY})">displacement</text>
</svg>`;
}

/** The SVG plot as an inline data URL suitable for an <img> / artifact asset. */
export function harmonicPlotDataUrl(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(harmonicPlotSvg())}`;
}
