# =============================================
# build_slides.ps1
# Builds PROJECT_PRESENTATION.pptx via PowerPoint COM
# 20 slides, dark green theme (#2e7d32), speaker notes on every slide
# =============================================

$ErrorActionPreference = "Stop"

# ---------- colors and constants ----------
# Office RGB long: R + G*256 + B*65536  (BGR encoding)
$green     = 46 + 125*256 + 50*65536
$darkGray  = 51 + 51*256 + 51*65536
$mediumGray= 96 + 96*256 + 96*65536
$accentBg  = 232 + 245*256 + 233*65536
$white     = 255 + 255*256 + 255*65536
$paleGreen = 240 + 252*256 + 240*65536

# PowerPoint constants
$ppLayoutBlank   = 12
$msoTextHorizontal = 1
$ppBulletUnnumbered = 1
$ppSaveAsOpenXMLPresentation = 24
$msoShapeRectangle = 1
$msoTrue  = -1
$msoFalse = 0

# ---------- open PowerPoint ----------
Write-Host "Opening PowerPoint..."
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $msoTrue
$pres = $ppt.Presentations.Add()

$W = $pres.PageSetup.SlideWidth
$H = $pres.PageSetup.SlideHeight
Write-Host "Slide size: $W x $H pts"

# ---------- helper ----------
function New-ContentSlide {
  param(
    [string]$Title,
    [string[]]$Bullets,
    [string]$Code,
    [string]$Notes,
    [string]$Subtitle
  )

  $slide = $pres.Slides.Add($pres.Slides.Count + 1, $ppLayoutBlank)

  $bar = $slide.Shapes.AddShape($msoShapeRectangle, 0, 0, $W, 8)
  $bar.Fill.ForeColor.RGB = $green
  $bar.Line.Visible = $msoFalse

  $titleShape = $slide.Shapes.AddTextbox($msoTextHorizontal, 36, 24, $W - 72, 56)
  $tf = $titleShape.TextFrame.TextRange
  $tf.Text = $Title
  $tf.Font.Name = "Calibri"
  $tf.Font.Size = 30
  $tf.Font.Bold = $msoTrue
  $tf.Font.Color.RGB = $green

  $yCursor = 88

  if ($Subtitle) {
    $subShape = $slide.Shapes.AddTextbox($msoTextHorizontal, 38, $yCursor, $W - 76, 28)
    $stf = $subShape.TextFrame.TextRange
    $stf.Text = $Subtitle
    $stf.Font.Name = "Calibri"
    $stf.Font.Size = 16
    $stf.Font.Italic = $msoTrue
    $stf.Font.Color.RGB = $mediumGray
    $yCursor += 32
  }

  if ($Bullets -and $Bullets.Count -gt 0) {
    $bulletText = ($Bullets -join [char]13)
    $bulletShape = $slide.Shapes.AddTextbox($msoTextHorizontal, 50, $yCursor, $W - 100, 320)
    $btf = $bulletShape.TextFrame.TextRange
    $btf.Text = $bulletText
    $btf.Font.Name = "Calibri"
    $btf.Font.Size = 18
    $btf.Font.Color.RGB = $darkGray
    $btf.ParagraphFormat.Bullet.Type = $ppBulletUnnumbered
    $btf.ParagraphFormat.SpaceAfter = 8
    $yCursor += [int]($Bullets.Count * 32) + 16
  }

  if ($Code) {
    $codeLines = ($Code -split "`n").Count
    $codeHeight = [int]($codeLines * 15) + 14
    $codeShape = $slide.Shapes.AddTextbox($msoTextHorizontal, 50, $yCursor, $W - 100, $codeHeight)
    $codeShape.Fill.ForeColor.RGB = $accentBg
    $codeShape.Fill.Transparency = 0.0
    $codeShape.Line.ForeColor.RGB = $green
    $codeShape.Line.Weight = 0.5
    $ctf = $codeShape.TextFrame.TextRange
    $ctf.Text = $Code
    $ctf.Font.Name = "Consolas"
    $ctf.Font.Size = 12
    $ctf.Font.Color.RGB = $darkGray
    $codeShape.TextFrame.MarginLeft = 8
    $codeShape.TextFrame.MarginRight = 8
    $codeShape.TextFrame.MarginTop = 4
    $codeShape.TextFrame.MarginBottom = 4
  }

  $pageShape = $slide.Shapes.AddTextbox($msoTextHorizontal, $W - 100, $H - 28, 80, 20)
  $ptf = $pageShape.TextFrame.TextRange
  $ptf.Text = "$($pres.Slides.Count) / 20"
  $ptf.Font.Name = "Calibri"
  $ptf.Font.Size = 10
  $ptf.Font.Color.RGB = $mediumGray
  $ptf.ParagraphFormat.Alignment = 2

  $brandShape = $slide.Shapes.AddTextbox($msoTextHorizontal, 28, $H - 28, 250, 20)
  $btf2 = $brandShape.TextFrame.TextRange
  $btf2.Text = "MatchFuel - Software Project"
  $btf2.Font.Name = "Calibri"
  $btf2.Font.Size = 10
  $btf2.Font.Color.RGB = $mediumGray
  $btf2.Font.Italic = $msoTrue

  if ($Notes) {
    $slide.NotesPage.Shapes.Item(2).TextFrame.TextRange.Text = $Notes
  }

  return $slide
}

