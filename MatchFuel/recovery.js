// =============================================
// POST-MATCH RECOVERY (feature 8)
// =============================================
// Генерира препоръка за възстановяване след мач:
//   1) Възстановително хранене — протеин + въглехидрати
//      в рамките на 30 мин след мача (anabolic window).
//      Дозите следват ISSN guidelines: ~0.3g protein/kg
//      и ~1.0g carbs/kg за да се рестартира мускулният
//      синтез и да се попълни гликогенът.
//   2) Упражнения за възстановяване — лек кардио cooldown,
//      стречинг, foam rolling. Целта е да се намали DOMS
//      (delayed onset muscle soreness) и да се ускори
//      връщането към нормалното състояние.
//
// Хранене: пулът от храни идва от mealPlanner.dietSources,
// за да остане в синхрон с диетичните предпочитания (feature 3) —
// един източник на истина за protein/carb suggestions.
//
// Упражнения: статичен списък — за разлика от warmup, тук
// няма дневна вариация (recovery е recovery, независимо от
// типа на тренировките). Контузиите обаче се вземат предвид
// със същия zone-tag модел като feature 7.
// =============================================

import { dietSources } from "./mealPlanner.js";
import { normalizeInjuries } from "./warmup.js";

const PROTEIN_PER_KG = 0.3;
const CARBS_PER_KG   = 1.0;
const RECOVERY_WINDOW_MIN = 30;

const FOOD_LABELS = {
  chicken:        "Пилешко филе",
  fish:           "Риба (сьомга/тон)",
  egg:            "Яйца",
  greek_yogurt:   "Гръцко кисело мляко",
  cottage_cheese: "Извара",
  tofu:           "Тофу",
  tempeh:         "Темпе",
  lentils:        "Леща",
  chickpeas:      "Нахут",
  rice:           "Бял ориз",
  brown_rice:     "Кафяв ориз",
  pasta:          "Паста",
  bread:          "Хляб",
  oats:           "Овесени ядки",
  quinoa:         "Киноа",
  potato:         "Картофи"
};

function label(food) {
  return FOOD_LABELS[food] || food;
}

const recoveryExercises = [
  {
    name:     "Лек ход (cooldown)",
    duration: 300,
    purpose:  "Постепенно връща пулса към покой",
    zones:    []
  },
  {
    name:     "Стречинг — задно бедро",
    duration: 60,
    purpose:  "Намалява напрежението в хамстрингите",
    zones:    ["hamstring"]
  },
  {
    name:     "Стречинг — предно бедро",
    duration: 60,
    purpose:  "Освобождава квадрицепса",
    zones:    ["quad"]
  },
  {
    name:     "Стречинг — прасец",
    duration: 60,
    purpose:  "Подобрява гъвкавостта в глезена",
    zones:    ["calf", "ankle"]
  },
  {
    name:     "Стречинг — флексори на ханша",
    duration: 60,
    purpose:  "Балансира таза след спринтове",
    zones:    ["hip", "groin"]
  },
  {
    name:     "Foam rolling — квадрицепс",
    duration: 90,
    purpose:  "Разгражда мускулните възли",
    zones:    ["quad"]
  },
  {
    name:     "Foam rolling — IT band",
    duration: 90,
    purpose:  "Облекчава странична болка в крака",
    zones:    ["knee", "hip"]
  },
  {
    name:     "Foam rolling — гръб",
    duration: 90,
    purpose:  "Разпуска паравертебралните мускули",
    zones:    ["back"]
  },
  {
    name:     "Дълбоко дишане 4-7-8",
    duration: 120,
    purpose:  "Активира парасимпатиковата система",
    zones:    []
  }
];

export function generateRecoveryPlan(playerData) {
  const weight = playerData.weight || 70;
  const diet   = dietSources[playerData.diet] ? playerData.diet : "regular";
  const injuredZones = normalizeInjuries(playerData.injuriesRaw || []);

  const proteinGrams = Math.round(weight * PROTEIN_PER_KG);
  const carbsGrams   = Math.round(weight * CARBS_PER_KG);

  const sources = dietSources[diet];
  const meal = {
    windowMinutes: RECOVERY_WINDOW_MIN,
    protein: {
      grams:       proteinGrams,
      suggestions: sources.proteins.slice(0, 3).map(label)
    },
    carbs: {
      grams:       carbsGrams,
      suggestions: sources.carbs.slice(0, 3).map(label)
    },
    fluids: {
      ml:   Math.round(weight * 10),
      note: "Вода + малко натрий (или изотоник)"
    }
  };

  const exercises = [];
  const skipped = [];
  for (const ex of recoveryExercises) {
    const hit = ex.zones.find(z => injuredZones.includes(z));
    if (hit) {
      skipped.push({ name: ex.name, reason: `контузия (${hit})` });
      continue;
    }
    exercises.push(ex);
  }

  const totalSeconds = exercises.reduce((acc, ex) => acc + ex.duration, 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  return {
    meal,
    exercises,
    skippedExercises: skipped,
    totalMinutes,
    diet,
    injuredZones
  };
}
