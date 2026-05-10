// =============================================
// HYDRATION MODULE (feature 4)
// =============================================
// Изчислява дневна нужда от вода и поражда
// timeline събития за напомняне ("изпий ~280ml сега").
//
// Формулата за общо количество е грубо приближение —
// точните стойности зависят от много фактори (възраст,
// индивидуален метаболизъм, мускулна маса). Целта е да
// даваме реалистично число, не медицински точно.
// =============================================

const SEASON_FACTORS = {
  cold: 0.95,
  cool: 1.00,
  warm: 1.10,
  hot:  1.25
};

const TRAINING_WATER_PER_MIN = {
  cardio:    8,
  strength:  5,
  technical: 3
};

const DEFAULT_TRAINING_FACTOR = 4;

const BASE_ML_PER_KG  = 35;
const MATCH_DAY_BONUS = 600;

const HYDRATION_HALFLIFE_DAYS = 2;

function hydrationDecay(dateStr) {
  if (!dateStr) return 1;
  const session = new Date(dateStr);
  const today   = new Date();
  session.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const d = Math.max(0, Math.round((today - session) / (1000 * 60 * 60 * 24)));
  return Math.exp(-d / HYDRATION_HALFLIFE_DAYS);
}

export function calculateDailyWater(weight, season, recentSessions = []) {
  const baseMl  = weight * BASE_ML_PER_KG;
  const tempMul = SEASON_FACTORS[season] ?? 1.0;

  const trainingMl = recentSessions.reduce((acc, s) => {
    const mlPerMin = TRAINING_WATER_PER_MIN[s.type] ?? DEFAULT_TRAINING_FACTOR;
    return acc + ((s.minutes || 0) * mlPerMin * hydrationDecay(s.date));
  }, 0);

  const totalMl = Math.round((baseMl + trainingMl + MATCH_DAY_BONUS) * tempMul);

  return {
    totalMl,
    season:  season || "cool",
    tempMul,
    breakdown: {
      base:     Math.round(baseMl * tempMul),
      training: Math.round(trainingMl * tempMul),
      match:    Math.round(MATCH_DAY_BONUS * tempMul)
    }
  };
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const h = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const m = total % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

const SPACING_MIN          = 90;
const ACTIVE_WINDOW_SHARE  = 0.70;
const POST_MATCH_PADDING   = 30;

export function generateHydrationReminders({
  wakeUpTime,
  matchTimeStr,
  matchDuration,
  totalMl
}) {
  const startMin = timeToMinutes(wakeUpTime || "07:00") + 30;
  const endMin   = timeToMinutes(matchTimeStr) + (matchDuration || 90) + POST_MATCH_PADDING;

  if (endMin <= startMin) return [];

  const reminders = [];
  for (let t = startMin; t <= endMin; t += SPACING_MIN) {
    reminders.push(t);
  }

  if (reminders[reminders.length - 1] < endMin - 15) {
    reminders.push(endMin);
  }

  const activeMl   = Math.round(totalMl * ACTIVE_WINDOW_SHARE);
  const perReminder = Math.round(activeMl / reminders.length);

  return reminders.map((minute, idx) => {
    const isPostMatch = minute >= timeToMinutes(matchTimeStr) + (matchDuration || 90);
    const isPreMatch  = minute >= timeToMinutes(matchTimeStr) - 45 && minute < timeToMinutes(matchTimeStr);

    let note;
    if (isPostMatch) {
      note = `Изпий ~${perReminder}ml вода (възстановяване след мач)`;
    } else if (isPreMatch) {
      note = `Изпий ~${perReminder}ml вода (преди мача — без преяждане)`;
    } else {
      note = `Изпий ~${perReminder}ml вода`;
    }

    return {
      label:        "💧 Хидратация",
      time:         minutesToTime(minute),
      items:        [],
      hydrationMl:  perReminder,
      isHydration:  true,
      note
    };
  });
}