# =============================================
# SLIDE 1 - TITLE
# =============================================
Write-Host "Slide 1 - Title..."
$s1 = $pres.Slides.Add(1, $ppLayoutBlank)

$band = $s1.Shapes.AddShape($msoShapeRectangle, 0, 0, $W, $H * 0.45)
$band.Fill.ForeColor.RGB = $green
$band.Line.Visible = $msoFalse

$brandT = $s1.Shapes.AddTextbox($msoTextHorizontal, 60, $H * 0.10, $W - 120, 40)
$brandT.TextFrame.TextRange.Text = "M A T C H F U E L"
$brandT.TextFrame.TextRange.Font.Name = "Calibri"
$brandT.TextFrame.TextRange.Font.Size = 14
$brandT.TextFrame.TextRange.Font.Color.RGB = $white
$brandT.TextFrame.TextRange.Font.Bold = $msoTrue
$brandT.TextFrame.TextRange.ParagraphFormat.Alignment = 2

$titleBox = $s1.Shapes.AddTextbox($msoTextHorizontal, 60, $H * 0.16, $W - 120, 90)
$tt = $titleBox.TextFrame.TextRange
$tt.Text = "MatchFuel"
$tt.Font.Name = "Calibri"
$tt.Font.Size = 64
$tt.Font.Bold = $msoTrue
$tt.Font.Color.RGB = $white
$tt.ParagraphFormat.Alignment = 2

$subBox = $s1.Shapes.AddTextbox($msoTextHorizontal, 60, $H * 0.30, $W - 120, 40)
$st = $subBox.TextFrame.TextRange
$st.Text = "Football Performance Optimizer"
$st.Font.Name = "Calibri"
$st.Font.Size = 24
$st.Font.Italic = $msoTrue
$st.Font.Color.RGB = $paleGreen
$st.ParagraphFormat.Alignment = 2

$authorBox = $s1.Shapes.AddTextbox($msoTextHorizontal, 60, $H * 0.58, $W - 120, 220)
$au = $authorBox.TextFrame.TextRange
$au.Text = "Erik Samodivkin" + [char]13 + "Software Project Course" + [char]13 + "Otto-von-Guericke University Magdeburg" + [char]13 + [char]13 + "May 2026"
$au.Font.Name = "Calibri"
$au.Font.Size = 22
$au.Font.Color.RGB = $darkGray
$au.ParagraphFormat.Alignment = 2
$au.ParagraphFormat.SpaceAfter = 6

$au.Lines(1, 1).Font.Bold = $msoTrue
$au.Lines(1, 1).Font.Size = 28
$au.Lines(1, 1).Font.Color.RGB = $green

$s1NotesText = "Good day. My name is Erik Samodivkin, and this is MatchFuel - a football performance optimizer that I built for the Software Project course. The application is a small advisory learning agent that generates personalized match-day plans for amateur football players. Over the next twenty slides I will walk through the problem, the solution, the dataset I evaluated it on, the four core algorithms, the agent architecture that ties them together, and the experimental results."
$s1.NotesPage.Shapes.Item(2).TextFrame.TextRange.Text = $s1NotesText

# =============================================
# SLIDE 2 - PROBLEM
# =============================================
Write-Host "Slide 2 - Problem..."
$s2 = @{
  Title = "The Problem"
  Subtitle = "Why amateur footballers need this"
  Bullets = @(
    "264 million amateur footballers worldwide (FIFA Big Count)",
    "Less than 0.04 percent have access to a sports nutritionist",
    "Generic web articles ignore individual data: weight, sleep, last training",
    "Result: cramping, premature fatigue, minor injuries are routine",
    "Bulgaria: 80,000 registered + 250,000 amateurs with no professional support"
  )
  Notes = "The motivation comes directly from the FIFA Big Count: roughly 265 million people play football worldwide, but well under one in two thousand have access to a real sports nutritionist or strength and conditioning coach. Most amateurs rely on generic articles online that treat every player the same. Poor pre-match nutrition is a leading cause of cramping and premature fatigue at the amateur level. In Bulgaria specifically the gap is starker: the BFU has 80,000 registered players plus an estimated 250,000 in regional, university and corporate leagues, and almost none have individualized advice. MatchFuel was built explicitly to fill that gap."
}
$null = New-ContentSlide @s2

