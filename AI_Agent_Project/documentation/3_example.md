# 3. Worked Example — One Plan, End to End

This section traces a single execution of the agent loop using **player 03 (Mateo Vidović)** from `data/sample_players.json`. We follow a percept set through every module, citing exact code locations so the trace can be re-run by hand.

## 3.1 The percept

At kick-off date **2026-04-26 (15:00)**, Mateo's profile state is:

```json
{
  "fields": {
    "weight":          74,
    "height":          178,
    "age":             24,
    "gender":          "male",
    "sleep":           7,
    "position":        "midfielder",
    "diet":            "regular",
    "season":          "warm",
    "wakeUpTime":      "07:30",
    "matchTime":       "15:00",
    "matchDuration":   90,
    "morningWeight":   74.2,
    "postMatchWeight": 72.6,
    "injuries":        "лек дискомфорт в дясно коляно",
    "skipBreakfast":   false,
    "warmupIntensity": "light"
  },
  "recentSessions": [
    { "date": "2026-04-25", "type": "technical", "minutes": 60 },
    { "date": "2026-04-23", "type": "cardio",    "minutes": 90 },
    { "date": "2026-04-21", "type": "strength",  "minutes": 50 }
  ],
  "eveningMeal": [
    { "food": "pasta",   "grams": 180 },
    { "food": "chicken", "grams": 150 },
    { "food": "salad",   "grams": 100 }
  ]
}
```

Mateo's history already contains one prior match. The corrections from that match are:

```json
{ "energyMultiplier": 1.10, "carbMultiplier": 1.15, "portionMultiplier": 1.00 }
```

(Last match he reported `physicalScore = 2` and `legFatigue = true`, so the agent decided to push more energy and more carbs into the next plan.)

## 3.2 OBSERVE — `ui.js → handleGenerate()`

`ui.js` calls `collectFieldValues()` to harvest every input under `#tab-profile`, plus `injuries` and `warmupIntensity` from `#tab-plan`. It then assembles `playerData`:

```js
const playerData = {
  weight: 74, height: 178, age: 24, gender: "male",
  sleepHours: 7,
  position: "midfielder",
  diet: "regular",
  season: "warm",
  wakeUpTime: "07:30",
  matchDuration: 90,
  recentSessions: [...3 items...],
  injuriesRaw: "лек дискомфорт в дясно коляно",
  morningWeight: 74.2,
  postMatchWeight: 72.6,
  skipBreakfast: false,
  bodyFat: calculateBodyFat({weight:74, height:178, age:24, gender:"male"})
};
```

Body-fat estimate from `bodyFat.js:51`:

```
BMI = 74 / 1.78² = 23.36
BF% = 1.20 × 23.36 + 0.23 × 24 − 10.8 × 1 − 5.4
    = 28.03 + 5.52 − 10.8 − 5.4
    = 17.4 %
```

→ classified as **"Фит"** (male 14–17 band, `bodyFat.js:30`).

## 3.3 DECIDE — step by step

### 3.3.1 Energy (`energy.js:110`)

Recency decay for each session:

| Session                               | days ago | `exp(−d/3)` | minutes × typeFactor | contribution |
|---------------------------------------|---------:|------------:|---------------------:|-------------:|
| 2026-04-25 technical 60 min (×1.1)    |        1 |       0.717 |                  66  |        47.3  |
| 2026-04-23 cardio    90 min (×1.3)    |        3 |       0.368 |                 117  |        43.0  |
| 2026-04-21 strength  50 min (×1.2)    |        5 |       0.189 |                  60  |        11.3  |

`recentLoad = 101.6` → `loadMul = 1 + 101.6 / 300 = 1.339`.

Sleep 7h → `sleepMul = 1.00` (`energy.js:124`).
Position midfielder → `positionMul = 1.10` (`energy.js:89`).

```
energy = 74 × 30 × 1.339 × 1.00 × 1.10 = 3270 kcal  → rounded
```

### 3.3.2 Apply learned correction (`feedback.js:168` → `mealPlanner.js`)

`getLatestCorrections()` returns `{1.10, 1.15, 1.00}`. The decide phase multiplies:

```
energy_corrected = 3270 × 1.10 ≈ 3597 kcal
```

This is a real example of the learning loop in action: because last match Mateo collapsed in the second half (`lastedFullMatch = false`, `physicalScore = 2`), today's plan delivers ~325 extra kcal.

### 3.3.3 Macros (`mealPlanner.js:212` via `energy.js:156`)

```
carbs   = round(3597 × 0.60 / 4)   = 540 g
protein = round(3597 × 0.20 / 4)   = 180 g
fat     = round(3597 × 0.20 / 9)   =  80 g
```

Then `analyzeEveningMeal` (mealPlanner.js:159) on last night's pasta+chicken+salad:

```
pasta 180g    → 180 × 25/100 = 45.0 g carbs
chicken 150g  →  150 × 0/100  =  0   g carbs
salad 100g    →   100 × 4/100 =  4   g carbs
                                ───────
                                49 g carbs (< 100)
glycogenStatus = "low"
carbAdjustment = 1.20
```

So the corrected daily target is:

