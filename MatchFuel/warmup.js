// =============================================
// БИБЛИОТЕКА С УПРАЖНЕНИЯ
// =============================================
// gifUrl     → линк към GIF
// zones      → засегнати телесни зони (feature 7) — ако
//              потребителят има контузия в някоя от тях,
//              упражнението се пропуска
// highIntensity → ако true, в "light" режим се пропуска
//
// Канонични имена на зоните (feature 7):
//   knee, ankle, hamstring, quad, groin, hip, back,
//   shoulder, calf
// Празен zones=[] → упражнението е безопасно за всички
// (предимно техника / координация без натоварване).
// =============================================

const exerciseLibrary = {

  mobility: [
    {
      name:     "Hip circles",
      duration: 60,
      purpose:  "Отваря тазобедрената става",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2021/01/hip-circles.gif",
      zones:    ["hip", "groin"],
      highIntensity: false
    },
    {
      name:     "Leg swings",
      duration: 45,
      purpose:  "Динамично разтягане на краката",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2023/06/Lateral-Leg-Swings.gif",
      zones:    ["hip", "hamstring", "quad"],
      highIntensity: false
    },
    {
      name:     "Ankle rotations",
      duration: 30,
      purpose:  "Стабилизира глезена",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2022/02/Feet-and-Ankle-Rotation.gif",
      zones:    ["ankle"],
      highIntensity: false
    },
    {
      name:     "Spine rotations",
      duration: 45,
      purpose:  "Освобождава гръбначния стълб",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2021/05/Standing-Rotation.gif",
      zones:    ["back"],
      highIntensity: false
    },
  ],

  activation: [
    {
      name:     "Glute bridges",
      duration: 40,
      sets:     2,
      purpose:  "Активира седалищните мускули",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge-.gif",
      zones:    ["hip", "back"],
      highIntensity: false
    },
    {
      name:     "Lateral band walks",
      duration: 30,
      sets:     2,
      purpose:  "Стабилизира коляното",
      gifUrl:   "	https://fitnessprogramer.com/wp-content/uploads/2022/02/Banded-Walk.gif",
      zones:    ["hip", "knee"],
      highIntensity: false
    },
    {
      name:     "Single leg balance",
      duration: 30,
      sets:     2,
      purpose:  "Подобрява проприоцепцията",
      gifUrl:   "	https://d2culxnxbccemt.cloudfront.net/bowl/content…s/2019/10/20213644/Single-Leg-Balance-Touch-1.gif",
      zones:    ["ankle", "knee"],
      highIntensity: false
    },
  ],

  cardio: [
    {
      name:     "Light jog",
      duration: 120,
      purpose:  "Повишава сърдечната честота",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2021/09/Fast-Feet-Run.gif",
      zones:    ["knee", "ankle", "calf"],
      highIntensity: false
    },
    {
      name:     "High knees",
      duration: 30,
      purpose:  "Активира флексорите на ханша",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2021/09/Run-in-Place.gif",
      zones:    ["hip", "knee", "quad"],
      highIntensity: true
    },
    {
      name:     "Butt kicks",
      duration: 30,
      purpose:  "Загрява задното бедро",
      gifUrl:   "https://fitnessprogramer.com/wp-content/uploads/2021/10/Butt-Kicks.gif",
      zones:    ["hamstring", "knee"],
      highIntensity: true
    },
    {
      name:     "Lateral shuffles",
      duration: 30,
      purpose:  "Подготвя за странично движение",
      gifUrl:   "https://media1.popsugar-assets.com/files/thumbor/1…29/863416dc9c25cc58_LATERAL_SHUFFLE_TOUCH_GIF.gif",
      zones:    ["hip", "knee", "ankle"],
      highIntensity: true
    },
  ],

  football: [
    {
      name:     "Short passes (pairs)",
      duration: 180,
      purpose:  "Техническа активация",
      gifUrl:   "https://www.soccerpilot.com/warm-up/animations/warm-up-145.gif",
      zones:    [],
      highIntensity: false
    },
    {
      name:     "Ball control drills",
      duration: 120,
      purpose:  "Активира нервната система",
      gifUrl:   "https://www.soccerpilot.com/ballcontrol/animations/ballcontrol-001.gif",
      zones:    [],
      highIntensity: false
    },
    {
      name:     "Explosive sprints 20m",
      duration: 60,
      sets:     4,
      purpose:  "Събужда бързите мускулни влакна",
      gifUrl:   "	https://fitnessprogramer.com/wp-content/uploads/2023/06/sprint.gif",
      zones:    ["hamstring", "quad", "knee", "ankle", "calf"],
      highIntensity: true
    },
  ]
};