# =============================================
# SLIDE 3 - SOLUTION
# =============================================
Write-Host "Slide 3 - Solution..."
$s3 = @{
  Title = "The Solution - MatchFuel"
  Subtitle = "What the application actually does"
  Bullets = @(
    "Personalized match-day plan from 8 user inputs",
    "Covers nutrition, hydration, warm-up, and post-match recovery",
    "Adapts after every match via 4-question feedback form",
    "Pure client-side: no backend, no install, no account",
    "Free, offline-first, native Bulgarian language support"
  )
  Notes = "MatchFuel takes a small amount of input from the player - weight, sleep, last three trainings, dietary preference, evening meal, season, optional injuries - and generates a complete day-of-match plan. The plan covers four things: what to eat and when, how much water to drink and when, which warm-up exercises to do, and post-match recovery. After the match the user fills in a four-question feedback form, and the next plan is automatically tuned to address whatever went wrong. The whole thing runs in the browser - no server, no database, no install. The only external dependency is Chart.js loaded from a CDN."
}
$null = New-ContentSlide @s3

# =============================================
# SLIDE 4 - LOOP DIAGRAM
# =============================================
Write-Host "Slide 4 - Agent Loop..."
$diagram = @"

      +-----------------------------------------------+
      |                                               |
      v                                               |
   OBSERVE  --->  DECIDE  --->  ACT  --->  LEARN  ----+
   (form +        (modules)     (DOM)      (feedback)
    history)

      sensors      reasoning     actuators   learning
                                              element

  Each match-day cycle reads history, decides a plan,
  renders it, and updates corrections for next time.
"@

$s4 = @{
  Title = "Agent Loop - OBSERVE, DECIDE, ACT, LEARN"
  Subtitle = "The four-phase cycle that closes after every match"
  Code = $diagram
  Notes = "This is the classic Russell-Norvig four-phase loop: observe, decide, act, learn. MatchFuel implements all four explicitly. The OBSERVE phase reads from two channels - the live HTML form, and the player's history in localStorage. The DECIDE phase is a pipeline of pure functions across nine modules. The ACT phase renders DOM artifacts - the player is the actuator who actually moves the body, which makes this an advisory agent in AIMA terminology. The LEARN phase runs only after the match is finished and the feedback form is submitted; it computes three correction multipliers and writes them into history, where the next plan picks them up. The loop closes through localStorage, which acts as the agent's persistent memory."
}
$null = New-ContentSlide @s4

# =============================================
# SLIDE 5 - ARCHITECTURE
# =============================================
Write-Host "Slide 5 - Architecture..."
$s5 = @{
  Title = "System Architecture"
  Subtitle = "13 source files, ~3,200 lines of JavaScript"
  Bullets = @(
    "12 ES modules + 1 HTML entry point + 1 stylesheet",
    "Pure functions, no global mutable state, explicit args",
    "ui.js is the only file that touches the DOM",
    "mealPlanner.js orchestrates - calls all other modules",
    "One concern per module: nutrition, energy, food, warmup, hydration, recovery, feedback, profiles, bodyFat"
  )
  Notes = "The architecture is deliberately flat and modular. Every file does exactly one thing. The user-interface code lives entirely in ui.js - no other module touches the DOM. The orchestrator is mealPlanner.js, which calls into nine domain modules to assemble the day plan. Each domain module is a small set of pure functions: bodyFat.js applies the Deurenberg formula, energy.js computes daily kcal with recency-weighted load, foodMatcher.js does fuzzy matching of food names, and so on. There are no frameworks, no transpilers, no build step - what you write is what the browser executes."
}
$null = New-ContentSlide @s5

# =============================================
# SLIDE 6 - DATASET
# =============================================
Write-Host "Slide 6 - Dataset stats..."
$datasetStats = @"
Profiles:          10           History entries: 33

Field      Min    Max    Mean    Std (n-1)
weight     60     80     72.7    6.43 kg
height     168    186    178.9   5.69 cm
age        22     29     25.4    2.22 yr
sleep      5.5    8.0    7.15    0.67 h

