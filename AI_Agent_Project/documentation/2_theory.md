# 2. Theory — The Observe–Decide–Act Loop

## 2.1 Agent paradigm

Following Russell & Norvig (*Artificial Intelligence: A Modern Approach*, 4th ed., ch. 2), an **agent** is a function

```
f : P* → A
```

that maps a **percept history** `P*` to an **action** `A`. The agent operates inside an **environment** `E` whose state is partially observed through **sensors** and modified through **actuators**. A **rational agent** is one that, for every possible percept sequence, selects the action expected to maximize a **performance measure**.

A **simple learning agent** extends this with a fourth component: a **learning element** that uses feedback from past actions to modify the decision logic, so that the same percept sequence may produce different (better) actions over time.

MatchFuel implements exactly this architecture, structured as a four-phase loop:

```
       ┌─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 │
   OBSERVE  ──►  DECIDE  ──►  ACT  ──►  LEARN  ──────────┘
   (sensors)    (reasoning)  (actuators)  (feedback)
```

Each match-day pass executes Observe → Decide → Act. After the match, a slower **Learn** phase consumes the user's self-reported feedback and updates internal multipliers that bias the next iteration of Decide. This is the canonical *simple learning agent* pattern.

## 2.2 Phase 1 — Observe (sensing)

The agent's percept space is the union of two sources:

| Source                     | Channel                            | Sampling rate       |
|----------------------------|-----------------------------------|---------------------|
| Match-day form             | DOM input elements                | Per plan generation |
| Persistent profile + history | `localStorage` (via `profiles.js`) | Loaded on every cycle |

### 2.2.1 Direct percepts (form inputs)

Collected in `ui.js` at the moment the user clicks **Generate Plan**:

- **Body state**: `weight`, `height`, `age`, `gender`, `morningWeight`, `postMatchWeight`
- **Recovery state**: `sleep` (hours last night), `injuries` (free text)
- **Recent load**: up to three `{date, type, minutes}` training entries
- **Diet & schedule**: `diet` (regular/vegetarian/vegan/gluten_free), `season`, `wakeUpTime`, `matchTime`, `matchDuration`, `position`, `skipBreakfast`
- **Today's intake**: list of `{food, grams}` for the previous evening's meal

### 2.2.2 Persistent percepts (profile state)

Loaded by `profiles.js` from `localStorage` keys `fnwo_profiles` and `fnwo_active`. Each profile contains:

- `fields` — auto-saved player attributes (so the form refills on next visit)
- `history` — last 10 match records, each with the feedback and the corrections that were applied

This is the agent's **memory**. Without it, every match would be the agent's first match — there would be no learning signal at all.

## 2.3 Phase 2 — Decide (reasoning)

The decision phase is a deterministic pipeline. Each module owns one slice of the decision and exposes a pure function. There is no global mutable state inside the decide phase — all dependencies flow through arguments.

### 2.3.1 Module map

| Module             | Role                                      | Key function                         |
|--------------------|-------------------------------------------|--------------------------------------|
| `bodyFat.js`       | Estimate body composition (Deurenberg)    | `calculateBodyFat({weight,height,age,gender})` |
| `energy.js`        | Compute daily kcal target                 | `calculateEnergyNeeds(weight, sessions, sleep, opts)` |
| `nutrition.js`     | Food macro database & meal totals         | `calculateMacros(meal)`              |
| `foodMatcher.js`   | Fuzzy-match user input to canonical food  | `matchFood(userText)`                |
| `hydration.js`     | Daily water need + reminder schedule      | `calculateDailyWater`, `generateHydrationReminders` |
| `mealPlanner.js`   | Compose meals & assemble timeline         | `generateDayPlan(player, evening, matchTime, warmup)` |
| `warmup.js`        | Build warm-up sequence, filter by injury  | `generateWarmup(sessions, opts)`     |
| `recovery.js`      | Post-match meal + recovery exercises      | `generateRecoveryPlan(player)`       |
| `feedback.js`      | Post-match scoring + correction multipliers | `saveFeedback`, `getLatestCorrections` |

### 2.3.2 Energy reasoning (`energy.js`)

The base energy is a linear function of body mass scaled by three multipliers:

```
energy = weight × 30 × loadMul × sleepMul × positionMul
```

The interesting term is `loadMul`, which uses **recency-weighted training fatigue**:

```
recentLoad = Σᵢ minutesᵢ × typeFactorᵢ × exp(−daysAgoᵢ / 3)
loadMul    = 1 + recentLoad / 300
```

The half-life of 3 days is biologically motivated (≈ glycogen replenishment + DOMS resolution window). A training two days old contributes only `e^(−2/3) ≈ 0.51` of its raw minutes. This is a key piece of agent reasoning: the same percept ("I trained 60 minutes of cardio") produces a different decision depending on **when** it happened.

### 2.3.3 Macro reasoning (`mealPlanner.js`)

Once the energy target is set, macros are split 60/20/20 (carbs/protein/fat) and adjusted by `eveningAnalysis.carbAdjustment` from the previous night's meal:

- carbs `< 100g` → glycogen status **low** → +20% carbs today
- carbs `100–200g` → **normal** → no change
- carbs `> 200g` → **high** → −10% carbs today

Daily energy is then split between breakfast, optional lunch (when match ≥ 18:00), and pre-match meal. Each meal is built from the **diet pool** (`dietSources[diet]`) by `buildMealFromMacros`, which solves grams = (target macro / food macro density) × 100, clamped to realistic portion limits.

### 2.3.4 Warmup reasoning (`warmup.js`)

The warmup module reads `recentSessions` to choose an *intensity profile* and reads `injuries` (free text) to filter the exercise library:

1. `normalizeInjuries(text)` — fuzzy-match BG/EN tokens against canonical body zones (`knee`, `ankle`, `hamstring`, ...)
2. For each candidate exercise, drop it if it activates any injured zone (unless `intensity === "full"`, which overrides)
3. Bin remaining exercises by category (`mobility`, `activation`, `cardio`, `football`) and emit a sequence whose total duration ≈ `45 min`

### 2.3.5 Hydration reasoning (`hydration.js`)

Daily ml = `weight × 35 + matchBonus(600) + Σ trainingContrib × decay(d/2)`, all multiplied by `seasonFactor`. Note the *faster* decay (half-life 2 days vs 3 for energy): water balance equilibrates quicker than mycle damage. Reminders are spaced every 90 minutes from wake-up to match-end + 30, with 70% of the daily total allocated to the active window.

### 2.3.6 Why this is "decision making" and not just calculation

The decide phase is more than arithmetic because the module graph encodes *conditional* logic on agent state:

- The same weight + sleep produces different energy targets depending on **training recency**
- The same food list produces a different glycogen verdict depending on **carb total**
- The same exercise library produces a different warmup depending on **active injuries**
- The same energy target produces different meal timings depending on **match start time** (lunch path vs no-lunch path)

These conditionals are what make MatchFuel an agent rather than a calculator: the action chosen depends on the percept history, not just the latest input.

## 2.4 Phase 3 — Act (actuation)

The action space is the set of artifacts rendered into the DOM. The renderer is `ui.js → renderPlan()`, fed by `mealPlanner.js → generateDayPlan()`. The output of one cycle:

1. **Timeline** — chronologically sorted event list `{label, time, items, note}`, including dinner (previous day), breakfast or lunch, pre-match meal, hydration reminders every 90 min, warmup, kickoff, and post-match items.
2. **Energy chart** (`energyChart.js`) — Chart.js line plot showing predicted energy/glycogen curve with markers at meals, warmup, match start, full-time.
3. **Warmup card** — exercises with GIF previews, plus a "skipped" sub-list explaining what was excluded due to injury.
4. **Body fat scale** (`bodyFat.js`) — colored 5-segment bar with marker at the player's BF%.
5. **Recovery card** (`recovery.js`) — recovery meal + cool-down exercises shown after match completion.
6. **Hydration summary** — daily total + breakdown {base, training, match}.

The act phase has no side effects on the world beyond rendering. The agent does not order food, set timers, or message anyone — the player is the actuator that ultimately moves the player's body. This is appropriate for the domain (sports coaching) and matches the *advisory agent* pattern (Russell & Norvig §27.1).

## 2.5 Phase 4 — Learn (the slow loop)

