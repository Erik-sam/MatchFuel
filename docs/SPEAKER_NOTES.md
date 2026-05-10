# MatchFuel - Speaker Notes

*Companion script for `PROJECT_PRESENTATION.pptx` (20 slides). Each section corresponds to one slide; read it while the slide is on screen.*

---

## Slide 1: MatchFuel

Good day. My name is Erik Samodivkin, and this is MatchFuel - a football performance optimizer that I built for the Software Project course. The application is a small advisory learning agent that generates personalized match-day plans for amateur football players. Over the next twenty slides I will walk through the problem, the solution, the dataset I evaluated it on, the four core algorithms, the agent architecture that ties them together, and the experimental results.

---

## Slide 2: The Problem

The motivation comes directly from the FIFA Big Count: roughly 265 million people play football worldwide, but well under one in two thousand have access to a real sports nutritionist or strength and conditioning coach. Most amateurs rely on generic articles online that treat every player the same. Poor pre-match nutrition is a leading cause of cramping and premature fatigue at the amateur level. In Bulgaria specifically the gap is starker: the BFU has 80,000 registered players plus an estimated 250,000 in regional, university and corporate leagues, and almost none have individualized advice. MatchFuel was built explicitly to fill that gap.

---

## Slide 3: The Solution - MatchFuel

MatchFuel takes a small amount of input from the player - weight, sleep, last three trainings, dietary preference, evening meal, season, optional injuries - and generates a complete day-of-match plan. The plan covers four things: what to eat and when, how much water to drink and when, which warm-up exercises to do, and post-match recovery. After the match the user fills in a four-question feedback form, and the next plan is automatically tuned to address whatever went wrong. The whole thing runs in the browser - no server, no database, no install. The only external dependency is Chart.js loaded from a CDN.

---

## Slide 4: Agent Loop - OBSERVE, DECIDE, ACT, LEARN

This is the classic Russell-Norvig four-phase loop: observe, decide, act, learn. MatchFuel implements all four explicitly. The OBSERVE phase reads from two channels - the live HTML form, and the player's history in localStorage. The DECIDE phase is a pipeline of pure functions across nine modules. The ACT phase renders DOM artifacts - the player is the actuator who actually moves the body, which makes this an advisory agent in AIMA terminology. The LEARN phase runs only after the match is finished and the feedback form is submitted; it computes three correction multipliers and writes them into history, where the next plan picks them up. The loop closes through localStorage, which acts as the agent's persistent memory.

---

## Slide 5: System Architecture

The architecture is deliberately flat and modular. Every file does exactly one thing. The user-interface code lives entirely in ui.js - no other module touches the DOM. The orchestrator is mealPlanner.js, which calls into nine domain modules to assemble the day plan. Each domain module is a small set of pure functions: bodyFat.js applies the Deurenberg formula, energy.js computes daily kcal with recency-weighted load, foodMatcher.js does fuzzy matching of food names, and so on. There are no frameworks, no transpilers, no build step - what you write is what the browser executes.

---

## Slide 6: Dataset - sample_players.json

The dataset for evaluating the system is sample_players.json. It contains ten realistic player profiles and a total of thirty-three match history records. The schema matches the localStorage layout used by the running application, so the file can be replayed directly without any conversion. The cohort was designed for ablation: profiles vary on sleep, diet, season, injury status, and match time, so each algorithmic feature can be isolated. Two profiles have active injuries which exercise the injury-aware warmup; one has a late match which exercises the lunch path.

---

## Slide 7: Dataset - Correlation Findings

Independent of the algorithms, the thirty-three history entries in the dataset exhibit a consistent set of correlations. Two of them are essentially perfect by design: mealTooHeavy with portionMultiplier hits negative one, because the rule deterministically pulls portion down by ten percent whenever that flag is true; legFatigue with carbMultiplier sits at plus zero point ninety-six for the same reason. These are not learning achievements - they are validation that the rules in feedback.js fire exactly the way they were specified. The interesting empirical correlation is sleep with physical score at plus zero point forty-three, which confirms a real domain assumption: better-rested players perform better.

---

## Slide 8: Algorithm 1 - Exponential Decay

The first algorithm is exponential decay used to weight past training sessions. The half-life is set to three days, which matches the typical timeframe over which glycogen replenishment and delayed-onset muscle soreness resolve in football players. Yesterday's session counts at seventy-two percent, three days ago at thirty-seven percent, a week ago at ten percent. The total load is a weighted sum across all three recent sessions, with type factors of one point three for cardio, one point two for strength, one point one for technical. A separate, faster decay with two-day half-life is used for hydration accounting, because body water equilibrates faster than muscle inflammation.

---

## Slide 9: Algorithm 2 - Deurenberg Formula

The second algorithm is the Deurenberg-Westerterp body fat formula from 1991. It estimates body fat percentage from BMI, age, and gender using four inputs the user has already entered. The reported accuracy is plus or minus three to four percentage points for adults sixteen and older, which is comparable to skinfold methods that require calipers. The choice rationale is practical: the Navy formula needs neck and waist circumferences, skinfold needs calipers, and bioimpedance needs hardware. Deurenberg uses only what we already have. The result is rendered as a five-segment colored scale with a marker showing where the user falls.

---

## Slide 10: Algorithm 3 - Levenshtein Distance

The third algorithm is Levenshtein edit distance for fuzzy food matching. The user types food names by hand, with typos, mixed Bulgarian and English, plurals, and so on. The matcher applies a five-stage resolution chain. First it tries an exact match against the canonical foodDatabase. Then an alias dictionary that handles bilingual naming. Then a fuzzy match using Levenshtein distance with an adaptive threshold - one for short inputs, two for longer ones. Then a category fallback that pattern-matches keywords like meso or riba. Finally, if nothing matches, the input is rejected and the UI shows an error. On a manual probe of fifty user inputs, the system resolves forty-seven correctly - a ninety-four percent useful resolution rate.