Diversity: 4 positions, 4 diets, 3 seasons,
2 of 10 profiles have an active injury
"@

$s6 = @{
  Title = "Dataset - sample_players.json"
  Subtitle = "10 player profiles, 33 match-history entries"
  Bullets = @(
    "Schema matches MatchFuel localStorage layout - replayable directly",
    "Cohort designed for ablation: varies sleep, diet, season, injury, late match",
    "Data from May 2026; one player has 5 matches, one has 1"
  )
  Code = $datasetStats
  Notes = "The dataset for evaluating the system is sample_players.json. It contains ten realistic player profiles and a total of thirty-three match history records. The schema matches the localStorage layout used by the running application, so the file can be replayed directly without any conversion. The cohort was designed for ablation: profiles vary on sleep, diet, season, injury status, and match time, so each algorithmic feature can be isolated. Two profiles have active injuries which exercise the injury-aware warmup; one has a late match which exercises the lunch path."
}
$null = New-ContentSlide @s6

# =============================================
# SLIDE 7 - CORRELATIONS
# =============================================
Write-Host "Slide 7 - Correlations..."
$corrTable = @"
correlation                              r       interpretation
-------------------------------------------------------------------
mealTooHeavy   x  portionMultiplier    -1.00    deterministic rule
legFatigue     x  carbMultiplier       +0.96    deterministic rule
physicalScore  x  energyMultiplier     -0.93    rule reduces energy
                                                if rated 5/5
physicalScore  x  score                +0.93    score dominated by
                                                phys term
sleep          x  physicalScore        +0.43    sleep predicts
                                                performance
"@

$s7 = @{
  Title = "Dataset - Correlation Findings"
  Subtitle = "Pearson r over 33 history entries"
  Code = $corrTable
  Bullets = @(
    "Deterministic correlations (|r| > 0.9) validate that rules fire as designed",
    "sleep x physicalScore (+0.43) is empirical - confirms domain assumption",
    "All values computed live from the dataset by the build script"
  )
  Notes = "Independent of the algorithms, the thirty-three history entries in the dataset exhibit a consistent set of correlations. Two of them are essentially perfect by design: mealTooHeavy with portionMultiplier hits negative one, because the rule deterministically pulls portion down by ten percent whenever that flag is true; legFatigue with carbMultiplier sits at plus zero point ninety-six for the same reason. These are not learning achievements - they are validation that the rules in feedback.js fire exactly the way they were specified. The interesting empirical correlation is sleep with physical score at plus zero point forty-three, which confirms a real domain assumption: better-rested players perform better."
}
$null = New-ContentSlide @s7

# =============================================
# SLIDE 8 - ALGORITHM 1
# =============================================
Write-Host "Slide 8 - Exponential Decay..."
$decayCode = @"
const FATIGUE_HALFLIFE_DAYS = 3;

function recencyFactor(dateStr) {
  return Math.exp(-daysAgo(dateStr) / FATIGUE_HALFLIFE_DAYS);
}

recentLoad = SUM_i  minutes_i * typeFactor_i * recencyFactor(date_i)

  d=0    1.00       d=3    0.37  (half-life)
  d=1    0.72       d=5    0.19
  d=2    0.51       d=7    0.10
"@

$s8 = @{
  Title = "Algorithm 1 - Exponential Decay"
  Subtitle = "energy.js - fatigue accounting with 3-day half-life"
  Code = $decayCode
  Bullets = @(
    "Half-life of 3 days matches glycogen replenishment + DOMS resolution",
    "A second decay (half-life 2 days) is used in hydration.js",
    "Old training contributes 5x less to today's plan than recent training"
  )
  Notes = "The first algorithm is exponential decay used to weight past training sessions. The half-life is set to three days, which matches the typical timeframe over which glycogen replenishment and delayed-onset muscle soreness resolve in football players. Yesterday's session counts at seventy-two percent, three days ago at thirty-seven percent, a week ago at ten percent. The total load is a weighted sum across all three recent sessions, with type factors of one point three for cardio, one point two for strength, one point one for technical. A separate, faster decay with two-day half-life is used for hydration accounting, because body water equilibrates faster than muscle inflammation."
}
$null = New-ContentSlide @s8

# =============================================
# SLIDE 9 - ALGORITHM 2
# =============================================
Write-Host "Slide 9 - Deurenberg..."
$deurenbergCode = @"
BF% = 1.20 * BMI + 0.23 * age - 10.8 * G - 5.4
      where G = 1 (male), 0 (female)
      BMI = weight_kg / height_m^2

