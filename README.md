# Praxis

**Praxis** is a next-generation scientific presentation platform built for scientists, engineers, educators, and researchers.

Unlike traditional slide tools, Praxis is **LaTeX-native**, **code-aware**, and **simulation-ready**, enabling users to create interactive, research-grade presentations without sacrificing rigor or clarity.

> Praxis is built for how science actually works.

---

## ✨ Key Features

- Native LaTeX mathematics (inline & block)
- Interactive code execution (Python, simulations, plots)
- Research-grade templates (lectures, theses, conferences)
- Real-time collaboration
- Deterministic exports (PDF, HTML, web embeds)
- Academic-first design system

---

## 🎯 Target Users

- Scientists & researchers
- Engineers & technical professionals
- University lecturers & educators
- STEM students
- Data scientists & ML engineers

---

## 🏗️ Project Status

Praxis is under **active development**.

Current focus:
- Core editor
- LaTeX rendering engine
- Interactive blocks
- Export pipeline

---

## 🧠 Philosophy

Praxis treats presentations as **structured scientific documents**, not static slides.

Equations are not images.  
Simulations are not screenshots.  
Science is not bullet points.

---

## 🧩 Tech Stack (High Level)

- **Frontend:** React + TypeScript
- **Editor Engine:** Block-based document model
- **Rendering:** KaTeX / MathJax
- **State & Sync:** Supabase
- **Visualization:** D3, WebGL, Canvas
- **Backend:** Node.js
- **Auth:** OAuth + Email
- **Hosting:** Cloud-native

---

## 🧪 Getting Started (Development)

```bash
git clone https://github.com/kavanalabs/praxis.git
cd praxis
npm install
npm run dev
```

---

## 🤝 Contributing

We welcome thoughtful contributions.

Please read `docs/contributing.md` before submitting a pull request.

---

## 🏢 Ownership & Branding

Praxis™ is a product of **Kavana Labs**.  
Built for STEM.

© 2025 Kavana Labs. All rights reserved.
---

# 🧠 docs/architecture.md

```markdown
# Praxis Architecture

## Overview

Praxis is built as a **scientific document engine** with presentation as one of several output modes.

At its core is a **block-based document model** that understands mathematical, computational, and visual semantics.

---

## High-Level Architecture
User Interface
↓
Document Editor (Blocks)
↓
Execution & Rendering Layer
↓
Export Pipelines (PDF / HTML / Web)
---

## Core Components

### 1. Editor UI
- React-based interface
- Slide navigation
- Block insertion & manipulation
- Collaboration cursors & comments

---

### 2. Document Model (AST)
Each document consists of ordered blocks:

- TextBlock
- EquationBlock (LaTeX)
- CodeBlock (Python, etc.)
- PlotBlock
- SimulationBlock
- MediaBlock

This enables deterministic rendering and reproducibility.

---

### 3. Execution Engine
- Executes code blocks in a sandboxed environment
- Produces plots, animations, and outputs
- Manages execution state & dependencies

---

### 4. Rendering Layer
- KaTeX / MathJax for equations
- Canvas/WebGL for visuals
- HTML/CSS for layout

---

### 5. Export System
- PDF (vector-perfect)
- HTML (interactive)
- Web embeds
- Offline archives

---

## Design Principles

- Determinism over magic
- Semantic blocks over freeform canvases
- Reproducibility first
- Accessibility by default

---

## Future Extensions

- Versioned document snapshots
- Git-backed projects
- Plugin ecosystem
- LMS integrations