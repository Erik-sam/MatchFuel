import { calculateEnergyNeeds, calculateMacroNeeds }       from "./energy.js";
import { foodDatabase, calculateMacros }                    from "./nutrition.js";
import { calculateDailyWater, generateHydrationReminders } from "./hydration.js";

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours   = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

export const dietSources = {
  regular: {
    proteins: ["chicken", "fish", "egg"],
    carbs:    ["rice", "pasta", "bread", "oats"]
  },
  vegetarian: {
    proteins: ["egg", "greek_yogurt", "cottage_cheese"],
    carbs:    ["rice", "pasta", "bread", "oats"]
  },
  vegan: {
    proteins: ["tofu", "tempeh", "lentils", "chickpeas"],
    carbs:    ["rice", "pasta", "bread", "oats"]
  },
  gluten_free: {
    proteins: ["chicken", "fish", "egg"],
    carbs:    ["rice", "brown_rice", "quinoa", "potato"]
  }
};

function getDietSources(diet) {
  return dietSources[diet] || dietSources.regular;
}

const portionLimits = {
  rice:           250,
  pasta:          250,
  bread:          150,
  oats:           120,
  potato:         300,
  chicken:        250,
  fish:           200,
  egg:            200,
  brown_rice:     250,
  quinoa:         250,
  greek_yogurt:   300,
  cottage_cheese: 250,
  tofu:           250,
  tempeh:         200,
  lentils:        250,
  chickpeas:      250,
};

const DEFAULT_MAX = 200;

function clampGrams(food, grams) {
  const max = portionLimits[food] ?? DEFAULT_MAX;
  return Math.min(Math.round(grams), max);
}