const warmupByTrainingType = {
  cardio:    ["mobility", "activation", "football"],
  strength:  ["mobility", "activation", "cardio", "football"],
  technical: ["cardio", "mobility", "football"]
};

const INJURY_ALIASES = {
  knee: "knee", knees: "knee",
  ankle: "ankle", ankles: "ankle",
  hamstring: "hamstring", hamstrings: "hamstring",
  quad: "quad", quads: "quad", quadriceps: "quad",
  groin: "groin",
  hip: "hip", hips: "hip",
  back: "back", lowerback: "back", "lower back": "back",
  shoulder: "shoulder", shoulders: "shoulder",
  calf: "calf", calves: "calf",
  "коляно": "knee", "колено": "knee", "колене": "knee",
  "глезен": "ankle", "глезени": "ankle",
  "задно бедро": "hamstring", "хамстринг": "hamstring",
  "предно бедро": "quad", "квадрицепс": "quad",
  "слабини": "groin", "слабина": "groin",
  "ханш": "hip", "тазобедрена": "hip",
  "гръб": "back", "кръст": "back",
  "рамо": "shoulder", "рамене": "shoulder",
  "прасец": "calf", "прасци": "calf"
};

export function normalizeInjuries(input) {
  if (!input) return [];
  const raw = Array.isArray(input)
    ? input
    : String(input).split(/[,;\n]/);

  const zones = new Set();
  for (const item of raw) {
    const key = String(item).trim().toLowerCase();
    if (!key) continue;
    if (INJURY_ALIASES[key]) {
      zones.add(INJURY_ALIASES[key]);
      continue;
    }
    for (const alias of Object.keys(INJURY_ALIASES)) {
      if (key.includes(alias)) {
        zones.add(INJURY_ALIASES[alias]);
        break;
      }
    }
  }
  return [...zones];
}

export function generateWarmup(recentSessions, opts = {}) {
  const { injuries = [], intensity = "full" } = opts;
  const injuredZones = normalizeInjuries(injuries);
  const isLight = intensity === "light";

  const typeCounts = recentSessions.reduce((acc, session) => {
    acc[session.type] = (acc[session.type] || 0) + 1;
    return acc;
  }, {});

  const dominantType = Object.keys(typeCounts)
    .sort((a, b) => typeCounts[b] - typeCounts[a])[0];

  const categories = warmupByTrainingType[dominantType] || warmupByTrainingType["technical"];

  const allExercises = categories.flatMap(category => exerciseLibrary[category] || []);

  const exercises = [];
  const skippedExercises = [];

  for (const ex of allExercises) {
    const hitZone = ex.zones.find(z => injuredZones.includes(z));
    if (hitZone) {
      skippedExercises.push({ name: ex.name, reason: `контузия (${hitZone})` });
      continue;
    }
    if (isLight && ex.highIntensity) {
      skippedExercises.push({ name: ex.name, reason: "лек режим" });
      continue;
    }
    exercises.push(ex);
  }

  const totalSeconds = exercises.reduce((acc, ex) => acc + ex.duration, 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  return {
    dominantType,
    exercises,
    totalMinutes,
    skippedExercises,
    injuredZones,
    intensity: isLight ? "light" : "full"
  };
}
