# MatchFuel — Football Performance Optimizer

A client-side web application that generates personalized match-day plans for amateur football players. After every match the plan adapts to a four-question feedback form, making the application a small advisory **learning agent** rather than a static calculator.

> 🌐 **Live demo:** **[erik-sam.github.io/MatchFuel](https://erik-sam.github.io/MatchFuel/)**

---

## What it does

Given a few inputs from the player — weight, sleep, last three trainings, dietary preference, evening meal, season, optional injuries — MatchFuel produces a complete day-of-match plan covering:

- **Nutrition** — energy needs, macro split, meal composition (breakfast / optional lunch / pre-match)
- **Hydration** — daily water target with reminders scheduled across the day
- **Warm-up** — exercises filtered by injury zone and intensity (full / light)
- **Recovery** — post-match meal (0.3 g/kg protein + 1 g/kg carbs in the first 30 min) plus cooldown work

The four-question post-match feedback (physical score, leg fatigue, meal too heavy, lasted full match) drives three correction multipliers (energy, carbs, portion) bounded to ±30 %, which bias the next plan. The cycle closes through `localStorage`, which serves as the agent's per-profile memory.

---

## How to run locally

There is **no build step, no `npm install`, no backend.** The application is pure static files.

### Option A — open the file directly

Double-click **`index.html`** in the project root. It redirects automatically to `MatchFuel/index.html`. Some browsers block ES module imports under the `file://` scheme, in which case use Option B.

### Option B — local static server (recommended)

```bash
# with Python (any 3.x)
python -m http.server 8000

# or with Node
npx serve

# then open
http://localhost:8000/
```

Both serve the redirect page at the root, which lands on the application.

### Option C — just use the live demo

Visit **[erik-sam.github.io/MatchFuel](https://erik-sam.github.io/MatchFuel/)** — no installation needed, runs entirely in the browser.

---

## Project structure

```
Software Project/
├── index.html                  redirect to MatchFuel/
├── README.md                   this file
│
├── MatchFuel/                  application source
│   ├── index.html                main page; loads ui.js
│   ├── style.css                 stylesheet (modal, feedback, recovery, PRO)
│   ├── ui.js                     entry point — DOM glue
│   ├── mealPlanner.js            orchestrator — generateDayPlan
│   ├── nutrition.js              foodDatabase + calculateMacros
│   ├── foodMatcher.js            Levenshtein + BG/EN aliases
│   ├── energy.js                 kcal with recency-weighted load
│   ├── energyChart.js            Chart.js renderer
│   ├── warmup.js                 exercises with injury filter
│   ├── feedback.js               adaptive correction rules
│   ├── bodyFat.js                Deurenberg formula
│   ├── hydration.js              water + reminders
│   ├── recovery.js               post-match plan
│   └── profiles.js               localStorage layer
│
├── data/
│   └── sample_players.json     10 profiles with 33 history entries
│
├── docs/                       course deliverables
│   ├── PROJECT_REPORT.docx       full course report (8 sections)
│   ├── PROJECT_PRESENTATION.pptx 20-slide course presentation
│   ├── SPEAKER_NOTES.md          speaker notes for the presentation
│   └── PROJECT_SUMMARY.md        developer-facing summary of the codebase
│
└── scripts/                    build pipeline (regenerate deliverables)
    ├── build_report.ps1          rebuild PROJECT_REPORT.docx
    ├── build_slides.ps1          rebuild PROJECT_PRESENTATION.pptx
    └── extract_notes.ps1         move speaker notes pptx → md
```

---

## Technologies used

| Layer | Technology | Notes |
|---|---|---|
| Markup | HTML5 | One entry point, semantic sections, mobile-friendly viewport |
| Styling | CSS3 | Hand-written, no framework, max-width 800 px responsive |
| Logic | JavaScript ES2020+ | All files are ES modules (`type="module"`) — implicit strict mode, browser-native imports |
| Charts | [Chart.js](https://www.chartjs.org/) v4 | Loaded from CDN; only external runtime dependency |
| Storage | Web Storage API (`localStorage`) | Multi-profile layer, sliding 10-match history window per profile |
| Fonts | Google Fonts (Bebas Neue, Inter) | Loaded via stylesheet link |
| Tooling | VS Code · Chrome DevTools · Git | No transpiler, no bundler, no `node_modules/` |

### Architecture highlights

- **13 source files**, ~3,200 lines of JavaScript
- **Pure functions**, no global mutable state — every module is independently testable
- **`ui.js` is the only file that touches the DOM**; `mealPlanner.js` is the orchestrator
- **Four documented algorithms**: exponential decay (fatigue), Deurenberg (body fat), Levenshtein (fuzzy food matching), rule-based correction (adaptive learning)
- **Russell-Norvig agent loop** — Observe → Decide → Act → Learn — closed via `localStorage`

---

## Author

**Erik Samodivkin** — Software Project course, Otto-von-Guericke-Universität Magdeburg, May 2026.

The accompanying [`docs/PROJECT_REPORT.docx`](docs/PROJECT_REPORT.docx) covers the full 8-section academic report; [`docs/PROJECT_PRESENTATION.pptx`](docs/PROJECT_PRESENTATION.pptx) is the slide deck.
