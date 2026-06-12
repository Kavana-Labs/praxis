import type { PraxisDocument } from "@/domain/types";
import { createHarmonicMotionDeck } from "@/seed/harmonic-motion";
import { buildTemplateDocument, t } from "./builder";
import thesisCover from "@/assets/templates/thesis-defense.jpg";
import researchCover from "@/assets/templates/scientific-research.jpg";
import engineeringCover from "@/assets/templates/engineering-project.jpg";
import compsciCover from "@/assets/templates/computer-science.jpg";

/**
 * The template library: real starter decks, each a full Praxis document
 * factory. Covers and copy follow the Platform Figma dashboard design.
 */

export type TemplateCategory =
  | "science"
  | "technology"
  | "mathematics"
  | "academia";

export const TEMPLATE_CATEGORIES: {
  id: TemplateCategory;
  label: string;
}[] = [
  { id: "science", label: "Science" },
  { id: "technology", label: "Technology" },
  { id: "mathematics", label: "Mathematics" },
  { id: "academia", label: "Academia" },
];

export type PresentationTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  categoryLabel: string;
  /** Cover image; null renders the brand-gradient cover. */
  cover: string | null;
  /** Gradient behind/instead of the cover (CSS background). */
  coverBackground: string;
  build: () => PraxisDocument;
};

const FULL = { x: 120, y: 0, width: 1360, height: 0 };
void FULL;

function thesisDefense(): PraxisDocument {
  return buildTemplateDocument("Thesis Defense", [
    {
      title: "Title",
      notes: "Introduce yourself, your program, and your committee.",
      objects: [
        t.heading({ x: 160, y: 280, width: 1280, height: 140 }, "Thesis Title Goes Here", 1, "center"),
        t.divider({ x: 560, y: 450, width: 480, height: 24 }),
        t.text(
          { x: 360, y: 500, width: 880, height: 120 },
          "<p>Your Name · Department · Institution</p><p>Committee: Prof. A — Prof. B — Prof. C</p>",
          "center",
        ),
      ],
    },
    {
      title: "Outline",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Outline", 1),
        t.text(
          { x: 120, y: 240, width: 920, height: 480 },
          "<ul><li>Motivation and research question</li><li>Background and related work</li><li>Methodology</li><li>Key results</li><li>Conclusions and future work</li></ul>",
        ),
      ],
    },
    {
      title: "Research Question",
      notes: "One slide, one question. Everything that follows answers it.",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Research Question", 1),
        t.rect({ x: 200, y: 300, width: 1200, height: 260 }, { fill: "#f2eeff", radius: 16 }),
        t.text(
          { x: 260, y: 360, width: 1080, height: 140 },
          "<p><strong>State the central question your thesis answers — in one sentence.</strong></p>",
          "center",
        ),
      ],
    },
    {
      title: "Methodology",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Methodology", 1),
        t.text(
          { x: 120, y: 240, width: 640, height: 420 },
          "<ul><li>Study design and data sources</li><li>Procedure and controls</li><li>Analysis approach</li></ul>",
        ),
        t.math({ x: 840, y: 300, width: 620, height: 220 }, "\\hat{\\theta} = \\arg\\max_{\\theta}\\; \\mathcal{L}(\\theta \\mid x_{1:n})"),
      ],
    },
    {
      title: "Key Result",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Key Result", 1),
        t.text(
          { x: 120, y: 240, width: 700, height: 380 },
          "<p>Summarize the single most important finding here, then support it with the figure or computation on the right.</p>",
        ),
        t.code(
          { x: 860, y: 220, width: 620, height: 460 },
          'import numpy as np\n\n# Reproduce your key figure here.\nresults = np.random.default_rng(7).normal(size=200)\nprint(f"effect size: {results.mean():.3f} ± {results.std():.3f}")\n',
        ),
      ],
    },
    {
      title: "Conclusions",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Conclusions & Future Work", 1),
        t.text(
          { x: 120, y: 240, width: 1200, height: 420 },
          "<ul><li>Answer to the research question</li><li>Contributions and limitations</li><li>Concrete next steps</li></ul><p></p><p><em>Thank you — questions welcome.</em></p>",
        ),
      ],
    },
  ]);
}

