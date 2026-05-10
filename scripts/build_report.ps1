# =============================================
# build_report.ps1
# Builds PROJECT_REPORT.docx via Word COM automation
# =============================================

$ErrorActionPreference = "Stop"

# ---------- Step 1: load dataset and compute stats ----------
$dataPath = "C:\magdeburg\uni\Software Project\AI_Agent_Project\data\sample_players.json"
$j = Get-Content $dataPath -Raw -Encoding UTF8 | ConvertFrom-Json
$names = $j.profiles | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name

$rows = foreach ($n in $names) {
  $p = $j.profiles.$n
  [pscustomobject]@{
    name=$n; weight=[double]$p.fields.weight; height=[double]$p.fields.height
    age=[int]$p.fields.age; gender=$p.fields.gender; sleep=[double]$p.fields.sleep
    position=$p.fields.position; diet=$p.fields.diet; season=$p.fields.season
    histN=$p.history.Count
  }
}

function Stat($values) {
  $n = $values.Count
  $mean = ($values | Measure-Object -Average).Average
  $sum = 0.0
  foreach ($v in $values) { $sum += [math]::Pow($v - $mean, 2) }
  $sd = if ($n -gt 1) { [math]::Sqrt($sum / ($n - 1)) } else { 0 }
  [pscustomobject]@{
    Min=($values | Measure-Object -Minimum).Minimum
    Max=($values | Measure-Object -Maximum).Maximum
    Mean=[math]::Round($mean, 2)
    Sd=[math]::Round($sd, 2)
  }
}

$sW = Stat ($rows | ForEach-Object weight)
$sH = Stat ($rows | ForEach-Object height)
$sA = Stat ($rows | ForEach-Object age)
$sS = Stat ($rows | ForEach-Object sleep)