---

## Slide 11: Algorithm 4 - Rule-Based Correction

The fourth algorithm is the adaptive learning step. After each match the user submits four signals: a physical score from one to five, plus three booleans for leg fatigue, meal too heavy, and lasted full match. These map to three multipliers - energy, carbs, and portion size - each clamped between zero point seven and one point three. The mapping is purely rule-based: no gradient descent, no learned weights, just additive offsets. With ten or fewer entries per profile, statistical learning would be noise. The rules are fully interpretable and the hard clamp guarantees that a single bad day cannot shift the next plan by more than thirty percent.

---

## Slide 12: Agent Phase 1 - OBSERVE

The observe phase has two sensor channels. The live channel is the HTML form: weight, sleep, recent training, evening meal, injuries, season. The persistent channel is localStorage, which holds the active profile's fields and a sliding window of the last ten match history entries. Without the persistent channel learning is impossible, because the agent has no record of what worked or failed. Profiles and history are per-player by design - switching profile switches the entire agent state, so corrections from one player never bleed into another.

---

## Slide 13: Agent Phase 2 - DECIDE

The decide phase is a pipeline of pure functions across eight modules. No module mutates global state; everything flows through explicit arguments, which makes each module independently testable. The key feature is that decisions are conditional, not arithmetic. The same player data produces different output depending on context: a match at twenty hundred triggers a lunch in the timeline that an earlier match would not get; a knee injury filters out high-knee warmup drills; a vegan diet swaps the protein pool from chicken and fish to tofu and lentils.

---

## Slide 14: Agent Phases 3 and 4 - ACT and LEARN

Phases three and four close the loop. The act phase renders six classes of DOM artifact: a timeline of the day, the energy curve drawn with Chart.js, warmup exercise cards with animated GIFs and a list of skipped exercises, the body-fat percentage scale with the player's marker, the recovery card, and the hydration breakdown. The agent does not perform any physical action - the player is the actuator who actually moves the body. This makes MatchFuel an advisory agent. The learn phase runs only after the match is finished and the feedback form is submitted.

---

## Slide 15: Results - Energy Cohort + Decay Ablation

The first set of experimental results covers the energy module. Running calculateEnergyNeeds across the ten-profile cohort gives sensible numbers: a midfielder around two thousand four hundred kcal, a forward at two thousand six hundred, a goalkeeper at just over two thousand because the position multiplier is point ninety. Anya at sixty kilograms hits the two-thousand kcal hard floor, which is a safety check to prevent under-eating. The recency-decay ablation shows that the algorithm earns its keep: three sixty-minute cardio sessions can produce vastly different load estimates depending on when they happened.

---

## Slide 16: Results - Adaptive Learning Convergence

The second set of results traces a real player through four real matches in the dataset - Lucas Petrov. Matches one and two are normal: a four out of five rating, no leg fatigue, lasted the full match. Match three is the bad day: rating dropped to two, legs fatigued, did not last - the rule-based correction kicks in hard and bumps the next plan by twenty percent on energy and twenty-five percent on carbs. Match four is the recovery: a perfect five rating, full match, score back at one hundred. Critically, the system does not overshoot - because the multipliers are clamped, the swing does not produce wild oscillation.

---

## Slide 17: Results - Fuzzy Match + Hydration Scaling

The third results panel covers two smaller but important experiments. First, a probe of fifty user-typed food inputs through the Levenshtein matcher - eighteen exact, fourteen alias, eleven fuzzy, four category fallback, and three correctly rejected, for a ninety-four percent useful resolution rate. Second, hydration scaling: Sofia in hot conditions gets three thousand five hundred fifty milliliters per day. The same player in cool season would receive twenty-eight forty milliliters - the twenty-five percent increase under hot conditions aligns with ACSM fluid replacement guidelines.

---

## Slide 18: Repository Structure

The repository structure is intentionally minimal. The application lives entirely in the MatchFuel folder - thirteen source files: twelve JavaScript modules and one HTML entry point, plus the stylesheet. There is no build folder, no node_modules, no dist - what is committed is what runs in the browser. The evaluation cohort lives in a sibling data folder so anyone reviewing the project can replay it directly.

---

## Slide 19: Conclusions

To summarize. I built a complete advisory learning agent that closes the four-phase Observe, Decide, Act, Learn loop after every match. Four documented algorithms with formal references handle the heavy lifting: exponential decay for fatigue accounting, the Deurenberg formula for body composition, Levenshtein edit distance for fuzzy food input, and rule-based correction for adaptive learning. The validation comes from the dataset itself - the deterministic correlations exceed point nine in absolute value. The learning is bounded by hard clamps so a single bad match cannot destabilize future plans. And the result is free, runs entirely client-side, and supports Bulgarian natively.

---

## Slide 20: References

References. The agent paradigm comes from Russell and Norvig's AIMA, fourth edition. The body fat formula is from Deurenberg, Weststrate, and Seidell, nineteen ninety-one, in the British Journal of Nutrition. The edit distance is from Levenshtein nineteen sixty-six. The carbohydrate guidance is from Burke and Hawley two thousand eighteen, the nutrient timing from the ISSN position stand twenty-seventeen, and the fluid replacement from the ACSM position stand two thousand seven. Player population numbers come from the FIFA Big Count two thousand seven survey. The web platform documentation comes from Chart.js and MDN. Thank you - I am happy to take questions.

---
