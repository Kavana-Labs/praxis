import type { CSSProperties } from "react";

const features = [
  {
    title: "LaTeX-native math",
    description: "Inline and block equations rendered with deterministic output.",
  },
  {
    title: "Code-aware blocks",
    description: "Run, inspect, and export computations alongside the narrative.",
  },
  {
    title: "Simulation-ready",
    description: "Visualize models and time-based systems inside the document.",
  },
  {
    title: "Research templates",
    description: "Lecture, thesis, and conference structures built for rigor.",
  },
  {
    title: "Collaboration",
    description: "Real-time editing with comments and scientific context.",
  },
  {
    title: "Deterministic exports",
    description: "PDF, HTML, and embeds that reproduce every time.",
  },
];

const roadmapFocus = [
  "Core editor",
  "LaTeX rendering engine",
  "Interactive blocks",
  "Export pipeline",
];

const architectureFlow = [
  "User interface",
  "Block-based editor",
  "Execution and rendering",
  "Export pipelines",
];

const blockTypes = [
  "TextBlock",
  "EquationBlock",
  "CodeBlock",
  "PlotBlock",
  "SimulationBlock",
  "MediaBlock",
];

function App() {
  return (
    <div className="app">
      <header className="hero" id="top">
        <nav className="nav">
          <div className="logo">Praxis</div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#architecture">Architecture</a>
            <a href="#roadmap">Roadmap</a>
          </div>
        </nav>

        <div className="hero-content">
          <div className="eyebrow">Scientific presentation platform</div>
          <h1>Present science as science.</h1>
          <p>
            Praxis is LaTeX-native, code-aware, and simulation-ready so researchers
            can communicate complex work without losing rigor or clarity.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#roadmap">
              View roadmap
            </a>
            <a className="button ghost" href="#features">
              Explore features
            </a>
          </div>
          <div className="hero-meta">
            <span>Deterministic exports</span>
            <span>Real-time collaboration</span>
            <span>Academic-first design</span>
          </div>
        </div>
      </header>

      <main>
        <section className="section" id="features">
          <div className="section-header">
            <h2>Core capabilities</h2>
            <p>Everything needed to build research-grade presentations.</p>
          </div>
          <div className="card-grid">
            {features.map((feature, index) => (
              <article
                className="card"
                key={feature.title}
                style={{
                  "--delay": `${index * 120}ms`,
                } as CSSProperties}
              >
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="architecture">
          <div className="section-header">
            <h2>Architecture at a glance</h2>
            <p>
              Documents are structured as semantic blocks so exports remain
              reproducible and accessible.
            </p>
          </div>
          <div className="flow">
            {architectureFlow.map((item, index) => (
              <div className="flow-item" key={item}>
                <span className="flow-index">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="pill-row">
            {blockTypes.map((block) => (
              <span className="pill" key={block}>
                {block}
              </span>
            ))}
          </div>
        </section>

        <section className="section split" id="roadmap">
          <div>
            <div className="section-header">
              <h2>Current focus</h2>
              <p>Phase 1 centers on the editor, LaTeX, and export quality.</p>
            </div>
            <ul className="focus-list">
              {roadmapFocus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <aside className="aside-card">
            <h3>Project status</h3>
            <p>
              Active development for scientists, engineers, educators, and
              researchers.
            </p>
            <div className="aside-meta">
              <div>
                <span className="label">Rendering</span>
                <span>KaTeX / MathJax</span>
              </div>
              <div>
                <span className="label">State</span>
                <span>Supabase sync</span>
              </div>
              <div>
                <span className="label">Exports</span>
                <span>PDF, HTML, embeds</span>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="footer">
        <div>Praxis by Kavana Labs</div>
        <div>Built for STEM</div>
      </footer>
    </div>
  );
}

export default App;
