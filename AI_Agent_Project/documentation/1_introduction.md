# 1. Introduction — MatchFuel as an AI Agent

## 1.1 Project context

This project takes **MatchFuel**, an existing client-side web application for football performance optimization, and reframes it as an **AI agent** for the automation of data science processes. The application was built as part of a separate Software Engineering course; here we analyze the same codebase through the lens of agent-based AI.

MatchFuel automates a workflow that traditionally requires a human expert: a sports nutritionist or strength coach who, given a player's current state, training load, sleep, dietary constraints and recent performance, designs a personalized match-day plan covering meals, hydration, warm-up exercises and post-match recovery.

The original codebase is organized as a set of pure-functional modules (no framework, no backend) that each handle one slice of the decision: `energy.js`, `nutrition.js`, `hydration.js`, `mealPlanner.js`, `warmup.js`, `recovery.js`, `feedback.js`, `bodyFat.js`, `foodMatcher.js`. A thin UI layer (`ui.js`, `index.html`) collects inputs and renders the result. Profile management and history live in `profiles.js` with `localStorage` as the persistence layer.

## 1.2 Why this is an AI agent

Russell and Norvig define an agent as *anything that can be viewed as perceiving its environment through sensors and acting upon that environment through actuators*. MatchFuel fits this description directly:

| Agent component       | MatchFuel realization                                                              |
|-----------------------|-------------------------------------------------------------------------------------|
| Sensors               | HTML form inputs (weight, sleep, sessions, foods, injuries) + `localStorage` history |
| Environment           | The player's body and daily schedule (training, meals, match)                       |
| Actuators             | Rendered timeline plan, energy chart, warm-up list, recovery card                   |
| Performance measure   | Post-match feedback score (0–100) computed from four self-reported signals          |
| Learning mechanism    | Correction multipliers (`energyMultiplier`, `carbMultiplier`, `portionMultiplier`)  |

The agent runs a clean **observe → decide → act** loop on each match-day plan generation, and a slower **observe → learn** loop after each match closes via the post-match feedback form. Results from the second loop bias the first loop's decisions on the next iteration, making this a **simple learning agent** in the Russell–Norvig taxonomy.

## 1.3 Why automation matters in this domain

Sports nutrition and warm-up planning is normally a manual, expensive process:

- A nutritionist costs €50–€150 per consultation; recreational players rarely book one
- Personal recommendations require recomputation every time training load, season, or diet changes
- Recovery from an injury or illness invalidates a generic plan; bespoke adjustments need expert reasoning
- Meaningful feedback loops (did yesterday's plan actually work?) are almost never closed in practice

Automating this workflow is a non-trivial data science problem because the decision is **multi-modal** (numeric load + categorical diet + textual injuries + temporal scheduling) and **conditional on history** (last match's outcome should influence today's plan). It is precisely the kind of structured-decision task where a deterministic agent with a learned correction layer outperforms either a static formula or a fully hand-tuned plan.

## 1.4 Scope of this document

The remainder of this documentation is organized as follows:

- **`2_theory.md`** — formal definition of the observe–decide–act paradigm and how each module of MatchFuel maps onto it, including the adaptive feedback loop.
- **`3_example.md`** — step-by-step trace of a single plan generation using a real sample player, with code references showing where each step happens in the codebase.
- **`4_experiments.md`** — proposed and partially-conducted experiments using the 10-player synthetic cohort in `data/sample_players.json` to evaluate the agent's behavior with and without each major adaptive feature.

The accompanying `data/sample_players.json` file contains 10 realistic player profiles, each with multi-match feedback history, suitable for replaying through the agent and measuring its behavior over time.