function scientificResearch(): PraxisDocument {
  return buildTemplateDocument("Scientific Research", [
    {
      title: "Title",
      objects: [
        t.heading({ x: 160, y: 300, width: 1280, height: 140 }, "Study Title", 1, "center"),
        t.text(
          { x: 360, y: 470, width: 880, height: 100 },
          "<p>Authors · Affiliation · Date</p>",
          "center",
        ),
      ],
    },
    {
      title: "Hypothesis",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Hypothesis", 1),
        t.rect({ x: 200, y: 280, width: 1200, height: 220 }, { fill: "#f0fdf4", stroke: "#94dfad", strokeWidth: 2, radius: 16 }),
        t.text(
          { x: 260, y: 330, width: 1080, height: 120 },
          "<p><strong>H₁:</strong> State the testable prediction, with the expected direction of effect.</p>",
          "center",
        ),
      ],
    },
    {
      title: "Experimental Setup",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Experimental Setup", 1),
        t.text(
          { x: 120, y: 240, width: 660, height: 420 },
          "<ul><li>Apparatus and materials</li><li>Sample / participants</li><li>Variables and controls</li><li>Procedure</li></ul>",
        ),
        t.rect({ x: 860, y: 260, width: 600, height: 360 }, { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1.5, radius: 12 }),
        t.text(
          { x: 900, y: 400, width: 520, height: 80 },
          "<p><em>Drop a setup photo or diagram here.</em></p>",
          "center",
        ),
      ],
    },
    {
      title: "Analysis",
      notes: "Run the cell live, or paste your figures as images.",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Data Analysis", 1),
        t.code(
          { x: 120, y: 220, width: 800, height: 470 },
          'import numpy as np\nimport matplotlib.pyplot as plt\n\nrng = np.random.default_rng(42)\ncontrol = rng.normal(10.0, 1.2, 40)\ntreated = rng.normal(11.1, 1.2, 40)\n\nplt.figure(figsize=(7, 4))\nplt.boxplot([control, treated], labels=["control", "treated"])\nplt.ylabel("response")\nplt.tight_layout()\nplt.savefig("/workspace/output/comparison.png", dpi=120)\nprint(f"Δmean = {treated.mean() - control.mean():.2f}")\n',
        ),
        t.math({ x: 980, y: 320, width: 500, height: 200 }, "t = \\frac{\\bar{x}_1 - \\bar{x}_2}{s_p\\sqrt{\\tfrac{1}{n_1} + \\tfrac{1}{n_2}}}"),
      ],
    },
    {
      title: "Conclusions",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Conclusions", 1),
        t.text(
          { x: 120, y: 240, width: 1200, height: 380 },
          "<ul><li>Was the hypothesis supported?</li><li>Effect size and uncertainty</li><li>Threats to validity</li><li>What should be measured next</li></ul>",
        ),
      ],
    },
  ]);
}

function engineeringProject(): PraxisDocument {
  return buildTemplateDocument("Engineering Project", [
    {
      title: "Title",
      objects: [
        t.heading({ x: 160, y: 300, width: 1280, height: 140 }, "Project Name", 1, "center"),
        t.text(
          { x: 360, y: 470, width: 880, height: 100 },
          "<p>Team · Course / Client · Review date</p>",
          "center",
        ),
      ],
    },
    {
      title: "System Overview",
      notes: "Replace the blocks with your real architecture.",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "System Overview", 1),
        t.rect({ x: 160, y: 300, width: 320, height: 160 }, { fill: "#eef2ff", stroke: "#652ff3", strokeWidth: 2, radius: 12 }),
        t.text({ x: 180, y: 350, width: 280, height: 60 }, "<p><strong>Sensing</strong></p>", "center"),
        t.rect({ x: 640, y: 300, width: 320, height: 160 }, { fill: "#eef2ff", stroke: "#652ff3", strokeWidth: 2, radius: 12 }),
        t.text({ x: 660, y: 350, width: 280, height: 60 }, "<p><strong>Control</strong></p>", "center"),
        t.rect({ x: 1120, y: 300, width: 320, height: 160 }, { fill: "#eef2ff", stroke: "#652ff3", strokeWidth: 2, radius: 12 }),
        t.text({ x: 1140, y: 350, width: 280, height: 60 }, "<p><strong>Actuation</strong></p>", "center"),
        t.divider({ x: 480, y: 368, width: 160, height: 24, }, "#9d87fb"),
        t.divider({ x: 960, y: 368, width: 160, height: 24 }, "#9d87fb"),
      ],
    },
    {
      title: "Requirements",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Requirements", 1),
        t.text(
          { x: 120, y: 240, width: 1240, height: 420 },
          "<ol><li><strong>R1</strong> — Functional requirement with measurable target</li><li><strong>R2</strong> — Performance requirement (latency, throughput, accuracy)</li><li><strong>R3</strong> — Safety / compliance constraint</li><li><strong>R4</strong> — Cost and power budget</li></ol>",
        ),
      ],
    },
    {
      title: "Design Constraints",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Design Constraints", 1),
        t.text(
          { x: 120, y: 240, width: 660, height: 380 },
          "<p>Derive the governing constraint and show the margin against the requirement.</p>",
        ),
        t.math({ x: 840, y: 280, width: 620, height: 240 }, "P_{\\text{dissipated}} = I^2 R \\le P_{\\text{budget}}"),
      ],
    },
    {
      title: "Verification",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Test Plan & Results", 1),
        t.code(
          { x: 120, y: 220, width: 820, height: 460 },
          'import numpy as np\n\n# Verification harness sketch: compare measured vs required.\nrequirement = 0.95\nmeasured = np.array([0.97, 0.96, 0.98, 0.95, 0.97])\nmargin = measured.mean() - requirement\nprint(f"pass: {bool(margin >= 0)}, margin = {margin:.3f}")\n',
        ),
        t.text(
          { x: 1000, y: 260, width: 480, height: 380 },
          "<ul><li>Unit tests per subsystem</li><li>Integration test matrix</li><li>Acceptance criteria sign-off</li></ul>",
        ),
      ],
    },
  ]);
}

