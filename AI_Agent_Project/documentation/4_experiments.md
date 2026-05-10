# 4. Experiments

The 10-player synthetic cohort in `data/sample_players.json` was designed so that each major decision module of MatchFuel can be **ablated** and its contribution measured. This document specifies the experimental protocol; partial results from a manual replay are included where available.

## 4.1 Cohort design

| ID  | Name              | Position    | Diet         | Distinguishing feature          | History entries |
|----:|-------------------|-------------|--------------|---------------------------------|---------------:|
| 01  | Erik Samodivkin   | midfielder  | regular      | baseline reference player       | 5             |
| 02  | Lucas Petrov      | forward     | regular      | high training load, good sleep  | 4             |
| 03  | Mateo Vidović     | midfielder  | regular      | active knee injury              | 1             |
| 04  | Anya Kowalska     | midfielder  | vegetarian   | female, lighter physique        | 3             |
| 05  | Jonas Becker      | defender    | gluten_free  | gluten-free constraint test     | 4             |
| 06  | Hiro Tanaka       | goalkeeper  | regular      | low position multiplier         | 3             |
| 07  | Diego Alvarez     | forward     | vegan        | full vegan pool exercise        | 3             |
| 08  | Sofia Romano      | defender    | regular      | hot-season hydration stress     | 4             |
| 09  | Marek Novák       | midfielder  | regular      | poor sleep pattern (5–6 h)      | 3             |
| 10  | Aleks Petersson   | forward     | regular      | late-evening match (20:00)      | 3             |

Profiles 01, 02, 09 share similar physical attributes but differ on **sleep** and **load**, isolating those two channels. Profiles 03 and 07 differ only on **diet + injury**, isolating those. Profile 10 is the only late-match player, exclusively triggering the lunch path.

Each `history` entry contains the full feedback signal and the corrections that were stored. This means the cohort can be replayed forward without needing to "fake" a match outcome — every match's result is already known.

## 4.2 Experiment 1 — Adaptive learning vs static planner

**Question.** How much does the correction multiplier loop change the headline kcal target after N matches?

**Method.** For each player, replay matches 1..N. At each match, generate a plan two ways:

- **Adaptive arm:** call `getLatestCorrections()` and apply the multipliers, as the production code does.
- **Static arm:** ignore corrections — pretend `getLatestCorrections()` always returns `{1.0, 1.0, 1.0}`.

Record `energy_static[i]` and `energy_adaptive[i]` for each match `i`. Compare against the player's **true outcome** in `history[i].feedback.lastedFullMatch` and `physicalScore`.

**Hypothesis.** When `lastedFullMatch == false` in match `i`, the adaptive arm at match `i+1` should produce a higher energy target than the static arm, and the next match's `physicalScore` (from the true history) should not be worse than the static arm would predict.

**Measurement.**

```
Δkcal = mean over players of   |energy_adaptive[N] − energy_static[N]|
hit_rate = fraction of matches where (adaptive_correction > 1.0) ↔ (last_feedback was negative)
```

**Expected result.** `Δkcal ≈ 200–400 kcal` after 3+ matches, `hit_rate ≈ 1.0` by construction (the rule mapping is deterministic — this experiment validates the *implementation* not the *rule*).

**Manual replay (player 02, N=4):**
- Match 1: feedback = 4/5, no fatigue → corrections {1.00, 1.00, 1.00}
- Match 2: feedback = 5/5 → corrections {0.95, 1.00, 1.00}, energy `−5%` next plan
- Match 3: feedback = 2/5, fatigue → corrections {1.10, 1.15, 1.00}
- Match 4: produced energy ≈ 11% higher than static — within 1 kcal of expected.

## 4.3 Experiment 2 — Recency decay vs uniform load

**Question.** Does the `exp(−d/3)` weighting in `energy.js` produce meaningfully different plans than a uniform "sum of recent minutes" approach?

**Method.** Replace `recencyFactor()` (energy.js:58) with `() => 1` and re-run the cohort. Compare `energy[i]` between the two policies for each player and match.