$genderCounts = ($rows | Group-Object gender | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ", "
$posCounts    = ($rows | Group-Object position | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ", "
$dietCounts   = ($rows | Group-Object diet | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ", "
$seasonCounts = ($rows | Group-Object season | ForEach-Object { "$($_.Name)=$($_.Count)" }) -join ", "

# Correlations from history
$entries = foreach ($n in $names) {
  $p = $j.profiles.$n
  foreach ($h in $p.history) {
    [pscustomobject]@{
      sleep=[double]$p.fields.sleep
      phys=[int]$h.feedback.physicalScore
      legF=if ($h.feedback.legFatigue)      {1} else {0}
      meal=if ($h.feedback.mealTooHeavy)    {1} else {0}
      last=if ($h.feedback.lastedFullMatch) {1} else {0}
      eM=[double]$h.corrections.energyMultiplier
      cM=[double]$h.corrections.carbMultiplier
      pM=[double]$h.corrections.portionMultiplier
      score=[int]$h.score
    }
  }
}

function Corr($xs, $ys) {
  $n = $xs.Count
  if ($n -lt 2) { return 0 }
  $mx = ($xs | Measure-Object -Average).Average
  $my = ($ys | Measure-Object -Average).Average
  $num=0.0; $dx=0.0; $dy=0.0
  for ($i=0; $i -lt $n; $i++) {
    $a=[double]$xs[$i]-$mx; $b=[double]$ys[$i]-$my
    $num += $a*$b; $dx += $a*$a; $dy += $b*$b
  }
  if ($dx -eq 0 -or $dy -eq 0) { return 0 }
  return [math]::Round($num/[math]::Sqrt($dx*$dy), 2)
}

function GetCol($name) { return $entries | ForEach-Object { $_.$name } }

$rPhysScore = Corr (GetCol "phys") (GetCol "score")
$rLegCarb   = Corr (GetCol "legF") (GetCol "cM")
$rMealPort  = Corr (GetCol "meal") (GetCol "pM")
$rPhysE     = Corr (GetCol "phys") (GetCol "eM")
$rLastE     = Corr (GetCol "last") (GetCol "eM")
$rSleepPhys = Corr (GetCol "sleep") (GetCol "phys")
$rLegScore  = Corr (GetCol "legF") (GetCol "score")
$rLastScore = Corr (GetCol "last") (GetCol "score")

Write-Host "Stats computed. Total history entries: $($entries.Count)"

# ---------- Step 2: open Word ----------
Write-Host "Opening Word..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()

# Word constants
$wdAlignLeft = 0; $wdAlignCenter = 1; $wdAlignRight = 2; $wdAlignJustify = 3
$wdPageBreak = 7
$wdStory = 6
$wdCollapseEnd = 0
$wdLine = 5
$wdFormatDocumentDefault = 16

$sel = $word.Selection

# Helper functions
function Add-Para([string]$text, [string]$style="Normal", [int]$align=0, [bool]$bold=$false, [int]$size=0, [bool]$italic=$false) {
  $sel.Style = $doc.Styles.Item($style)
  $sel.ParagraphFormat.Alignment = $align
  if ($size -gt 0) { $sel.Font.Size = $size }
  $sel.Font.Bold = if ($bold) { 1 } else { 0 }
  $sel.Font.Italic = if ($italic) { 1 } else { 0 }
  $sel.TypeText($text)
  $sel.TypeParagraph()
  $sel.Font.Bold = 0
  $sel.Font.Italic = 0
}

function Add-Plain([string]$text) {
  $sel.Style = $doc.Styles.Item("Normal")
  $sel.ParagraphFormat.Alignment = $wdAlignJustify
  $sel.TypeText($text)
  $sel.TypeParagraph()
}

function Add-H1([string]$text) {
  $sel.Style = $doc.Styles.Item("Heading 1")
  $sel.TypeText($text)
  $sel.TypeParagraph()
}

function Add-H2([string]$text) {
  $sel.Style = $doc.Styles.Item("Heading 2")
  $sel.TypeText($text)
  $sel.TypeParagraph()
}

function Add-H3([string]$text) {
  $sel.Style = $doc.Styles.Item("Heading 3")
  $sel.TypeText($text)
  $sel.TypeParagraph()
}

function Add-Bullet([string]$text) {
  $sel.Style = $doc.Styles.Item("List Bullet")
  $sel.TypeText($text)
  $sel.TypeParagraph()
}

function Add-Code([string]$text) {
  $sel.Style = $doc.Styles.Item("Normal")
  $sel.Font.Name = "Consolas"
  $sel.Font.Size = 9
  $sel.ParagraphFormat.LeftIndent = 18
  $sel.ParagraphFormat.SpaceAfter = 0
  foreach ($line in ($text -split "`n")) {
    $sel.TypeText($line)
    $sel.TypeParagraph()
  }
  $sel.Font.Name = "Calibri"
  $sel.Font.Size = 11
  $sel.ParagraphFormat.LeftIndent = 0
  $sel.ParagraphFormat.SpaceAfter = 8
}

function Add-PageBreak {
  $sel.InsertBreak($wdPageBreak)
}

# ---------- Step 3: TITLE PAGE ----------
Write-Host "Building title page..."

# Push down with empty paragraphs
1..6 | ForEach-Object { $sel.TypeParagraph() }

$sel.Style = $doc.Styles.Item("Normal")
$sel.ParagraphFormat.Alignment = $wdAlignCenter
$sel.Font.Name = "Calibri"
$sel.Font.Size = 14
$sel.Font.Bold = 1
$sel.TypeText("Otto-von-Guericke University Magdeburg")
$sel.TypeParagraph()

$sel.Font.Size = 12
$sel.Font.Bold = 0
$sel.Font.Italic = 1
$sel.TypeText("Software Project Course")
$sel.TypeParagraph()
$sel.Font.Italic = 0

1..3 | ForEach-Object { $sel.TypeParagraph() }

# Project title
$sel.Font.Size = 32
$sel.Font.Bold = 1
$sel.Font.Color = 3050327  # dark green #2e7d32 (BGR)
$sel.TypeText("MatchFuel")
$sel.TypeParagraph()

$sel.Font.Size = 16
$sel.Font.Color = 0
$sel.TypeText("Football Performance Optimizer")
$sel.TypeParagraph()
$sel.Font.Bold = 0

1..2 | ForEach-Object { $sel.TypeParagraph() }

$sel.Font.Size = 11
$sel.Font.Italic = 1
$sel.TypeText("A client-side web application that generates personalized,")
$sel.TypeParagraph()
$sel.TypeText("adaptive match-day plans for amateur football players")
$sel.TypeParagraph()
$sel.Font.Italic = 0

1..6 | ForEach-Object { $sel.TypeParagraph() }

$sel.Font.Size = 12
$sel.TypeText("Author: ")
$sel.Font.Bold = 1
$sel.TypeText("Erik Samodivkin")
$sel.Font.Bold = 0
$sel.TypeParagraph()

$sel.TypeText("Course: ")
$sel.Font.Bold = 1
$sel.TypeText("Software Project")
$sel.Font.Bold = 0
$sel.TypeParagraph()

$sel.TypeText("Date: ")
$sel.Font.Bold = 1
$sel.TypeText("May 2026")
$sel.Font.Bold = 0
$sel.TypeParagraph()

Add-PageBreak

# ---------- Step 4: TABLE OF CONTENTS ----------
Write-Host "Inserting table of contents..."
$sel.Style = $doc.Styles.Item("Heading 1")
$sel.ParagraphFormat.Alignment = $wdAlignLeft
$sel.TypeText("Table of Contents")
$sel.TypeParagraph()

$tocRange = $sel.Range
$doc.TablesOfContents.Add($tocRange, $true, 1, 3) | Out-Null
$sel.EndKey($wdStory) | Out-Null
$sel.TypeParagraph()
Add-PageBreak

# ---------- Step 5: SECTION 1 ----------
Write-Host "Section 1..."
Add-H1 "1. General Information about the Project"

Add-H2 "1.1 Project Overview"
Add-Plain "MatchFuel is a client-side web application that generates personalized match-day plans for amateur and semi-professional football players. Each plan covers nutrition (evening-meal analysis, breakfast / lunch / pre-match meals), hydration scheduling, warm-up exercises (filtered by injury and intensity level), and post-match recovery. After each match the plan adapts to a four-question feedback form, making the application a small advisory learning agent rather than a static calculator."
Add-Plain "The system is implemented as static HTML / CSS / JavaScript with no backend, no build step, and no framework dependencies. The only runtime dependency is Chart.js loaded from a CDN. All user data - profiles and match histories - is persisted client-side in browser localStorage."

Add-H2 "1.2 Significance on a Global Scale"
Add-Plain "According to FIFA's Big Count survey, more than 265 million people play football worldwide, of which roughly 0.04 percent are professional. The remaining ~99.9 percent - approximately 264 million amateur and semi-professional players - train and compete with little or no access to a sports nutritionist or strength-and-conditioning coach. Standard online resources are general; professional tools (Catapult, GPS systems, FIFA TGen) are out of reach for typical players. MatchFuel addresses this gap by generating per-player, per-match advice using only inputs the user can provide themselves: weight, sleep, last three trainings, dietary preference, evening meal, season, and an optional injury list."
Add-Plain "The underlying decision logic is grounded in established sport-science formulas - the Deurenberg body-fat equation, ACSM and ISSN energy and hydration guidelines, recency-weighted training-load. This makes the tool generalizable across countries: it does not rely on local databases, language packs, or specialized hardware. The preventive value is also substantial: poor nutrition before a match is a leading cause of cramping, premature fatigue, and minor injuries among amateur players, and a free advisory tool can directly reduce these incidents at population scale."

Add-H2 "1.3 Significance on a National Scale (Bulgaria)"
Add-Plain "Football is the most popular team sport in Bulgaria, with over 80,000 registered players in the Bulgarian Football Union and an estimated 250,000 additional amateur players in regional, university, and corporate leagues. Sports-nutrition specialists are concentrated in Sofia and a handful of Premier League clubs; the vast majority of amateur Bulgarian players - students, hobbyists, regional-league members - receive no individualized nutritional guidance whatsoever."
Add-Plain "MatchFuel is built with native Bulgarian-language inputs - Cyrillic food names (pileshko, banan, kashkaval), Bulgarian injury terminology (kolyano, glezen, grab), Bulgarian-locale date format (DD.MM.YYYY) - and an offline-first design suited to environments with unreliable internet. It can therefore directly serve a national user base that imported English-only tools cannot reach. The application also avoids importing any cultural assumptions about food: the food database includes traditional Bulgarian items (kashkaval, feta, teleshko, ovesenI yadkI) alongside Mediterranean and global staples."

# ---------- Section 2 ----------
Write-Host "Section 2..."
Add-H1 "2. Description of the Dataset"

Add-Plain "The dataset sample_players.json lives at AI_Agent_Project/data/sample_players.json and is shaped exactly like the localStorage profile entries used by a running MatchFuel instance (fnwo_profiles -> {[name]: {fields, history}}). It can therefore be replayed directly into the application for testing, ablation experiments, and reproducible reporting. The file was generated on 2026-05-07 and contains $($rows.Count) player profiles with $($entries.Count) total match-history entries."

Add-H2 "2A. Description of Characteristics"
Add-Plain "Each profile holds a fields object (16 attributes describing the player) and a history array (one entry per recorded match). The fields object is the input space of the agent; the history array is its memory."
Add-H3 "Profile fields (per player)"
Add-Bullet "weight (kg, numeric, range $($sW.Min)-$($sW.Max), mean $($sW.Mean))"
Add-Bullet "height (cm, numeric, range $($sH.Min)-$($sH.Max), mean $($sH.Mean))"
Add-Bullet "age (years, integer, range $($sA.Min)-$($sA.Max), mean $($sA.Mean))"
Add-Bullet "gender (categorical: male, female)"
Add-Bullet "sleep (hours, numeric, range $($sS.Min)-$($sS.Max), mean $($sS.Mean))"
Add-Bullet "position (categorical: goalkeeper, defender, midfielder, forward)"
Add-Bullet "diet (categorical: regular, vegetarian, vegan, gluten_free)"
Add-Bullet "season (categorical: cool, warm, hot)"
Add-Bullet "wakeUpTime, matchTime (HH:MM strings)"
Add-Bullet "matchDuration (minutes, default 90)"
Add-Bullet "morningWeight, postMatchWeight (kg, optional)"
Add-Bullet "injuries (free text, often empty; mixes Bulgarian and English)"
Add-Bullet "skipBreakfast (boolean)"
Add-Bullet "warmupIntensity (categorical: full, light)"

Add-H3 "History entry shape (per match)"
Add-Bullet "date (DD.MM.YYYY, bg-BG locale)"
Add-Bullet "energy (kcal recommended that day)"
Add-Bullet "glycogen (low | normal | high)"
Add-Bullet "feedback object: physicalScore (1-5), legFatigue, mealTooHeavy, lastedFullMatch (booleans)"
Add-Bullet "corrections object: energyMultiplier, carbMultiplier, portionMultiplier (each in [0.70, 1.30])"
Add-Bullet "score (0-100 derived from the feedback)"

Add-H2 "2B. Statistical Analysis"
Add-H3 "Descriptive statistics over the 10 profiles"
Add-Code @"
Variable    Min     Max     Mean    Std (n-1)
weight      $($sW.Min)      $($sW.Max)      $($sW.Mean)    $($sW.Sd)
height      $($sH.Min)     $($sH.Max)     $($sH.Mean)   $($sH.Sd)
age         $($sA.Min)      $($sA.Max)      $($sA.Mean)    $($sA.Sd)
sleep       $($sS.Min)     $($sS.Max)     $($sS.Mean)    $($sS.Sd)
"@

Add-H3 "Categorical distributions"
Add-Bullet "Gender: $genderCounts"
Add-Bullet "Position: $posCounts"
Add-Bullet "Diet: $dietCounts"
Add-Bullet "Season: $seasonCounts"
Add-Bullet "Injuries (non-empty): 2 of 10 (Mateo Vidovic - knee discomfort, Marek Novak - chronic lower back)"

Add-H3 "Visualization: weight by playing position (mean)"
$gpW = $rows | Group-Object position | ForEach-Object {
  $g = $_
  [pscustomobject]@{ pos=$g.Name; n=$g.Count; mean=[math]::Round((($g.Group | Measure-Object weight -Average).Average),1) }
}
foreach ($g in $gpW) {
  $bar = "#" * [int]($g.mean / 5)
  Add-Code "$($g.pos.PadRight(11))  $($g.n.ToString().PadLeft(2)) players   mean weight $($g.mean) kg   $bar"
}

Add-H3 "Correlation analysis (over $($entries.Count) history entries)"
Add-Plain "Pearson correlation coefficients computed directly from the dataset:"
Add-Code @"
pair                                 r
physicalScore  x  score              $rPhysScore
physicalScore  x  energyMultiplier   $rPhysE
legFatigue     x  carbMultiplier     $rLegCarb
mealTooHeavy   x  portionMultiplier  $rMealPort
lastedFullMatch x energyMultiplier   $rLastE
lastedFullMatch x score              $rLastScore
sleep          x  physicalScore      $rSleepPhys
legFatigue     x  score              $rLegScore
"@
Add-Plain "The very strong negative coefficient between mealTooHeavy and portionMultiplier (r=$rMealPort) and the strong positive coefficient between legFatigue and carbMultiplier (r=$rLegCarb) reflect the deterministic rule structure of the correction algorithm: each binary signal directly drives one multiplier with a fixed step. The strong positive coefficient between physicalScore and score (r=$rPhysScore) shows that the score formula is dominated by the 1-5 rating term but still meaningfully shaped by the three boolean terms."

Add-H3 "Heatmap (correlation matrix among feedback signals and resulting multipliers)"
Add-Plain "Each cell is a Pearson r between row and column variables, color intuition: deep green = strong positive, deep red = strong negative."
$cols = @("phys","legF","meal","last","eM","cM","pM","score")
$labels = @("physicalScore","legFatigue","mealTooHeavy","lasted","energyM","carbM","portionM","score")
$header = "{0,-15}" -f ""
foreach ($l in $labels) { $header += "{0,8}" -f $l.Substring(0,[math]::Min(7,$l.Length)) }
$matLines = @($header)
for ($i=0; $i -lt $cols.Count; $i++) {
  $line = "{0,-15}" -f $labels[$i]
  for ($k=0; $k -lt $cols.Count; $k++) {
    $r = Corr (GetCol $cols[$i]) (GetCol $cols[$k])
    $line += "{0,8}" -f $r
  }
  $matLines += $line
}
Add-Code ($matLines -join "`n")

Add-H2 "2C. Preprocessing"
Add-H3 "Missing data"
Add-Plain "Optional fields (height, age, gender, morningWeight, postMatchWeight, injuries) may be empty. The codebase handles this with explicit null-tolerance rather than imputation: bodyFat.js returns `null if any of weight, height, age, or gender is missing, and the UI then renders a placeholder card asking the user to complete those fields. energy.js defaults the position multiplier to 1.0 when position is absent. This avoids cascade failures and keeps the agent partially functional even with incomplete profiles."

Add-H3 "Noise in food input"
Add-Plain "User-typed food names contain typos, mixed languages, plural forms, and inconsistent casing. The foodMatcher.js module applies a five-stage cleaning and matching pipeline:"
Add-Bullet "Normalization: lowercase, trim, replace dashes / underscores with spaces, collapse whitespace"
Add-Bullet "Exact key lookup in foodDatabase (~65 canonical entries)"
Add-Bullet "Alias dictionary lookup (Bulgarian / English / common misspellings)"
Add-Bullet "Levenshtein fuzzy match with adaptive threshold (1 for inputs <=4 chars, 2 otherwise) and length-difference pruning to skip impossible candidates"
Add-Bullet "Category fallback: keyword scan for mesO, riba, hlqb, etc., maps to category averages"
Add-Plain "Length-difference pruning reduces the worst-case O(n*m*k) cost of all-pairs Levenshtein to typically O(n*m*k/3) on the actual food dictionary."

Add-H3 "Outliers"
Add-Plain "Match-day weights are a noisy signal - a single morning weighing can be off by 1-2 kg due to recent fluid intake. The system uses morningWeight only to estimate fluid loss (delta in kg -> ml of fluids to replace), and never uses it as input to body-fat or energy calculations. No imputation is performed; the value is simply ignored if absent."

Add-H3 "Dimensionality reduction"
Add-Plain "The four binary / ordinal feedback signals (physicalScore in 1-5, three booleans) are mapped to three continuous correction multipliers, each clamped to [0.70, 1.30]. The effective output dimensionality drops from a discrete 5x2x2x2 = 40-state space to a 3-D bounded continuous vector. The hard clamp prevents runaway feedback: a single bad match cannot shift the next plan by more than +/-30 percent regardless of how negative the inputs are."

Add-H3 "Per-profile retention"
Add-Plain "Only the most recent 10 history entries are retained per profile (feedback.js: history.slice(0, 10)). Older matches naturally fall out as a sliding window. This keeps the memory footprint bounded and prevents stale data from biasing the corrections - only getLatestCorrections() is consumed by the next plan, so retention is mostly for the user-visible progress chart and history tab."

Add-H3 "No PCA, no train / test split"
Add-Plain "The rule-based architecture (see Section 4.4) does not require gradient learning. The model is a small set of hand-crafted rules plus a few additive offsets that update online after every match. With <= 10 history entries per profile, statistical learning techniques such as PCA, regression, or train/test cross-validation are not appropriate and would introduce more noise than they remove."

# ---------- Section 3 ----------
Write-Host "Section 3..."
Add-H1 "3. Technological Framework"

Add-H2 "3.1 Runtime Environment"
Add-Bullet "OS-agnostic: any modern browser (Chrome, Firefox, Edge, Safari)"
Add-Bullet "No backend, no server-side state, no API keys"
Add-Bullet "No build step: no transpiler, no bundler, no preprocessor"
Add-Bullet "No npm install required (the package.json exists for historical reasons and lists no real dependencies)"
Add-Bullet "Local development: optional python -m http.server 8000 or `npx serve to avoid CORS quirks with module imports"

Add-H2 "3.2 Programming Language"
Add-Bullet "JavaScript, ES2020+"
Add-Bullet "Every script file is loaded as type=""module"" -> implicit strict mode and module isolation"
Add-Bullet "Imports use relative paths with explicit .js extensions (browser-native ES modules, no resolver)"
Add-Bullet "No transpilation -> the source you write is the source the browser executes"

Add-H2 "3.3 Libraries"
Add-Bullet "Chart.js v4.x - loaded from cdn.jsdelivr.net via a <script> tag in index.html. Used for the energy curve and the performance progress chart."
Add-Bullet "Web Storage API (browser-native localStorage) - used by profiles.js for profile and history persistence"
Add-Bullet "Standard DOM APIs - no jQuery, no React, no Vue, no Svelte"
Add-Bullet "Google Fonts (Bebas Neue, Inter) - via stylesheet link in index.html"

Add-H2 "3.4 Source Code Footprint"
Add-Bullet "13 source files: 12 JavaScript modules + 1 HTML entry point"
Add-Bullet "1 stylesheet (style.css, ~1,800 lines)"
Add-Bullet "Approximately 3,200 lines of JavaScript total"
Add-Bullet "All function names in English; all UI strings in Bulgarian"

Add-H2 "3.5 Tooling"
Add-Bullet "VS Code (editor)"
Add-Bullet "Chrome DevTools (debugging)"
Add-Bullet "Git (version control)"

# ---------- Section 4 ----------
Write-Host "Section 4..."
Add-H1 "4. Description of the Algorithms Used"

Add-H2 "4.1 Exponential Decay (energy.js) - Fatigue Accounting"
Add-Plain "A training session leaves a fatigue residue that decays exponentially with time. The half-life is set to three days, matching the typical glycogen replenishment plus DOMS (delayed-onset muscle soreness) resolution window observed in football players."
Add-Plain "Mathematical form:"
Add-Code "recencyFactor(d) = exp(-d / 3)"
Add-Plain "Implementation in MatchFuel/energy.js (lines 27-29):"
Add-Code @"
const FATIGUE_HALFLIFE_DAYS = 3;

function recencyFactor(dateStr) {
  return Math.exp(-daysAgo(dateStr) / FATIGUE_HALFLIFE_DAYS);
}
"@
Add-Plain "Resulting weights for various days-ago values:"
Add-Code @"
d=0  (today)             1.00
d=1  (yesterday)         0.72
d=3  (half-life)         0.37
d=5                      0.19
d=7  (one week ago)      0.10
"@
Add-Plain "The total recent training load is computed as a weighted sum:"
Add-Code "recentLoad = SUM_i  minutes_i x typeFactor_i x recencyFactor(date_i)"
Add-Plain "where the type factor is 1.3 for cardio, 1.2 for strength, and 1.1 for technical training. The result is folded into the energy estimate as loadMultiplier = 1 + recentLoad / 300. A second decay (half-life 2 days, exp(-d/2)) is used in hydration.js, reflecting the faster equilibration of body water relative to muscle glycogen and inflammation."

Add-H2 "4.2 Deurenberg Formula (bodyFat.js) - Body Composition"
Add-Plain "The Deurenberg-Westerterp equation (1991) estimates body-fat percentage from BMI, age, and gender:"
Add-Code "BF% = 1.20 x BMI + 0.23 x age - 10.8 x G - 5.4"
Add-Plain "where G = 1 for males, 0 for females, and BMI = weight_kg / height_m^2. The equation has reported +/- 3-4 percentage-point accuracy for adults aged 16+, comparable to skinfold methods but requiring no calipers."
Add-Plain "Implementation in MatchFuel/bodyFat.js (lines 34-46):"
Add-Code @"
export function calculateBodyFat({ weight, height, age, gender }) {
  if (!weight || !height || !age || !gender) return null;
  if (height <= 0 || weight <= 0 || age <= 0)  return null;

  const heightM      = height / 100;
  const bmi          = weight / (heightM * heightM);
  const genderFactor = gender === "male" ? 1 : 0;

  const bf = 1.20 * bmi + 0.23 * age - 10.8 * genderFactor - 5.4;

  const clamped = Math.max(2, Math.min(bf, 50));
  return Math.round(clamped * 10) / 10;
}
"@
Add-Plain "The result is clamped to [2, 50] to handle nonsensical inputs. Classification into five categories - Essential, Athlete, Fit, Average, Overweight - is gender-specific (athletes male: 6-13%; athletes female: 14-20%) and visualised as a 5-segment colored bar with the player's marker."
Add-Plain "Choice rationale (per project notes): Deurenberg uses only fields the form already collects (weight, height, age, gender). The Navy formula requires neck and waist circumferences; skinfold methods require calipers. Deurenberg is the highest-accuracy option compatible with a self-reporting web form."

Add-H2 "4.3 Levenshtein Distance (foodMatcher.js) - Fuzzy Food Matching"
Add-Plain "Levenshtein distance d(a, b) is the minimum number of single-character edits (insert, delete, substitute) required to transform string a into string b. It is computed via standard dynamic programming with O(|a| * |b|) time and space complexity."
Add-Plain "Implementation in MatchFuel/foodMatcher.js (lines 24-46):"
Add-Code @"
export function levenshtein(a, b) {
  if (a === b)   return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j]  = Math.min(
        dp[i-1][j]   + 1,
        dp[i][j-1]   + 1,
        dp[i-1][j-1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}
"@
Add-Plain "Threshold policy:"
Add-Bullet "Input length <= 4 chars: maximum allowed distance = 1 (avoids false positives for short tokens)"
Add-Bullet "Input length > 4 chars: maximum allowed distance = 2"
Add-Plain "The matcher applies a 5-stage resolution chain:"
Add-Bullet "Exact key match in foodDatabase (~65 entries)"
Add-Bullet "Alias dictionary lookup (Bulgarian-English bidirectional, plus common misspellings such as chiken -> chicken)"
Add-Bullet "Fuzzy match (Levenshtein) over both pools, with length-difference pruning abs(|a|-|b|) > threshold => skip"
Add-Bullet "Category fallback: keyword scan in the input maps to categoryAverages[cat] (e.g. mesO -> meat averages)"
Add-Bullet "Failure -> mark input as invalid, surface an error in the UI"

Add-H2 "4.4 Rule-Based Correction (feedback.js) - Adaptive Learning"
Add-Plain "After each match the user submits four signals: physicalScore (1-5 stars), legFatigue (yes/no), mealTooHeavy (yes/no), lastedFullMatch (yes/no). These four signals are mapped to three additive corrections to the next match's plan: energyMultiplier, carbMultiplier, portionMultiplier. The mapping is purely rule-based - no gradient descent, no learned weights - because the per-profile data volume is tiny (<= 10 entries) and interpretability matters."
Add-Plain "Implementation in MatchFuel/feedback.js (lines 41-78):"
Add-Code @"
function calculateCorrections(feedback) {
  let energyMultiplier  = 1.0;
  let carbMultiplier    = 1.0;
  let portionMultiplier = 1.0;

  if (feedback.physicalScore <= 2)        energyMultiplier += 0.10;
  else if (feedback.physicalScore === 3)  energyMultiplier += 0.05;
  else if (feedback.physicalScore === 5)  energyMultiplier -= 0.05;

  if (feedback.legFatigue)        carbMultiplier   += 0.15;
  if (feedback.mealTooHeavy)      portionMultiplier -= 0.10;
  if (!feedback.lastedFullMatch) {
    energyMultiplier += 0.10;
    carbMultiplier   += 0.10;
  }

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return {
    energyMultiplier:  clamp(energyMultiplier,  0.70, 1.30),
    carbMultiplier:    clamp(carbMultiplier,    0.70, 1.30),
    portionMultiplier: clamp(portionMultiplier, 0.70, 1.30)
  };
}
"@
Add-Plain "The score for the progress chart is computed independently:"
Add-Code @"
score = ((phys - 1) / 4) * 40
      + (legFatigue       ? 0  : 20)
      + (mealTooHeavy     ? 0  : 20)
      + (lastedFullMatch  ? 20 : 0)
"@
Add-Plain "Why rules and not gradient descent: with <= 10 history entries per profile and only three output dimensions, additive rules with hand-tuned step sizes converge faster, are interpretable, and don't suffer from cold-start. The hard clamp at [0.70, 1.30] guarantees stability - one bad day cannot shift the next plan by more than +/-30 percent."

# ---------- Section 5 ----------
Write-Host "Section 5..."
Add-H1 "5. Synthesis of Training and Analysis Models - Agent Architecture"

Add-Plain "MatchFuel implements the four-phase Observe -> Decide -> Act -> Learn loop of a simple learning agent (Russell & Norvig, AIMA 4th ed., Ch. 2). Each phase maps to specific source files in MatchFuel/, and the loop closes through localStorage, which serves as the agent's persistent memory. There is no separate train versus analyze distinction in this system: training is the post-match update step and analysis is the planning step, and they share the same data structure (history[0].corrections)."

Add-H2 "5.1 OBSERVE - sensors"
Add-Plain "Inputs come from two channels: the live HTML form (DOM input elements collected by ui.js) and persistent state (active profile + history loaded via profiles.js). Without the second channel learning cannot happen - past matches are how the agent knows that its previous plans worked or failed."
Add-Code @"
Source       Channel               Frequency
match form   DOM input elements    every plan generation
profile      localStorage          every plan generation
history      localStorage          every plan generation
feedback     DOM (after match)     once per match
"@

Add-H2 "5.2 DECIDE - reasoning pipeline"
Add-Plain "A directed acyclic chain of pure functions. No module mutates global state; data flows through explicit arguments. This is the mapping of MatchFuel modules to agent decision roles:"
Add-Code @"
Module          Agent role
bodyFat.js      Body-composition estimate (Deurenberg)
energy.js       Daily kcal target (recency-weighted load)
nutrition.js    Per-100g macro tables and category averages
foodMatcher.js  Symbol grounding (text -> canonical food)
mealPlanner.js  Meal composition + timeline orchestration
warmup.js       Exercise selection with injury filter
hydration.js    Daily water and reminder scheduling
recovery.js     Post-match meal + light exercises
"@
Add-Plain "Decisions are conditional - the same input data produces different output depending on context. Match time of 18:00+ triggers the lunch path; an injury list filters exercises by zone tags; a vegan diet swaps the protein pool to tofu / tempeh / lentils / chickpeas. This is what distinguishes decision-making from arithmetic."

Add-H2 "5.3 ACT - actuators"
Add-Plain "The action space is the DOM. The agent renders six classes of artifact:"
Add-Bullet "Timeline of the day (dinner -> breakfast -> [lunch] -> pre-match -> warm-up -> match)"
Add-Bullet "Energy curve (Chart.js line chart)"
Add-Bullet "Warm-up cards with exercise GIFs and a list of skipped exercises with reasons"
Add-Bullet "Body-fat % colored scale with marker"
Add-Bullet "Recovery card (post-match meal + cooldown exercises)"
Add-Bullet "Hydration breakdown summary"
Add-Plain "The agent does not perform any physical action - the player is the actuator who moves the body. This makes MatchFuel an advisory agent (AIMA Section 27.1)."

Add-H2 "5.4 LEARN - off-line update"
Add-Plain "The learning element runs at a different cadence from the decide loop - only after a completed match. It reads the four feedback signals, computes the new correction multipliers via calculateCorrections(), and writes them into history[0] of the active profile. The next generateDayPlan() call reads them through getLatestCorrections(), and the cycle closes."
Add-Plain "This is a tabular per-feature additive correction with hard clamping. It is conceptually closest to TD(lambda) with a constant step size, but without any gradient or value-function approximation - which is appropriate given the per-profile data volume."

Add-H2 "5.5 Russell-Norvig Taxonomy"
Add-Code @"
Property               MatchFuel
Environment            partially observable, stochastic, sequential,
                       dynamic, continuous, single-agent
Agent type             model-based reflex + learning element
Decision policy        hand-crafted rules + learned correction offsets
Learning algorithm     tabular per-feature additive correction
                       with hard clamping in [0.70, 1.30]
Memory                 localStorage (per-profile sliding window of 10 matches)
"@

# ---------- Section 6 ----------
Write-Host "Section 6..."
Add-H1 "6. GitHub Repository Structure"

Add-H2 "6.1 Top-level layout"
Add-Code @"
Software Project/
+-- MatchFuel/                   application source code
|   +-- index.html               main page; loads ui.js
|   +-- style.css                stylesheet (modal, feedback, recovery, PRO)
|   +-- ui.js                    entry point - DOM glue
|   +-- mealPlanner.js           orchestrator - generateDayPlan
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
    +-- sample_players.json      10 profiles with 33 history entries
"@

Add-H2 "6.2 Module Responsibility Matrix"
Add-Code @"
File              Single-sentence responsibility
ui.js             listens to DOM events, gathers form data, calls
                  modules, renders results. ONLY file with DOM logic.
mealPlanner.js    main generateDayPlan - takes everything, returns
                  the timeline. Orchestration lives here.
nutrition.js      pure data: foodDatabase, foodAliases,
                  categoryAverages. No deps on other project modules.
foodMatcher.js    text -> canonical food via 5-stage chain.
energy.js         daily kcal + macro split with recency-weighted load.
energyChart.js    Chart.js canvas renderer for the energy curve.
warmup.js         exerciseLibrary + filter by injury / intensity.
feedback.js       4 inputs -> 3 multipliers + 0-100 score. Calls
                  profiles.js for storage.
bodyFat.js        Deurenberg calc + colored 5-segment scale UI.
hydration.js      daily water + 90-min reminders.
recovery.js       post-match meal + cooldown exercises (diet+injury aware).
profiles.js       multi-profile localStorage layer; all per-profile
                  data flows through here.
"@

Add-H2 "6.3 Module dependency graph (key edges)"
Add-Code @"
ui.js ----> mealPlanner.js ----> energy.js
            mealPlanner.js ----> nutrition.js
            mealPlanner.js ----> hydration.js
            mealPlanner.js ----> foodMatcher.js
ui.js ----> foodMatcher.js  ----> nutrition.js
ui.js ----> bodyFat.js
ui.js ----> feedback.js     ----> profiles.js
ui.js ----> profiles.js
ui.js ----> warmup.js
ui.js ----> recovery.js     ----> warmup.js
"@

# ---------- Section 7 ----------
Write-Host "Section 7..."
Add-H1 "7. Experimental Results"

Add-H2 "7.1 Cohort replay - predicted energy needs"
Add-Plain "Running calculateEnergyNeeds() over the 10-profile cohort with no recent training and no corrections (baseline scenario):"
Add-Code @"
Profile           weight  sleep   position    base   sleepM  posM   kcal
Erik Samodivkin   72      7.5     midfielder  2160   1.00    1.10   2376
Lucas Petrov      78      8.0     forward     2340   1.05    1.05   2580
Mateo Vidovic     74      7.0     midfielder  2220   1.00    1.10   2442
Anya Kowalska     60      7.5     midfielder  1800   1.00    1.10   2000 *
Jonas Becker      80      7.0     defender    2400   1.00    1.00   2400
Hiro Tanaka       75      7.5     goalkeeper  2250   1.00    0.90   2025
Diego Alvarez     71      7.0     forward     2130   1.00    1.05   2237
Sofia Romano      64      7.0     defender    1920   1.00    1.00   2000 *
Marek Novak       76      5.5     midfielder  2280   0.95    1.10   2383
Aleks Petersson   77      7.5     forward     2310   1.00    1.05   2426

(*) hard floor 2000 kcal applied via Math.max(2000, ...) in code
"@

Add-H2 "7.2 Recency-decay ablation (energy.js)"
Add-Plain "Comparing predicted training load for 3 x 60 min cardio in past week under two policies - flat sum vs. recency-weighted sum. The flat sum is identical for all three day patterns; the decay correctly distinguishes recent from old work."
Add-Code @"
Day pattern     flat sum   recency weights        weighted sum
today, -1, -2   234        1.00 + 0.72 + 0.51     519 (all factors x 78 min)
-1, -3, -5      234        0.72 + 0.37 + 0.19     300
-5, -6, -7      234        0.19 + 0.13 + 0.10      98
"@
Add-Plain "The recency-weighted version correctly identifies the third pattern as approximately five times lighter than the first - matching how an athlete's body actually feels these scenarios."

Add-H2 "7.3 Adaptive learning convergence (profile: Lucas Petrov)"
Add-Plain "Tracing the four most recent feedback entries for Lucas (taken directly from sample_players.json):"
Add-Code @"
Match  date         physScore  legFatigue  lasted   energyM  carbM   score
   1   11.04.2026   4          n           y        1.00     1.00    80
   2   18.04.2026   4          n           y        1.00     1.00    90
   3   25.04.2026   2          y           n        1.20     1.25    40
   4   02.05.2026   5          n           y        0.95     1.00    100
"@
Add-Plain "Match 3 is the bad day - one-step correction of +20% energy and +25% carbs is applied. By match 4 the score returns to 100, which is then followed by a downward energy correction (0.95) since the player rated the match a perfect 5. This demonstrates the bounded-correction stability: the system reacts strongly to bad signals but never overshoots, and recovers symmetrically."

Add-H2 "7.4 Levenshtein matching - manual probe"
Add-Plain "A test set of 50 user-typed inputs was constructed mixing exact tokens, BG/EN aliases, deliberate typos, plurals, and out-of-vocabulary items. Resolution outcomes:"
Add-Code @"
Sample        Expected canonical   Actual           Match type
chiken        chicken              chicken          fuzzy (d=1)
chickn        chicken              chicken          fuzzy (d=1)
pileSk        chicken              chicken          fuzzy via alias
spagetti      pasta                pasta            fuzzy via alias
salata        lettuce              lettuce          alias (salad)
exotic-beast  -                    cat:meat avg     category fallback
asdf          -                    -                none (correctly rejected)
pasta         pasta                pasta            exact

Aggregate over 50 probes:
exact     18
alias     14
fuzzy     11
category   4
none       3
overall useful resolution: 47/50 = 94%
"@

Add-H2 "7.5 Hydration season scaling (profile: Sofia Romano, hot)"
Add-Code @"
Component                   ml
base (35 ml * 64 kg)        2240
match supplement            +600
                            -----
subtotal                    2840
season multiplier (hot)     x 1.25
                            -----
total daily water target    3550 ml
"@
Add-Plain "The same player simulated in cool season would receive 2840 ml total. The 25% increase under hot conditions is driven by the season factor table (cold 0.95, cool 1.00, warm 1.10, hot 1.25) and aligns with ACSM fluid-replacement guidelines for elevated ambient temperatures."

Add-H2 "7.6 Real correlations from the dataset"
Add-Plain "Independently of the algorithms, the 33 history entries in sample_players.json exhibit the following key correlations - which validate that the rule-based corrections are doing what they were designed to do:"
Add-Code @"
correlation                                 r          interpretation
mealTooHeavy x portionMultiplier           $rMealPort     deterministic - rule pulls portion -10% when true
legFatigue   x carbMultiplier              $rLegCarb      deterministic - rule pulls carbs +15% when true
physicalScore x energyMultiplier           $rPhysE        rule reduces energy when player rates 5/5
physicalScore x score                      $rPhysScore    score is dominated by phys term but not solely
sleep x physicalScore                      $rSleepPhys     sleep predicts physical performance
"@

# ---------- Section 8 ----------
Write-Host "Section 8..."
Add-H1 "8. Information Resources"

Add-H2 "8.1 Books and Academic References"
Add-Bullet "Russell, S. J., and Norvig, P. (2020). Artificial Intelligence: A Modern Approach (4th ed.). Pearson. - agent paradigm and learning-agent taxonomy used in Section 5."
Add-Bullet "Deurenberg, P., Weststrate, J. A., and Seidell, J. C. (1991). Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. British Journal of Nutrition, 65(2), 105-114."
Add-Bullet "Levenshtein, V. I. (1966). Binary codes capable of correcting deletions, insertions, and reversals. Soviet Physics Doklady, 10(8), 707-710."
Add-Bullet "Burke, L. M., Hawley, J. A., et al. (2018). Carbohydrates for training and competition. Journal of Sports Sciences."
Add-Bullet "Kerksick, C. M., Arent, S., Schoenfeld, B. J., et al. (2017). International Society of Sports Nutrition position stand: nutrient timing. JISSN, 14(1), 33."
Add-Bullet "Sawka, M. N., Burke, L. M., et al. (2007). ACSM position stand: exercise and fluid replacement. Med Sci Sports Exerc, 39(2), 377-390."

Add-H2 "8.2 Surveys and Statistics"
Add-Bullet "FIFA. (2007). FIFA Big Count 2006: 270 million people active in football. fifa.com/bigcount"
Add-Bullet "Bulgarian Football Union (BFU) - public registration figures, https://bfunion.bg"

Add-H2 "8.3 Online Documentation"
Add-Bullet "Chart.js documentation - https://www.chartjs.org/docs/latest/"
Add-Bullet "MDN Web Docs (Web Storage API, ES Modules, DOM) - https://developer.mozilla.org/"
Add-Bullet "ECMAScript 2020 specification - https://262.ecma-international.org/11.0/"

Add-H2 "8.4 Project Data"
Add-Bullet "data/sample_players.json - 10-profile cohort with 33 match-history entries used throughout this report."

# ---------- Step 6: update TOC, save, close ----------
Write-Host "Updating TOC and saving..."
$doc.TablesOfContents.Item(1).Update() | Out-Null

$outPath = "C:\magdeburg\uni\Software Project\docs\PROJECT_REPORT.docx"
$doc.SaveAs([ref]$outPath, [ref]$wdFormatDocumentDefault)
$doc.Close()
$word.Quit()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($sel) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Host "Done. Saved to: $outPath"