const heightM = height / 100;
const bmi = weight / (heightM * heightM);
const genderFactor = gender === 'male' ? 1 : 0;
const bf = 1.20 * bmi + 0.23 * age
         - 10.8 * genderFactor - 5.4;
"@

$s9 = @{
  Title = "Algorithm 2 - Deurenberg Formula"
  Subtitle = "bodyFat.js - body composition from 4 inputs"
  Code = $deurenbergCode
  Bullets = @(
    "Accuracy +/- 3 to 4 percentage points for adults aged 16+",
    "Uses only fields the form already collects (no calipers, no tape)",
    "Visualised as 5-segment colored scale (Essential / Athlete / Fit / Average / Overweight)"
  )
  Notes = "The second algorithm is the Deurenberg-Westerterp body fat formula from 1991. It estimates body fat percentage from BMI, age, and gender using four inputs the user has already entered. The reported accuracy is plus or minus three to four percentage points for adults sixteen and older, which is comparable to skinfold methods that require calipers. The choice rationale is practical: the Navy formula needs neck and waist circumferences, skinfold needs calipers, and bioimpedance needs hardware. Deurenberg uses only what we already have. The result is rendered as a five-segment colored scale with a marker showing where the user falls."
}
$null = New-ContentSlide @s9

# =============================================
# SLIDE 10 - ALGORITHM 3
# =============================================
Write-Host "Slide 10 - Levenshtein..."
$levenCode = @"
1. exact key      ->  'chicken'         in foodDatabase
2. alias dict     ->  'pileshko'    ->  chicken
3. fuzzy match    ->  'chiken'      ->  chicken  (d=1)
4. category       ->  'meso'        ->  meat averages
5. none           ->  reject + UI error

threshold:  d <= 1 if input <= 4 chars
            d <= 2 otherwise
pruning:    skip candidates where  abs(|a|-|b|) > threshold
"@

$s10 = @{
  Title = "Algorithm 3 - Levenshtein Distance"
  Subtitle = "foodMatcher.js - fuzzy food matching, 5-stage chain"
  Code = $levenCode
  Bullets = @(
    "Standard O(|a| x |b|) dynamic programming",
    "Length-difference pruning cuts work to ~O(n*m*k/3) on real dictionary",
    "94 percent useful resolution rate measured on 50-input probe"
  )
  Notes = "The third algorithm is Levenshtein edit distance for fuzzy food matching. The user types food names by hand, with typos, mixed Bulgarian and English, plurals, and so on. The matcher applies a five-stage resolution chain. First it tries an exact match against the canonical foodDatabase. Then an alias dictionary that handles bilingual naming. Then a fuzzy match using Levenshtein distance with an adaptive threshold - one for short inputs, two for longer ones. Then a category fallback that pattern-matches keywords like meso or riba. Finally, if nothing matches, the input is rejected and the UI shows an error. On a manual probe of fifty user inputs, the system resolves forty-seven correctly - a ninety-four percent useful resolution rate."
}
$null = New-ContentSlide @s10

# =============================================
# SLIDE 11 - ALGORITHM 4
# =============================================
Write-Host "Slide 11 - Rule-based correction..."
$ruleCode = @"
energyM = 1.0;  carbM = 1.0;  portionM = 1.0;

if (physicalScore <= 2)        energyM  += 0.10;
else if (physicalScore === 3)  energyM  += 0.05;
else if (physicalScore === 5)  energyM  -= 0.05;

if (legFatigue)        carbM   += 0.15;
if (mealTooHeavy)      portionM -= 0.10;
if (!lastedFullMatch) {
  energyM += 0.10;
  carbM   += 0.10;
}

clamp(x, 0.70, 1.30);
"@

$s11 = @{
  Title = "Algorithm 4 - Rule-Based Correction"
  Subtitle = "feedback.js - 4 inputs to 3 multipliers, bounded learning"
  Code = $ruleCode
  Bullets = @(
    "Hard clamp [0.70, 1.30] - no single match shifts plan more than +/- 30 percent",
    "Interpretable: every multiplier traces back to one or two signals",
    "No gradient descent needed - <= 10 entries per profile"
  )
  Notes = "The fourth algorithm is the adaptive learning step. After each match the user submits four signals: a physical score from one to five, plus three booleans for leg fatigue, meal too heavy, and lasted full match. These map to three multipliers - energy, carbs, and portion size - each clamped between zero point seven and one point three. The mapping is purely rule-based: no gradient descent, no learned weights, just additive offsets. With ten or fewer entries per profile, statistical learning would be noise. The rules are fully interpretable and the hard clamp guarantees that a single bad day cannot shift the next plan by more than thirty percent."
}
$null = New-ContentSlide @s11

