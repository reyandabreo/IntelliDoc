# 📄 IntelliDoc Engine v1.0

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini_Flash-purple?logo=google-gemini)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)

**IntelliDoc Engine** is a high-fidelity, AI-powered document generation platform. It transforms unstructured natural language and raw technical data into production-ready, professionally formatted documents across 7+ industry-standard formats.

---

## 🚀 Key Features

- **🧠 Dual Intelligence Modes**:
  - **Content Mode**: Structural re-engineering of raw text, CSVs, or unformatted reports into systematic documents.
  - **Prompt Mode**: High-level synthesis from research queries using expert domain personas.
- **📊 Rich Element Support**: Automatically generates **Tables**, **Mermaid Diagrams** (Flowcharts, Sequence, Gantt), **Contextual Highlights**, and nested hierarchies.
- **☁️ Multi-Format Export Ecosystem**: 1-click professional export for:
  - **PDF**: Optimized for small file size with high-DPI vector diagrams.
  - **Word (DOCX)**: Fully editable, semantic structure with orphan protection.
  - **Excel (XLSX)**: Forensic reports with data gutters, center-aligned master sheets, and zebra-striped datasets.
  - **PowerPoint (PPTX)**: Slide-based visual storytelling with responsive layout logic.
  - **Markdown/TXT/HTML**: Lightweight web-ready outputs.
- **🌓 Adaptive UI**: Sleek Light/Dark mode interface with a mobile-first, responsive presentation preview.
- **🔍 Forensic Precision**: Adopts a systematic "Forensic Investigator" tone for high-stakes business and technical reports.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **AI Integration**: [Google Gemini AI (@google/genai)](https://ai.google.dev/)
- **Animations**: [Motion (Framer)](https://motion.dev/)
- **Visuals**: [Mermaid.js](https://mermaid.js.org/) & [Lucide Icons](https://lucide.dev/)
- **Export Engines**:
  - `jspdf` (PDF)
  - `docx` (Word)
  - `pptxgenjs` (PowerPoint)
  - `xlsx-js-style` (Excel)
  - `canvas-confetti` (Engagement)

---

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/intellidoc-engine.git
   cd intellidoc-engine
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Launch Development Server**:
   ```bash
   npm run dev
   ```

---

## 📖 Usage Guide

### 1. Choose Your Input Mode
- **Content Mode (Default)**: Paste raw data. The engine acts as an architect, cleaning and structuring the data without losing 1% of semantic integrity.
- **Prompt Mode**: Type a request like *"Create a comprehensive solar energy market analysis report for 2024"*. The engine acts as a researcher.

### 2. Select Target Format
Choose your desired final export format (PDF, DOCX, etc.) from the dropdown. This guides the AI to optimize content hierarchy for that specific medium (e.g., Slide grouping for PPTX vs. Table-centric for Excel).

### 3. Review & Enhance
Use the **Live Preview** to inspect nodes, tables, and diagrams. Toggle Light/Dark mode to check visual contrast.

### 4. Download
Hit **DOWNLOAD [FORMAT]** to generate and save your high-fidelity file. Success is celebrated with a celebratory burst!

---

## 🖼️ User Interface
<p align="center">
  <i>The platform features a distraction-free, forensic-grade workspace.</i>
  <br><br>
  <img width="1705" height="938" alt="image" src="https://github.com/user-attachments/assets/783f2300-f2f2-46a7-8ebb-1dfec47fcd28" />
</p>

---

## 🎯 Why IntelliDoc?

Standard AI summaries often lose technical nuance. **IntelliDoc** is engineered to bridge the gap between "Generative AI" and "Formal Documentation":

1. **Semantic Locking**: Unlike generic summarizers, we use nested structures to ensure every technical sub-bullet is preserved.
2. **Format-Aware Rendering**: Each format isn't just a conversion; it's a **re-rendering**. PPTX gets slide logic, Excel gets data-master logic, and PDF gets vector logic.
3. **Forensic Tonality**: Perfect for legal tracers, engineering reports, and high-stakes executive summaries.

---

## 📂 Export Capabilities In-Depth

```text
├── src/
│   ├── components/       # UI Components (Mermaid, Layouts)
│   ├── lib/              # Core Utilities & High-Fidelity Exporters
│   │   ├── exporter.ts   # Multi-format export logic (PDF/DOCX/PPTX/Excel)
│   │   └── utils.ts      # Class merging and common logic
│   ├── services/         # API Integrations
│   │   └── gemini.ts     # AI prompt engineering & schema validation
│   ├── types.ts          # Centralized TypeScript definitions
│   └── App.tsx           # Main application entry and UI logic
├── public/               # Static assets
├── metadata.json         # Platform metadata
└── package.json          # Dependencies and scripts
```

---

## 🛡️ Security & Privacy

- **No Data Retention**: Documents are processed in-memory and in-transit via Google GenAI.
- **Credential Hygiene**: The AI is strictly prohibited from hardcoding credentials; it extracts contact info exclusively from provided input to prevent leaks.
- **Environment Safety**: API keys are managed server-side (in Cloud mode) or via `.env` files locally.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for High-Fidelity Knowledge Workers
</p>
