# MatchFuel as an AI Agent

Companion documentation for the university course *AI Agents for Automation of Data Science Processes*. This folder reframes the **MatchFuel** football performance optimizer (built in a separate Software Engineering course) as an **agent** that automates the data-science workflow a sports nutritionist would otherwise perform by hand.

The frontend code under analysis lives at `../MatchFuel/`. This package adds no new code to MatchFuel — it analyzes, documents, and supplies replay data for it.

## Layout

```
AI_Agent_Project/
├── README.md                  ← this file
├── documentation/
│   ├── 1_introduction.md      ← project context, agent definition, scope
│   ├── 2_theory.md            ← observe-decide-act loop, module → role mapping
│   ├── 3_example.md           ← end-to-end trace of one plan generation
│   └── 4_experiments.md       ← ablation protocol over the 10-player cohort
└── data/
    └── sample_players.json    ← 10 realistic profiles + multi-match histories
```

## The agent in one paragraph

Each match-day, MatchFuel **observes** the player's body state, sleep, last 3 trainings, dietary preferences and previous evening's meal (sensors = HTML form + `localStorage`). It **decides** the day's energy target, macro split, meal composition, hydration schedule, warm-up sequence and post-match recovery (reasoning = a pipeline of pure-functional modules: `energy.js`, `nutrition.js`, `mealPlanner.js`, `hydration.js`, `warmup.js`, `recovery.js`, `bodyFat.js`). It **acts** by rendering a personalized timeline, energy chart and exercise card to the DOM. After the match it **learns** from a four-question feedback form, producing three correction multipliers (`energyMultiplier`, `carbMultiplier`, `portionMultiplier`) that bias the next plan. This closes the loop and makes it a *simple learning agent* in the Russell–Norvig sense.

## How to read the documentation

- **`1_introduction.md`** — start here for the why. Explains how the existing codebase maps onto the agent paradigm and why this domain is worth automating.
- **`2_theory.md`** — formal definition of the four-phase loop, with each MatchFuel module placed in its agent role.
- **`3_example.md`** — a code-level walkthrough of one plan generation (player Mateo Vidović from `sample_players.json`), showing every number that flows through every module.
- **`4_experiments.md`** — ablation experiments that isolate each adaptive feature: recency decay, diet pools, injury-aware warmup, season-scaled hydration, and the correction-multiplier learning loop.

## Replaying the cohort

`data/sample_players.json` is shaped exactly like MatchFuel's `localStorage` profile entries (`fnwo_profiles → {[name]: {fields, history}}`), so it can be loaded directly into a running MatchFuel instance. Each profile has 1–5 prior matches with realistic feedback and the corrections that were stored — sufficient to replay the learning loop forward and verify the agent's behavior over time.

The cohort is designed for ablation:

- Profiles 01, 02, 09 share physical attributes but vary on **sleep** and **load**
- Profiles 03 and 07 differ on **diet + injury**
- Profile 03 isolates the **injury-aware warmup**
- Profile 08 stresses the **hot-season hydration** path
- Profile 10 is the only **late-evening (20:00) match**, exclusively triggering the lunch path

See `4_experiments.md` §4.1 for the full design table and §4.2–§4.7 for six concrete experiments with hypotheses and measurement protocols.
