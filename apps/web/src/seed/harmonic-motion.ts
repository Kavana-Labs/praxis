import { SCHEMA_VERSION } from "@/domain/constants";
import { createTheme } from "@/domain/factory";
import { ID } from "@/domain/ids";
import type {
  PraxisDocument,
  PraxisObject,
  SlideContainer,
} from "@/domain/types";
import { harmonicPlotDataUrl } from "./sine-plot";

/**
 * The seeded "Modeling Harmonic Motion" deck. Demonstrates the full value
 * proposition: a title, conceptual explanation, a rendered equation, runnable
 * Python, a generated plot artifact, a citation, and a summary.
 *
 * Stable ids + fixed timestamps make the seed idempotent: re-seeding overwrites
 * the same document rather than spawning duplicates, and exports stay
 * byte-stable.
 */

const T0 = "2026-01-01T00:00:00.000Z";
const DOC_ID = "doc_seed_harmonic_motion";

let counter = 0;
function oid(): string {
  counter += 1;
  return `obj_seed_${counter.toString().padStart(3, "0")}`;
}

type Box = { x: number; y: number; width: number; height: number };

function withBase(box: Box, zIndex: number) {
  return {
    id: oid(),
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    zIndex,
    createdAt: T0,
    updatedAt: T0,
  };
}

const PLOT_CODE = `import numpy as np
import matplotlib.pyplot as plt

t = np.linspace(0, 4 * np.pi, 400)
A, omega, phi = 1.0, 1.0, 0.0
x = A * np.cos(omega * t + phi)

plt.figure(figsize=(8, 4))
plt.plot(t, x, color="#652ff3", linewidth=2)
plt.title("Harmonic Motion: x(t) = A cos(\\u03c9t + \\u03c6)")
plt.xlabel("time (s)")
plt.ylabel("displacement")
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig("/workspace/output/harmonic.png", dpi=120)
print("Saved harmonic.png")
`;