function computerScience(): PraxisDocument {
  return buildTemplateDocument("Computer Science", [
    {
      title: "Title",
      objects: [
        t.heading({ x: 160, y: 300, width: 1280, height: 140 }, "Algorithm / Systems Talk", 1, "center"),
        t.text(
          { x: 360, y: 470, width: 880, height: 100 },
          "<p>Author · Seminar · Date</p>",
          "center",
        ),
      ],
    },
    {
      title: "Problem",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Problem Statement", 1),
        t.text(
          { x: 120, y: 240, width: 1240, height: 300 },
          "<p>Define the input, the output, and what makes the problem hard.</p><ul><li>Input: …</li><li>Output: …</li><li>Why naïve approaches fail: …</li></ul>",
        ),
      ],
    },
    {
      title: "Approach",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Approach", 1),
        t.code(
          { x: 120, y: 220, width: 820, height: 470 },
          'def solve(items):\n    """Sketch the core idea in runnable pseudocode."""\n    best = None\n    for candidate in items:\n        if best is None or candidate < best:\n            best = candidate\n    return best\n\nprint(solve([5, 2, 8, 1]))\n',
        ),
        t.math({ x: 1000, y: 320, width: 480, height: 200 }, "T(n) = 2\\,T(n/2) + \\mathcal{O}(n) \\Rightarrow \\mathcal{O}(n \\log n)"),
      ],
    },
    {
      title: "Evaluation",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Evaluation", 1),
        t.code(
          { x: 120, y: 220, width: 820, height: 460 },
          'import numpy as np\nimport matplotlib.pyplot as plt\n\nn = np.logspace(1, 6, 30)\nplt.figure(figsize=(7, 4))\nplt.loglog(n, n * np.log2(n), label="n log n")\nplt.loglog(n, n ** 2, label="n^2", linestyle="--")\nplt.legend(); plt.xlabel("n"); plt.ylabel("operations")\nplt.tight_layout()\nplt.savefig("/workspace/output/complexity.png", dpi=120)\nprint("saved complexity.png")\n',
        ),
        t.text(
          { x: 1000, y: 260, width: 480, height: 380 },
          "<ul><li>Datasets and baselines</li><li>Wall-clock vs asymptotic</li><li>Where it breaks down</li></ul>",
        ),
      ],
    },
    {
      title: "Takeaways",
      objects: [
        t.heading({ x: 120, y: 72, width: 1360, height: 110 }, "Takeaways", 1),
        t.text(
          { x: 120, y: 240, width: 1240, height: 320 },
          "<ul><li>One-sentence core idea</li><li>When to use it — and when not to</li><li>Open questions</li></ul>",
        ),
      ],
    },
  ]);
}

export const PRESENTATION_TEMPLATES: PresentationTemplate[] = [
  {
    id: "thesis-defense",
    name: "Thesis Defense",
    description: "Professional template for thesis and dissertation defense",
    category: "academia",
    categoryLabel: "Academia",
    cover: thesisCover,
    coverBackground:
      "linear-gradient(225deg, #ff9575 12.44%, #eb3700 87.56%)",
    build: thesisDefense,
  },
  {
    id: "scientific-research",
    name: "Scientific Research",
    description: "Professional template for a scientific research study",
    category: "science",
    categoryLabel: "Science",
    cover: researchCover,
    coverBackground:
      "linear-gradient(225deg, #46d878 12.44%, #02b33e 87.56%)",
    build: scientificResearch,
  },
  {
    id: "engineering-project",
    name: "Engineering Project",
    description: "Technical diagrams, circuits, and system design",
    category: "technology",
    categoryLabel: "Engineering",
    cover: engineeringCover,
    coverBackground: "#9ca3af",
    build: engineeringProject,
  },
  {
    id: "computer-science",
    name: "Computer Science",
    description: "Professional template for the code simulations",
    category: "technology",
    categoryLabel: "CompSci",
    cover: compsciCover,
    coverBackground: "#9ca3af",
    build: computerScience,
  },
  {
    id: "harmonic-motion",
    name: "Modeling Harmonic Motion",
    description: "Equations, runnable Python, and a generated plot",
    category: "mathematics",
    categoryLabel: "Mathematics",
    cover: null,
    coverBackground:
      "linear-gradient(225deg, #9d87fb 12.44%, #5b16e1 87.56%)",
    build: () => createHarmonicMotionDeck({ freshId: true }),
  },
];