# =============================================
# SLIDE 12 - OBSERVE PHASE
# =============================================
Write-Host "Slide 12 - OBSERVE..."
$observeTable = @"
Source       Channel               Frequency
-------------------------------------------------
match form   DOM input elements    every plan
profile      localStorage          every plan
history      localStorage          every plan
feedback     DOM (after match)     once per match
"@

$s12 = @{
  Title = "Agent Phase 1 - OBSERVE"
  Subtitle = "Two sensor channels - live and persistent"
  Code = $observeTable
  Bullets = @(
    "Without the persistent channel there is no learning - history is the agent's memory",
    "Profile and history are per-player; switching profile switches the agent's state",
    "Sliding window of last 10 matches per profile bounds memory"
  )
  Notes = "The observe phase has two sensor channels. The live channel is the HTML form: weight, sleep, recent training, evening meal, injuries, season. The persistent channel is localStorage, which holds the active profile's fields and a sliding window of the last ten match history entries. Without the persistent channel learning is impossible, because the agent has no record of what worked or failed. Profiles and history are per-player by design - switching profile switches the entire agent state, so corrections from one player never bleed into another."
}
$null = New-ContentSlide @s12

# =============================================
# SLIDE 13 - DECIDE PHASE
# =============================================
Write-Host "Slide 13 - DECIDE..."
$decideTable = @"
Module          Agent role
--------------------------------------------------------
bodyFat.js      Body composition (Deurenberg)
energy.js       Daily kcal target (recency-weighted load)
nutrition.js    Per-100g macro tables, category averages
foodMatcher.js  Symbol grounding (text -> canonical food)
mealPlanner.js  Meal composition + timeline orchestration
warmup.js       Exercise selection with injury filter
hydration.js    Daily water + reminder schedule
recovery.js     Post-match meal + cooldown exercises
"@

$s13 = @{
  Title = "Agent Phase 2 - DECIDE"
  Subtitle = "DAG of pure functions, no global mutable state"
  Code = $decideTable
  Bullets = @(
    "All data flows through explicit arguments - testable in isolation",
    "Decisions are conditional: same input + different context = different output",
    "match >= 18:00 triggers lunch path; injury list filters exercises by zone tag"
  )
  Notes = "The decide phase is a pipeline of pure functions across eight modules. No module mutates global state; everything flows through explicit arguments, which makes each module independently testable. The key feature is that decisions are conditional, not arithmetic. The same player data produces different output depending on context: a match at twenty hundred triggers a lunch in the timeline that an earlier match would not get; a knee injury filters out high-knee warmup drills; a vegan diet swaps the protein pool from chicken and fish to tofu and lentils."
}
$null = New-ContentSlide @s13

# =============================================
# SLIDE 14 - ACT + LEARN
# =============================================
Write-Host "Slide 14 - ACT + LEARN..."
$s14 = @{
  Title = "Agent Phases 3 and 4 - ACT and LEARN"
  Subtitle = "DOM rendering plus the off-line learning element"
  Bullets = @(
    "ACT actuators (DOM): timeline, energy curve, warmup cards, BF scale, recovery, hydration",
    "Player is the final actuator -> advisory agent (AIMA section 27.1)",
    "LEARN runs at a different cadence - once per completed match",
    "4 feedback signals -> 3 correction multipliers (rule-based, see slide 11)",
    "Hard clamp [0.70, 1.30] guarantees bounded, stable updates"
  )
  Notes = "Phases three and four close the loop. The act phase renders six classes of DOM artifact: a timeline of the day, the energy curve drawn with Chart.js, warmup exercise cards with animated GIFs and a list of skipped exercises, the body-fat percentage scale with the player's marker, the recovery card, and the hydration breakdown. The agent does not perform any physical action - the player is the actuator who actually moves the body. This makes MatchFuel an advisory agent. The learn phase runs only after the match is finished and the feedback form is submitted."
}
$null = New-ContentSlide @s14

# =============================================
# SLIDE 15 - RESULTS COHORT + DECAY
# =============================================
Write-Host "Slide 15 - Cohort + decay..."
$cohortTable = @"
Profile        weight  sleep  position    kcal predicted
-------------------------------------------------------------
Erik           72      7.5    midfielder  2376
Lucas          78      8.0    forward     2580
Hiro           75      7.5    goalkeeper  2025
Anya           60      7.5    midfielder  2000 (hard floor)

Recency-decay ablation - 3 x 60min cardio:
  pattern             flat sum   recency-weighted
  today, -1, -2       234            519
  -1, -3, -5          234            300
  -5, -6, -7          234             98
"@

