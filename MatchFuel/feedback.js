// =============================================
// FEEDBACK & ADAPTIVE LEARNING МОДУЛ
// =============================================
// Този файл отговаря за:
//   1. Запазване на фийдбак след мач
//   2. Зареждане на историята
//   3. Изчисляване на корекции за следващ план
//   4. Визуализация на прогреса
// =============================================

import { loadProfileHistory, saveProfileHistory } from "./profiles.js";

export function loadHistory() {
  return loadProfileHistory();
}

export function saveFeedback(plan, feedback) {

  const history = loadHistory();

  const corrections = calculateCorrections(feedback);

  const entry = {
    date:        new Date().toLocaleDateString("bg-BG"),
    energy:      plan.energy,
    glycogen:    plan.glycogenStatus,
    feedback,
    corrections,
    score:       calculateScore(feedback)
  };

  history.unshift(entry);

  const trimmed = history.slice(0, 10);

  saveProfileHistory(trimmed);

  return entry;
}

function calculateCorrections(feedback) {

  let energyMultiplier  = 1.0;
  let carbMultiplier    = 1.0;
  let portionMultiplier = 1.0;

  if (feedback.physicalScore <= 2) {
    energyMultiplier += 0.10;
  } else if (feedback.physicalScore === 3) {
    energyMultiplier += 0.05;
  } else if (feedback.physicalScore === 5) {
    energyMultiplier -= 0.05;
  }

  if (feedback.legFatigue) {
    carbMultiplier += 0.15;
  }

  if (feedback.mealTooHeavy) {
    portionMultiplier -= 0.10;
  }

  if (!feedback.lastedFullMatch) {
    energyMultiplier  += 0.10;
    carbMultiplier    += 0.10;
  }

//physicalScore = 2  →  energyMultiplier  += 0.10  (нужна е повече енергия)
//legFatigue = true  →  carbMultiplier    += 0.15  (нужни са повече въглехидрати)

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  return {
    energyMultiplier:  parseFloat(clamp(energyMultiplier,  0.70, 1.30).toFixed(2)),
    carbMultiplier:    parseFloat(clamp(carbMultiplier,    0.70, 1.30).toFixed(2)),
    portionMultiplier: parseFloat(clamp(portionMultiplier, 0.70, 1.30).toFixed(2))
  };
}

function calculateScore(feedback) {

  const physPoints = ((feedback.physicalScore - 1) / 4) * 40;

  const fatiguePoints  = feedback.legFatigue     ? 0  : 20;
  const heavyPoints    = feedback.mealTooHeavy   ? 0  : 20;
  const endurePoints   = feedback.lastedFullMatch ? 20 : 0;

  return Math.round(physPoints + fatiguePoints + heavyPoints + endurePoints);
}

export function getLatestCorrections() {
  const history = loadHistory();

  if (history.length === 0) {
    return {
      energyMultiplier:  1.0,
      carbMultiplier:    1.0,
      portionMultiplier: 1.0
    };
  }

  return history[0].corrections;
}

let progressChartInstance = null;

export function renderProgressChart(canvasId) {

  const history = loadHistory();
  const canvas  = document.getElementById(canvasId);

  if (!canvas || history.length === 0) return;

  const ctx = canvas.getContext("2d");

  if (progressChartInstance) {
    progressChartInstance.destroy();
  }

  const sorted = history.slice().reverse();

  const labels = sorted.map(e => e.date);
  const scores = sorted.map(e => e.score);

  progressChartInstance = new Chart(ctx, {
    type: "line",

    data: {
      labels,
      datasets: [{
        label:           "Представяне (%)",
        data:            scores,
        borderColor:     "#2e7d32",
        backgroundColor: "rgba(46, 125, 50, 0.1)",
        borderWidth:     2,
        fill:            true,
        tension:         0.3,

        pointRadius:          6,
        pointBackgroundColor: "#2e7d32",
        pointHoverRadius:     8
      }]
    },

    options: {
      responsive: true,
      scales: {
        y: {
          min: 0,
          max: 100,
          title: { display: true, text: "Оценка на мача (%)" },
          ticks: { callback: val => `${val}%` }
        },
        x: {
          title: { display: true, text: "Дата на мача" }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const entry = sorted[ctx.dataIndex];
              return [
                `Физическо: ${entry.feedback.physicalScore}/5`,
                `Умора: ${entry.feedback.legFatigue ? "да" : "не"}`,
                `Издържа мача: ${entry.feedback.lastedFullMatch ? "да" : "не"}`
              ];
            }
          }
        }
      }
    }
  });
}