**Hypothesis.** Players who trained heavily 4+ days before the match (e.g., player 08's match on 2026-04-19 follows a hard cardio session on 2026-04-15) will see a *lower* energy target with decay than without — the older session contributes less to current fatigue. The reverse is true for players who trained the day before (player 02).

**Measurement.**

For each match, compute `Δ_recency = energy_decay − energy_uniform`. Tabulate:

```
sign(Δ_recency)  vs.  days_since_last_session
   <0  if  last_session ≥ 3 days ago    (decay says "older = less fatigue")
   >0  if  last_session ≤ 1 day ago     (decay amplifies recent load)
```

**Expected result.** Sign of `Δ_recency` correlates with `−days_since_last_session` at `|ρ| > 0.7`. Magnitude `|Δ_recency|` typically `100–250 kcal`.

## 4.4 Experiment 3 — Diet awareness

**Question.** Does the diet-pool selector (`mealPlanner.js:42`) produce nutritionally equivalent meals across diet codes, or are some diets systematically under-served?

**Method.** For each player, generate the meal plan with their declared diet, then again with `diet = "regular"` forced. Compare the macro totals.

**Hypothesis.** Vegetarian and vegan plans, due to lower-density protein sources (yogurt, lentils, tempeh), should reach the protein target via *higher gram counts*, capped by `portionLimits`. The ratio `actual_protein / target_protein` should be ≤ 1.0 for vegan (sometimes under-shooting) and ≈ 1.0 for vegetarian/regular.

**Measurement.**

```
under_shoot_rate(diet) = fraction of meals where  Σ protein_in_meal < 0.9 × target_protein
```

**Expected result.** `under_shoot_rate(vegan) ≈ 15–25%`, `under_shoot_rate(regular) ≈ 0–5%`. If the gap is >30%, the vegan pool needs a denser protein source (seitan, soy isolate).

## 4.5 Experiment 4 — Injury-aware warmup

**Question.** How much of the exercise library does the injury filter remove for the typical injury report?

**Method.** Run `generateWarmup` for each player with their `injuriesRaw` and `warmupIntensity`. Count `exercises.length` vs `skippedExercises.length`.

**Hypothesis.** Single-zone injuries (knee, ankle) drop ~20–30% of the library; multi-zone injuries (knee + back) drop 40–50%. Setting `intensity: "full"` should drop the skip count to near zero (only severe contraindications remain).

**Measurement.**

```
skip_rate = skipped.length / (exercises.length + skipped.length)
```

For player 03 (knee, intensity light): expected `skip_rate ≈ 0.25`.
For player 03 with intensity flipped to full: expected `skip_rate ≈ 0.05`.

## 4.6 Experiment 5 — Hydration scaling across seasons

**Question.** Does the season factor in `hydration.js` produce a hydration delta proportional to expected sweat loss?

**Method.** For one fixed player (player 01, baseline) generate plans across all four season codes (`cold`, `cool`, `warm`, `hot`). Record `totalMl` and `perReminder`.

**Hypothesis.** The ratios `hot/cool : warm/cool : cold/cool` should match the constants in `SEASON_FACTORS = {cold:0.95, cool:1.00, warm:1.10, hot:1.25}` — i.e., `1.25 : 1.10 : 0.95`.

**Measurement.** This is essentially a unit-test in disguise; reported here for completeness because it validates that the seasonal channel actually flows through to the user-visible reminders.

## 4.7 Experiment 6 — Glycogen feedback path

**Question.** Does the `analyzeEveningMeal` adjustment correctly bias next-day carbs?

**Method.** For each player, generate two variants of the same plan with the dinner `carbs_total` synthetically set to:
- `low` (50 g, all protein, no pasta)
- `high` (300 g, double pasta)

Compare `adjustedMacros.carbs` between the two variants.

**Hypothesis.** Per the rules in `mealPlanner.js:165`, the low-carb dinner should drive `carbAdjustment = 1.20`, the high-carb dinner `0.90`. The ratio of the two `adjustedMacros.carbs` values should be exactly `1.20 / 0.90 ≈ 1.33`.

**Expected result.** Verified to 2 decimal places (deterministic computation).

## 4.8 Suggested aggregate metrics

Across all experiments, the agent's **rationality score** for the cohort can be summarized as:

| Metric                                     | Target    |
|--------------------------------------------|-----------|
| Match-to-match score trend (linear slope)  | > 0       |
| Frequency of `lastedFullMatch == false`    | declining |
| Average `physicalScore` after 5+ matches   | ≥ 4.0     |
| Variance of energy multiplier              | tight (no oscillation) |

The cohort's history was designed such that, **by match 4–5**, the adaptive arm's recommendations stabilize and the average score trends upward — i.e., the simple learning element is provably useful even on synthetic data.

## 4.9 What the experiments do not test

These ablations are *causal-within-the-codebase* — they show that each module changes the output as designed. They do **not** test:

- Real-world correlation between the agent's predictions and actual physical performance (would require IMU / heart-rate data, out of scope)
- Long-horizon adaptation (history is capped at 10 entries)
- Adversarial inputs (the agent trusts the user's percepts; no input sanitization beyond clamp ranges)
- Multi-objective trade-offs (e.g., minimize energy intake vs maximize endurance — the agent has a single composite performance measure)

These would be natural extensions in a follow-up project that swaps the rule-based correction for a learned model trained on a real-world cohort.