export function createHarmonicMotionDeck(
  opts: { freshId?: boolean } = {},
): PraxisDocument {
  counter = 0;
  const objects: Record<string, PraxisObject> = {};
  const slides: SlideContainer[] = [];
  const citations: PraxisDocument["citations"] = {};
  const assets: PraxisDocument["assets"] = {};

  const add = (obj: PraxisObject): string => {
    objects[obj.id] = obj;
    return obj.id;
  };
  const slide = (
    title: string,
    objectIds: string[],
    extra: Partial<SlideContainer> = {},
  ) => {
    slides.push({ id: `slide_seed_${slides.length + 1}`, title, objectIds, ...extra });
  };

  // ---- Slide 1: title ----------------------------------------------------
  const s1: string[] = [];
  s1.push(
    add({
      ...withBase({ x: 160, y: 280, width: 1280, height: 150 }, 0),
      type: "heading",
      text: "Modeling Harmonic Motion",
      level: 1,
      align: "center",
    }),
  );
  s1.push(
    add({
      ...withBase({ x: 320, y: 452, width: 960, height: 70 }, 1),
      type: "shape",
      shape: "divider",
      stroke: "#652ff3",
      strokeWidth: 2,
    }),
  );
  s1.push(
    add({
      ...withBase({ x: 280, y: 470, width: 1040, height: 80 }, 2),
      type: "text",
      html: "<p>Equations, code, and generated evidence in one scientific canvas.</p>",
      align: "center",
    }),
  );
  s1.push(
    add({
      ...withBase({ x: 280, y: 600, width: 1040, height: 50 }, 3),
      type: "text",
      html: "<p>A Praxis example · Kavana Labs</p>",
      align: "center",
    }),
  );
  slide("Title", s1);

  // ---- Slide 2: concept --------------------------------------------------
  const s2: string[] = [];
  s2.push(
    add({
      ...withBase({ x: 120, y: 90, width: 1100, height: 90 }, 0),
      type: "heading",
      text: "The idea",
      level: 2,
    }),
  );
  s2.push(
    add({
      ...withBase({ x: 120, y: 220, width: 1360, height: 520 }, 1),
      type: "text",
      html:
        "<p>A system in <strong>simple harmonic motion</strong> experiences a restoring force proportional to its displacement from equilibrium. The result is smooth, periodic oscillation in time.</p>" +
        "<p>Three quantities fully describe the motion:</p>" +
        "<ul>" +
        "<li><strong>Amplitude</strong> A — the peak displacement.</li>" +
        "<li><strong>Angular frequency</strong> ω — how fast it oscillates.</li>" +
        "<li><strong>Phase</strong> φ — where in the cycle it starts.</li>" +
        "</ul>",
    }),
  );
  slide("Concept", s2);

  // ---- Slide 3: equation -------------------------------------------------
  const s3: string[] = [];
  s3.push(
    add({
      ...withBase({ x: 120, y: 90, width: 1100, height: 90 }, 0),
      type: "heading",
      text: "Equation of motion",
      level: 2,
    }),
  );
  s3.push(
    add({
      ...withBase({ x: 300, y: 280, width: 1000, height: 180 }, 1),
      type: "math",
      latex: "x(t) = A \\cos(\\omega t + \\phi)",
      display: true,
    }),
  );
  s3.push(
    add({
      ...withBase({ x: 300, y: 500, width: 1000, height: 260 }, 2),
      type: "text",
      html:
        "<p>The same relationship follows from the equation of motion of a mass on a spring,</p>" +
        "<ul>" +
        "<li>ω = √(k/m) for spring constant k and mass m,</li>" +
        "<li>and A, φ are fixed by the initial conditions.</li>" +
        "</ul>",
    }),
  );
  slide("Equation", s3);

  // ---- Slide 4: code -----------------------------------------------------
  const s4: string[] = [];
  s4.push(
    add({
      ...withBase({ x: 120, y: 70, width: 1100, height: 80 }, 0),
      type: "heading",
      text: "Compute & plot",
      level: 2,
    }),
  );
  s4.push(
    add({
      ...withBase({ x: 120, y: 190, width: 880, height: 580 }, 1),
      type: "code",
      language: "python",
      source: PLOT_CODE,
    }),
  );
  s4.push(
    add({
      ...withBase({ x: 1040, y: 210, width: 440, height: 460 }, 2),
      type: "text",
      html:
        "<p>Run this cell to generate the displacement curve.</p>" +
        "<p>Praxis executes the code in an isolated sandbox and returns the figure as an <strong>artifact</strong> you can drop straight onto a slide.</p>",
    }),
  );
  slide("Code", s4);

  // ---- Slide 5: artifact -------------------------------------------------
  const plotAssetId = "asset_seed_plot";
  assets[plotAssetId] = {
    id: plotAssetId,
    kind: "artifact",
    mimeType: "image/svg+xml",
    dataUrl: harmonicPlotDataUrl(),
    filename: "harmonic.svg",
    width: 800,
    height: 420,
    createdAt: T0,
  };
  const s5: string[] = [];
  s5.push(
    add({
      ...withBase({ x: 120, y: 70, width: 1100, height: 80 }, 0),
      type: "heading",
      text: "Generated evidence",
      level: 2,
    }),
  );
  s5.push(
    add({
      ...withBase({ x: 300, y: 190, width: 1000, height: 560 }, 1),
      type: "artifact",
      artifactId: "art_seed_plot",
      artifactType: "image",
      mimeType: "image/svg+xml",
      assetId: plotAssetId,
      caption: "Displacement x(t) over two periods.",
    }),
  );
  slide("Result", s5);

  // ---- Slide 6: reference ------------------------------------------------
  const citationId = "cite_seed_feynman";
  citations[citationId] = {
    id: citationId,
    key: "feynman1963",
    title: "The Feynman Lectures on Physics, Vol. I (Ch. 21–23)",
    authors: ["R. P. Feynman", "R. B. Leighton", "M. Sands"],
    year: 1963,
    source: "Addison-Wesley",
    url: "https://www.feynmanlectures.caltech.edu/I_21.html",
  };
  const s6: string[] = [];
  s6.push(
    add({
      ...withBase({ x: 120, y: 90, width: 1100, height: 90 }, 0),
      type: "heading",
      text: "Reference",
      level: 2,
    }),
  );
  s6.push(
    add({
      ...withBase({ x: 120, y: 240, width: 1360, height: 200 }, 1),
      type: "citation",
      citationId,
      style: "full",
    }),
  );
  s6.push(
    add({
      ...withBase({ x: 120, y: 480, width: 1360, height: 200 }, 2),
      type: "text",
      html:
        "<p>The harmonic oscillator is the canonical worked example in classical mechanics — the same mathematics reappears across acoustics, circuits, and quantum systems.</p>",
    }),
  );
  slide("Reference", s6);

  // ---- Slide 7: summary --------------------------------------------------
  const s7: string[] = [];
  s7.push(
    add({
      ...withBase({ x: 120, y: 110, width: 1100, height: 130 }, 0),
      type: "heading",
      text: "Summary",
      level: 1,
    }),
  );
  s7.push(
    add({
      ...withBase({ x: 120, y: 280, width: 1360, height: 480 }, 1),
      type: "text",
      html:
        "<ul>" +
        "<li>Harmonic motion is described by <strong>x(t) = A cos(ωt + φ)</strong>.</li>" +
        "<li>Praxis keeps the equation, the code, and the generated figure in one document.</li>" +
        "<li>Computation runs in an isolated execution service and returns reproducible artifacts.</li>" +
        "<li>The underlying model is object-centric — slides are just one projection of it.</li>" +
        "</ul>",
    }),
  );
  slide("Summary", s7);

  return {
    schemaVersion: SCHEMA_VERSION,
    id: opts.freshId ? ID.document() : DOC_ID,
    title: "Modeling Harmonic Motion",
    createdAt: T0,
    updatedAt: T0,
    metadata: {
      author: "Kavana Labs",
      description: "A worked example of harmonic motion in Praxis.",
      tags: ["physics", "example", "harmonic-motion"],
    },
    theme: createTheme(),
    slides,
    objects,
    assets,
    citations,
  };
}

export const SEED_DOCUMENT_ID = DOC_ID;