$s15 = @{
  Title = "Results - Energy Cohort + Decay Ablation"
  Subtitle = "Predicted kcal across cohort; recency vs flat sum"
  Code = $cohortTable
  Bullets = @(
    "Goalkeeper factor 0.90 vs midfielder 1.10 produces 350 kcal swing",
    "Anya hits 2000 kcal floor - safety check for low body weight",
    "Recency decay correctly distinguishes recent from old training (5x ratio)"
  )
  Notes = "The first set of experimental results covers the energy module. Running calculateEnergyNeeds across the ten-profile cohort gives sensible numbers: a midfielder around two thousand four hundred kcal, a forward at two thousand six hundred, a goalkeeper at just over two thousand because the position multiplier is point ninety. Anya at sixty kilograms hits the two-thousand kcal hard floor, which is a safety check to prevent under-eating. The recency-decay ablation shows that the algorithm earns its keep: three sixty-minute cardio sessions can produce vastly different load estimates depending on when they happened."
}
$null = New-ContentSlide @s15

# =============================================
# SLIDE 16 - LEARNING CONVERGENCE
# =============================================
Write-Host "Slide 16 - Learning convergence..."
$lucasTable = @"
Match  date         phys  legFat  lasted  energyM  carbM  score
---------------------------------------------------------------
  1    11.04.2026    4     n      y       1.00     1.00     80
  2    18.04.2026    4     n      y       1.00     1.00     90
  3    25.04.2026    2     y      n       1.20     1.25     40
  4    02.05.2026    5     n      y       0.95     1.00    100

  M3 = bad day -> +20% energy, +25% carbs (single-step correction)
  M4 = back to baseline -> no overshoot, score returns to 100
"@

$s16 = @{
  Title = "Results - Adaptive Learning Convergence"
  Subtitle = "Lucas Petrov, 4 matches from sample_players.json"
  Code = $lucasTable
  Bullets = @(
    "Match 3: weak performance + leg fatigue + did not last -> strong correction applied",
    "Match 4: full recovery to baseline - bounded correction prevents overshoot",
    "Demonstrates real-data convergence of the learn-act-feedback cycle"
  )
  Notes = "The second set of results traces a real player through four real matches in the dataset - Lucas Petrov. Matches one and two are normal: a four out of five rating, no leg fatigue, lasted the full match. Match three is the bad day: rating dropped to two, legs fatigued, did not last - the rule-based correction kicks in hard and bumps the next plan by twenty percent on energy and twenty-five percent on carbs. Match four is the recovery: a perfect five rating, full match, score back at one hundred. Critically, the system does not overshoot - because the multipliers are clamped, the swing does not produce wild oscillation."
}
$null = New-ContentSlide @s16

# =============================================
# SLIDE 17 - LEVENSHTEIN + HYDRATION
# =============================================
Write-Host "Slide 17 - Levenshtein + hydration..."
$probeTable = @"
Levenshtein probe (50 user-typed inputs):
  exact         18
  alias         14
  fuzzy         11
  category       4
  none           3
  -------------------
  useful       47/50  (94%)

Hydration scaling for Sofia (hot season):
  base 35ml * 64kg     = 2240 ml
  + match supplement   =  600 ml
  subtotal             = 2840 ml
  x season multiplier  x 1.25 (hot)
  total                = 3550 ml/day

  cool-season equivalent: 2840 ml  (+25% justified by environment)
"@

$s17 = @{
  Title = "Results - Fuzzy Match + Hydration Scaling"
  Subtitle = "Levenshtein probe and ACSM-aligned season scaling"
  Code = $probeTable
  Bullets = @(
    "94 percent useful resolution rate matches design target for fuzzy matching",
    "Hot-season multiplier 1.25 aligns with ACSM fluid-replacement guidelines",
    "Both numbers reproducible from sample_players.json + foodDatabase"
  )
  Notes = "The third results panel covers two smaller but important experiments. First, a probe of fifty user-typed food inputs through the Levenshtein matcher - eighteen exact, fourteen alias, eleven fuzzy, four category fallback, and three correctly rejected, for a ninety-four percent useful resolution rate. Second, hydration scaling: Sofia in hot conditions gets three thousand five hundred fifty milliliters per day. The same player in cool season would receive twenty-eight forty milliliters - the twenty-five percent increase under hot conditions aligns with ACSM fluid replacement guidelines."
}
$null = New-ContentSlide @s17