function getRandomUnique(arr, count) {
  return [...arr]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function buildMealFromMacros(macros, diet) {

  const { proteins, carbs } = getDietSources(diet);

  const [carbFood1, carbFood2] = getRandomUnique(carbs, 2);
  const [proteinFood]          = getRandomUnique(proteins, 1);

  const data1 = foodDatabase[carbFood1];
  const data2 = foodDatabase[carbFood2];
  const dataP = foodDatabase[proteinFood];

  const rawGrams1 = (macros.carbs * 0.6) / data1.carbs * 100;
  const rawGrams2 = (macros.carbs * 0.4) / data2.carbs * 100;
  const rawGramsP = macros.protein / dataP.protein * 100;

  const grams1 = clampGrams(carbFood1, rawGrams1);
  const grams2 = clampGrams(carbFood2, rawGrams2);
  const gramsP = clampGrams(proteinFood, rawGramsP);

  return [
    { food: carbFood1,   grams: grams1 },
    { food: carbFood2,   grams: grams2 },
    { food: proteinFood, grams: gramsP  }
  ];
}

export function analyzeEveningMeal(eveningMeal) {
  const macros = calculateMacros(eveningMeal);

  let glycogenStatus;
  let carbAdjustment;

  if (macros.carbs < 100) {
    glycogenStatus = "low";
    carbAdjustment = 1.2;
  } else if (macros.carbs <= 200) {
    glycogenStatus = "normal";
    carbAdjustment = 1.0;
  } else {
    glycogenStatus = "high";
    carbAdjustment = 0.9;
  }

  return { macros, glycogenStatus, carbAdjustment };
}

export function generateDayPlan(playerData, eveningMeal, matchTimeStr, warmupResult) {

  const wakeUpTime    = playerData.wakeUpTime    || "07:00";
  const skipBreakfast = !!playerData.skipBreakfast;
  const matchDuration = clampNumber(playerData.matchDuration, 1, 130, 90);
  const position      = playerData.position || null;
  const diet          = dietSources[playerData.diet] ? playerData.diet : "regular";
  const season        = playerData.season || "cool";

  const energy = calculateEnergyNeeds(
    playerData.weight,
    playerData.recentSessions,
    playerData.sleepHours,
    { position }
  );

  const eveningAnalysis = analyzeEveningMeal(eveningMeal);

  const baseMacros = calculateMacroNeeds(energy);
  const adjustedMacros = {
    carbs:   Math.round(baseMacros.carbs   * eveningAnalysis.carbAdjustment),
    protein: baseMacros.protein,
    fat:     baseMacros.fat
  };

  const matchMinutes = timeToMinutes(matchTimeStr);
  const needsLunch   = matchMinutes >= 18 * 60;

  const preMealFraction   = clampNumber(0.20 * (matchDuration / 90), 0.10, 0.30, 0.20);
  const breakfastFraction = skipBreakfast ? 0 : (needsLunch ? 0.20 : 0.25);
  const lunchFraction     = needsLunch ? 0.20 : 0;

  const breakfastEnergy = energy * breakfastFraction;
  const lunchEnergy     = energy * lunchFraction;
  const preEnergy       = energy * preMealFraction + (skipBreakfast ? energy * 0.10 : 0);

  const breakfastMacros = calculateMacroNeeds(breakfastEnergy);
  const lunchMacros     = calculateMacroNeeds(lunchEnergy);
  const preMacros       = calculateMacroNeeds(preEnergy);

  breakfastMacros.carbs = Math.round(breakfastMacros.carbs * eveningAnalysis.carbAdjustment);
  lunchMacros.carbs     = Math.round(lunchMacros.carbs     * eveningAnalysis.carbAdjustment);
  preMacros.carbs       = Math.round(preMacros.carbs       * eveningAnalysis.carbAdjustment);

  const breakfast = skipBreakfast ? [] : buildMealFromMacros(breakfastMacros, diet);
  const lunch     = needsLunch     ? buildMealFromMacros(lunchMacros, diet)     : [];
  const preMeal   = buildMealFromMacros(preMacros, diet);

  const preMealLeadHours = needsLunch ? 3 : 3.5;
  const preMealMinutes   = matchMinutes - preMealLeadHours * 60;
  const breakfastMinutes = timeToMinutes(wakeUpTime) + 60;
  const warmupMinutes    = matchMinutes - 45;

  const firstMealMin = skipBreakfast ? timeToMinutes(wakeUpTime) + 90 : breakfastMinutes;
  const lunchMinutes = needsLunch ? Math.round((firstMealMin + preMealMinutes) / 2) : null;

  const lastMealBeforePre = needsLunch ? lunchMinutes : firstMealMin;
  const tooClose          = (preMealMinutes - lastMealBeforePre) < 120;

  const timeline = [
    {
      label: "🌙 Вечеря (предишния ден)",
      time:  "20:00",
      items: eveningMeal,
      note:  `Гликоген статус: ${eveningAnalysis.glycogenStatus}`
    }
  ];

  if (!skipBreakfast) {
    timeline.push({
      label: "🍳 Закуска",
      time:  minutesToTime(breakfastMinutes),
      items: breakfast,
      note:  needsLunch
        ? "По-малка от обичайно — обядът поема част от енергията"
        : "Богата на въглехидрати, умерен протеин"
    });
  }

  if (needsLunch) {
    timeline.push({
      label: "🥗 Обяд",
      time:  minutesToTime(lunchMinutes),
      items: lunch,
      note:  "Балансиран — въглехидрати + протеин + малко мазнини"
    });
  }

  let preMealNote;
  if (tooClose) {
    preMealNote = "⚠ По-малко от 2ч от предишно хранене — обмисли по-малка порция";
  } else if (skipBreakfast && !needsLunch) {
    preMealNote = "Лесно смилаемо — малко по-голяма порция, защото сте пропуснали закуска";
  } else {
    preMealNote = "Лесно смилаемо, без много мазнини";
  }

  timeline.push(
    {
      label: "⚽ Предмачово хранене",
      time:  minutesToTime(preMealMinutes),
      items: preMeal,
      note:  preMealNote
    },
    {
      label: "🏃 Загрявка",
      time:  minutesToTime(warmupMinutes),
      items: [],
      exercises: warmupResult.exercises,
      skippedExercises: warmupResult.skippedExercises,
      injuredZones: warmupResult.injuredZones,
      warmupIntensity: warmupResult.intensity,
      note:  `${warmupResult.totalMinutes} минути, фокус: ${warmupResult.dominantType}`
    },
    {
      label: `🏟️ Мач (${matchDuration} мин)`,
      time:  matchTimeStr,
      items: [],
      note:  "Хидратация: 500ml вода 30 мин. преди"
    }
  );

  const hydration = calculateDailyWater(playerData.weight, season, playerData.recentSessions);
  const hydrationReminders = generateHydrationReminders({
    wakeUpTime,
    matchTimeStr,
    matchDuration,
    totalMl: hydration.totalMl
  });

  const [dinner, ...sameDayEvents] = timeline;
  sameDayEvents.push(...hydrationReminders);
  sameDayEvents.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  timeline.length = 0;
  timeline.push(dinner, ...sameDayEvents);

  return {
    energy,
    glycogenStatus: eveningAnalysis.glycogenStatus,
    adjustedMacros,
    matchDuration,
    position,
    diet,
    hydration,
    hasLunch: needsLunch,
    profile: {
      weight:           playerData.weight          || null,
      height:           playerData.height          || null,
      age:              playerData.age             || null,
      gender:           playerData.gender          || null,
      bodyFat:          playerData.bodyFat         ?? null,
      morningWeight:    playerData.morningWeight   || null,
      postMatchWeight:  playerData.postMatchWeight || null,
      skipBreakfast,
      diet,
      season,
      injuriesRaw:      playerData.injuriesRaw     || ""
    },
    timeline
  };
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