The learning element runs *out of band* with respect to the decide loop. After the match, the user submits a feedback form with four signals:

| Signal             | Type    | Range            |
|--------------------|---------|------------------|
| `physicalScore`    | ordinal | 1 (worst) – 5 (best) |
| `legFatigue`       | boolean | yes / no         |
| `mealTooHeavy`     | boolean | yes / no         |
| `lastedFullMatch`  | boolean | yes / no         |

`feedback.js → calculateCorrections(feedback)` maps these signals onto three correction multipliers:

```
energyMultiplier  ∈ [0.70, 1.30]   → scales next plan's kcal target
carbMultiplier    ∈ [0.70, 1.30]   → scales next plan's carb fraction
portionMultiplier ∈ [0.70, 1.30]   → scales next plan's per-meal grams
```

The mapping rules (verbatim from `feedback.js`):

| Trigger                    | Correction                       |
|---------------------------|-----------------------------------|
| `physicalScore ≤ 2`        | `energyMultiplier += 0.10`        |
| `physicalScore == 3`       | `energyMultiplier += 0.05`        |
| `physicalScore == 5`       | `energyMultiplier −= 0.05`        |
| `legFatigue == true`       | `carbMultiplier += 0.15`          |
| `mealTooHeavy == true`     | `portionMultiplier −= 0.10`       |
| `lastedFullMatch == false` | `energyMultiplier += 0.10`, `carbMultiplier += 0.10` |

Multipliers are clamped to `[0.70, 1.30]` so a single bad day cannot cause runaway feedback. They are stored on the latest history entry; the next call to `getLatestCorrections()` reads them back.

Additionally, `calculateScore(feedback)` produces a 0–100 scalar (40 points for `physicalScore` + 20 each for `legFatigue`, `mealTooHeavy`, `lastedFullMatch`) used as the **performance measure** plotted in the History tab.

## 2.6 The closed loop

Putting the four phases together:

```
   ┌────────────────────────────────────────────────────┐
   │  next match                                        │
   │                                                    │
   ▼                                                    │
[OBSERVE]                                               │
   profile.fields  +  today's form  +  history          │
        │                                               │
        ▼                                               │
[DECIDE]                                                │
   apply  m_e, m_c, m_p  =  history[0].corrections      │
   energy   *= m_e                                      │
   macros.carbs *= m_c                                  │
   buildMeal: grams *= m_p                              │
        │                                               │
        ▼                                               │
[ACT]                                                   │
   render timeline, chart, warmup, recovery             │
        │                                               │
        ▼                                               │
   match happens (in the real world)                    │
        │                                               │
        ▼                                               │
[LEARN]                                                 │
   user submits feedback form                           │
   compute new corrections                              │
   append to history (max 10 entries)                   │
        │                                               │
        └───────────────────────────────────────────────┘
```

Two characteristics of this loop are worth highlighting:

1. **Learning is per-profile.** Each profile in `localStorage` carries its own history, so corrections for one player do not bleed into another. This is essential because the corrections are *personal* — one player's "carbs were too low" reflects nothing about another player's needs.

2. **The agent never overwrites raw percepts with derived state.** Form fields, `history`, and `corrections` are stored separately. This means we can replay the same percept history through a different decision policy (e.g., disable recency decay, disable diet awareness) and compare outcomes. That property makes the agent **experimentally evaluable** — we exploit it directly in `4_experiments.md`.

## 2.7 Position in the Russell–Norvig taxonomy

| Property              | MatchFuel                                |
|-----------------------|------------------------------------------|
| Environment           | Partially observable, stochastic, sequential, dynamic, continuous, single-agent |
| Agent type            | **Simple learning agent** (model-based reflex agent + learning element) |
| Internal representation | Pure state (no symbolic world model) — modules consume snapshots of percepts directly |
| Decision policy       | Hand-crafted rules + learned correction multipliers |
| Learning algorithm    | Tabular per-feature additive correction with hard clamps (no gradient, no optimization) |

The learning algorithm is intentionally lightweight. With only 10 history entries per profile and 4 binary/ordinal feedback signals, more sophisticated approaches (Bayesian update, gradient descent on a regression model) would overfit. The fixed-step correction policy is closer to a TD(λ) update with a static step size — minimal but sound for the data volume available.
