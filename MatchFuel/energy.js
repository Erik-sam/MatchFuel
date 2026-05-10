// =============================================
// КАКВО Е "export const" vs "export function"?
// =============================================
// export const → изнасям стойност (данни, обект)
// export function → изнасям функция (действие)
// И двете могат да се използват от други файлове.
// =============================================

const trainingFactors = {
  cardio:    1.3,
  strength:  1.2,
  technical: 1.1
};

const FATIGUE_HALFLIFE_DAYS = 3;

function daysAgo(dateStr) {
  if (!dateStr) return 0;
  const session = new Date(dateStr);
  const today   = new Date();
  session.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = (today - session) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round(diff));
}

function recencyFactor(dateStr) {
  return Math.exp(-daysAgo(dateStr) / FATIGUE_HALFLIFE_DAYS);
}

//Тренировка вчера       → 0.72  (72% от умората остава)
//Тренировка преди 3 дни → 0.37  (37% остава)
//Тренировка преди 5 дни → 0.19  (само 19% остава)

export function calculateRecentLoad(recentSessions) {
  if (!recentSessions || recentSessions.length === 0) {
    return 0;
  }

  return recentSessions.reduce((acc, session) => {
    const typeFactor = trainingFactors[session.type] || 1;
    const decay      = recencyFactor(session.date);
    return acc + ((session.minutes || 0) * typeFactor * decay);
  }, 0);
}

const positionFactors = {
  goalkeeper: 0.90,
  defender:   1.00,
  midfielder: 1.10,
  forward:    1.05,
  referee:    0.95
};

export function calculateEnergyNeeds(weight, recentSessions, sleepHours, opts = {}) {

  const baseEnergy = weight * 30;

  const recentLoad = calculateRecentLoad(recentSessions);
  const loadMultiplier = 1 + (recentLoad / 300);

  let sleepMultiplier = 1.0;

  if (sleepHours < 6) {
    sleepMultiplier = 0.95;
  } else if (sleepHours >= 8) {
    sleepMultiplier = 1.05;
  }

  const positionMultiplier = positionFactors[opts.position] || 1.0;

  let energy = baseEnergy * loadMultiplier * sleepMultiplier * positionMultiplier;

  energy = Math.max(2000, Math.min(energy, 4500));

  return Math.round(energy);
}

export function calculateMacroNeeds(energy) {
  return {
    carbs:   Math.round((energy * 0.60) / 4),
    protein: Math.round((energy * 0.20) / 4),
    fat:     Math.round((energy * 0.20) / 9)
  };
}