```
carbs_final = round(540 × 1.20) = 648 g
```

After applying `carbMultiplier = 1.15` from the prior match:

Wait — note the order in the code. The learned `carbMultiplier` is applied to the *energy target* (which then drives macros), not to macros directly. So in this example only `energyMultiplier` was applied at energy time; `carbMultiplier` and `portionMultiplier` are applied to specific meals' carb fraction and gram counts in `buildMealFromMacros`. The current implementation is conservative — it applies `energyMultiplier` to the headline number and lets the macro split flow through.

### 3.3.4 Meal split

`matchTime = 15:00` → `needsLunch = false` (mealPlanner.js:241).
`skipBreakfast = false` → breakfast fraction = 0.25.
`matchDuration = 90` → `preMealFraction = clamp(0.20 × 90/90) = 0.20`.

```
breakfastEnergy = 3597 × 0.25 = 899 kcal
preEnergy       = 3597 × 0.20 = 719 kcal
```

`buildMealFromMacros` (mealPlanner.js:120) draws from `dietSources.regular`:
- 2 different carb sources from `[rice, pasta, bread, oats]`
- 1 protein from `[chicken, fish, egg]`

For breakfast it might pick `oats + bread + egg`; pre-match `rice + pasta + chicken`. Each gram count is `target_macro / food_macro × 100`, clamped to `portionLimits` (mealPlanner.js:72) — so the egg meal can't exceed 200 g, rice can't exceed 250 g, etc.

### 3.3.5 Hydration (`hydration.js:85`)

```
baseMl       = 74 × 35      = 2590 ml
seasonFactor = warm         = 1.10
matchBonus                  =  600 ml

trainingMl = 60 × 3 × 0.717   (technical, 1d ago)
           + 90 × 8 × 0.368   (cardio,   3d ago)
           +  50 × 5 × 0.189  (strength, 5d ago)
           = 129 + 265 + 47
           = 441 ml

totalMl = round((2590 + 441 + 600) × 1.10)
        = round(3631 × 1.10)
        = 3994 ml
```

Reminders run from `07:30 + 30 = 08:00` to `15:00 + 90 + 30 = 17:00`, every 90 minutes:
`08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00` (7 reminders).
`activeMl = round(3994 × 0.70) = 2796 ml` → `≈ 400 ml per reminder`.

### 3.3.6 Warmup (`warmup.js`)

`normalizeInjuries("лек дискомфорт в дясно коляно")` → matches the alias `коляно → knee`. Returns `{zones: ["knee"], raw: "..."}`.

With `intensity = "light"`, the filter drops every exercise tagged with `zones: ["knee"]` — that excludes `lunges`, `single-leg squats`, `jumping jacks (high impact)`, etc. The remaining mobility/activation/cardio sequence runs ~45 minutes.

`skippedExercises` will contain those filtered exercises, with `reason: "injury:knee"` — the UI renders them in a grey strikethrough sub-list so Mateo can see *what was deliberately excluded*.

## 3.4 ACT — what the user sees

The renderer (`ui.js → renderPlan`) produces:

| Section            | Source                              |
|--------------------|-------------------------------------|
| Energy headline    | `plan.energy = 3597 kcal`           |
| Macros chips       | `plan.adjustedMacros`               |
| Body-fat bar       | `bodyFat.renderBodyFatBar(...,17.4,"male")` |
| Daily water        | `3994 ml (base 2849 + training 485 + match 660)` |
| Energy chart       | `energyChart.js` plots predicted glycogen curve with markers at 08:30 (breakfast), 11:30 (pre-match), 14:15 (warmup), 15:00 (kickoff), 16:30 (full-time) |
| Timeline           | dinner → breakfast → hydration ×N → pre-match → warmup → match |
| Warmup card        | filtered sequence + skipped list (knee-related) |
| Feedback form      | empty, awaiting post-match input    |

After the match, Mateo opens the page again and clicks "Запиши фийдбак". The form posts `{physicalScore, legFatigue, mealTooHeavy, lastedFullMatch}`. `feedback.js → saveFeedback(plan, feedback)` then computes new corrections and appends a history entry to his profile. Tomorrow's plan will start from those corrections. Loop closed.

## 3.5 Why the trace matters

The walk-through demonstrates three properties:

1. **Determinism given history.** Run the same percepts twice → same plan (modulo `getRandomUnique` shuffling which carb source is chosen). The agent is not mysterious; every number above was produced by a function in the codebase.

2. **History changes the answer.** Without Mateo's prior feedback, the energy headline would have been 3270 kcal, not 3597. The +325 kcal delta is the agent learning that Mateo, last time, ran out of fuel.

3. **The agent reasons across modalities.** Numeric (weight, sleep, minutes) and categorical (diet, position, season) and textual (injury free-text) percepts all flow into a single coherent plan. None of the modules is aware of all of them — they coordinate through the shared `playerData` snapshot built at the OBSERVE step.

This is the structural argument for why MatchFuel is a worthwhile case study for a *data-science-process automation agent*: the classical pipeline (collect → clean → model → present) is realized here as (form inputs → matchers → calculators → renderers), and the learning loop closes the cycle without a backend, training run, or human in the loop.