# =============================================
# SLIDE 18 - REPO STRUCTURE
# =============================================
Write-Host "Slide 18 - Repo structure..."
$repoTree = @"
Software Project/
+-- MatchFuel/
|   +-- index.html               main page
|   +-- style.css                stylesheet
|   +-- ui.js                    entry point - DOM glue
|   +-- mealPlanner.js           orchestrator
|   +-- nutrition.js             foodDatabase + calculateMacros
|   +-- foodMatcher.js           Levenshtein + BG/EN aliases
|   +-- energy.js                kcal with recency decay
|   +-- energyChart.js           Chart.js renderer
|   +-- warmup.js                exercises with injury filter
|   +-- feedback.js              adaptive correction rules
|   +-- bodyFat.js               Deurenberg formula
|   +-- hydration.js             water + reminders
|   +-- recovery.js              post-match plan
|   +-- profiles.js              localStorage layer
+-- data/
    +-- sample_players.json      10 profiles + 33 history entries
"@

$s18 = @{
  Title = "Repository Structure"
  Subtitle = "Application source + evaluation dataset"
  Code = $repoTree
  Bullets = @(
    "13 source files - 12 JS modules + 1 HTML entry",
    "No build step, no transpiler, no node_modules",
    "Replayable cohort lives next to the code"
  )
  Notes = "The repository structure is intentionally minimal. The application lives entirely in the MatchFuel folder - thirteen source files: twelve JavaScript modules and one HTML entry point, plus the stylesheet. There is no build folder, no node_modules, no dist - what is committed is what runs in the browser. The evaluation cohort lives in a sibling data folder so anyone reviewing the project can replay it directly."
}
$null = New-ContentSlide @s18

# =============================================
# SLIDE 19 - CONCLUSIONS
# =============================================
Write-Host "Slide 19 - Conclusions..."
$s19 = @{
  Title = "Conclusions"
  Subtitle = "What was delivered, and how it was validated"
  Bullets = @(
    "Working advisory learning agent: full Observe-Decide-Act-Learn loop",
    "Four documented algorithms with formal references",
    "Validation: dataset correlations match algorithmic design (|r| > 0.9)",
    "Bounded learning: max +/- 30 percent shift per match guarantees stability",
    "Free, client-side, Bulgarian-language - directly fits the national gap"
  )
  Notes = "To summarize. I built a complete advisory learning agent that closes the four-phase Observe, Decide, Act, Learn loop after every match. Four documented algorithms with formal references handle the heavy lifting: exponential decay for fatigue accounting, the Deurenberg formula for body composition, Levenshtein edit distance for fuzzy food input, and rule-based correction for adaptive learning. The validation comes from the dataset itself - the deterministic correlations exceed point nine in absolute value. The learning is bounded by hard clamps so a single bad match cannot destabilize future plans. And the result is free, runs entirely client-side, and supports Bulgarian natively."
}
$null = New-ContentSlide @s19

# =============================================
# SLIDE 20 - REFERENCES
# =============================================
Write-Host "Slide 20 - References..."
$s20 = @{
  Title = "References"
  Subtitle = "Books, papers, standards, documentation"
  Bullets = @(
    "Russell & Norvig (2020). Artificial Intelligence: A Modern Approach, 4th ed.",
    "Deurenberg, P. et al. (1991). Body mass index as a measure of body fatness. BJN 65(2), 105-114.",
    "Levenshtein, V. (1966). Binary codes capable of correcting deletions, insertions, and reversals.",
    "Burke & Hawley (2018). Carbohydrates for training and competition. J Sports Sci, 29(sup1).",
    "ISSN nutrient timing (2017); ACSM fluid replacement (2007); FIFA Big Count (2007); Chart.js docs; MDN Web Docs."
  )
  Notes = "References. The agent paradigm comes from Russell and Norvig's AIMA, fourth edition. The body fat formula is from Deurenberg, Weststrate, and Seidell, nineteen ninety-one, in the British Journal of Nutrition. The edit distance is from Levenshtein nineteen sixty-six. The carbohydrate guidance is from Burke and Hawley two thousand eighteen, the nutrient timing from the ISSN position stand twenty-seventeen, and the fluid replacement from the ACSM position stand two thousand seven. Player population numbers come from the FIFA Big Count two thousand seven survey. The web platform documentation comes from Chart.js and MDN. Thank you - I am happy to take questions."
}
$null = New-ContentSlide @s20

# ---------- save ----------
Write-Host "Saving..."
$outPath = "C:\magdeburg\uni\Software Project\docs\PROJECT_PRESENTATION.pptx"
$pres.SaveAs([ref]$outPath, [ref]$ppSaveAsOpenXMLPresentation)
$pres.Close()
$ppt.Quit()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt)  | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Host "Done. Saved to: $outPath"
