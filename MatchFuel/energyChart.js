// =============================================
// МОДУЛ ЗА ЕНЕРГИЙНА ГРАФА
// =============================================
// Симулира как енергийното ниво се променя
// през целия ден — от вечерята на предния ден
// до края на мача.
//
// Използва Chart.js (зареден в index.html)
// =============================================

const GRAPH_START_HOUR = 19;
const MINUTES_PER_STEP = 15;

function hoursToMinutes(h) {
  return h * 60;
}

function buildBaseEnergy(totalMinutes) {
  const points = [];
  const steps  = Math.ceil(totalMinutes / MINUTES_PER_STEP);

  for (let i = 0; i <= steps; i++) {
    const t = i * MINUTES_PER_STEP;

    const realMinutes = GRAPH_START_HOUR * 60 + t;
    const realHour    = (realMinutes / 60) % 24;

    let base;

    if (realHour >= 23 || realHour < 4) {
      base = 30;
    } else if (realHour >= 4 && realHour < 7) {
      const progress = (realHour - 4) / 3;
      base = 30 + progress * 25;
    } else if (realHour >= 19 && realHour < 23) {
      base = 65;
    } else {
      base = 55;
    }

    points.push({ t, base });
  }

  return points;
}

function mealEffect(t, mealTime, peakBoost, duration) {
  const riseTime = 45;
  const holdTime = 60;
  const fallTime = duration - riseTime - holdTime;

  const dt = t - mealTime;

  if (dt < 0) return 0;

  if (dt < riseTime) {
    return (dt / riseTime) * peakBoost;
  }

  if (dt < riseTime + holdTime) {
    return peakBoost;
  }

  if (dt < duration) {
    const fallProgress = (dt - riseTime - holdTime) / fallTime;
    return peakBoost * (1 - fallProgress);
  }

  return 0;
}

function warmupEffect(t, warmupTime) {
  const dt = t - warmupTime;
  if (dt < 0) return 0;
  if (dt < 30) return (dt / 30) * 15;
  if (dt < 60) return 15;
  return 0;
}

export function buildEnergyChartData(timeline, matchTimeStr) {

  const eventMap = {};
  timeline.forEach(event => {
    eventMap[event.label] = event.time;
  });

  function timeStrToOffset(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    let totalMin = h * 60 + m;
    if (totalMin < GRAPH_START_HOUR * 60) {
      totalMin += 24 * 60;
    }
    return totalMin - GRAPH_START_HOUR * 60;
  }

  const dinnerOffset    = 0;
  const breakfastOffset = timeStrToOffset("7:00");
  const preMealOffset   = timeStrToOffset(
    timeline.find(e => e.label.includes("Предматчево"))?.time || "11:30"
  );
  const warmupOffset    = timeStrToOffset(
    timeline.find(e => e.label.includes("Загрявка"))?.time || "14:15"
  );
  const matchOffset     = timeStrToOffset(matchTimeStr);

  const totalMinutes = matchOffset + 60;

  const basePoints = buildBaseEnergy(totalMinutes);

  const labels = [];
  const data   = [];

  basePoints.forEach(({ t, base }) => {
    const dinner    = mealEffect(t, 60,             20, 180);
    const breakfast = mealEffect(t, breakfastOffset, 18, 150);
    const preMeal   = mealEffect(t, preMealOffset,   22, 180);
    const warmup    = warmupEffect(t, warmupOffset);

    const total = Math.min(100, Math.round(base + dinner + breakfast + preMeal + warmup));

    const realMin  = GRAPH_START_HOUR * 60 + t;
    const dispHour = Math.floor(realMin / 60) % 24;
    const dispMin  = realMin % 60;
    const label    = `${dispHour}:${dispMin.toString().padStart(2, "0")}`;

    labels.push(label);
    data.push(total);
  });

  const annotations = [
    {
      label:  "🌙 Вечеря",
      offset: 60,
      color:  "#7b1fa2"
    },
    {
      label:  "🍳 Закуска",
      offset: breakfastOffset,
      color:  "#f57c00"
    },
    {
      label:  "⚽ Предматчово",
      offset: preMealOffset,
      color:  "#0288d1"
    },
    {
      label:  "🏃 Загрявка",
      offset: warmupOffset,
      color:  "#388e3c"
    },
    {
      label:  "🏟️ Мач",
      offset: matchOffset,
      color:  "#d32f2f"
    },
  ];

  return { labels, data, annotations, totalMinutes };
}

let chartInstance = null;

export function renderEnergyChart(canvasId, chartData) {

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  const annotationPlugin = {
    id: "eventLines",

    afterDraw(chart) {
      const { ctx, scales } = chart;

      chartData.annotations.forEach(ann => {

        const stepIndex = Math.round(ann.offset / MINUTES_PER_STEP);

        const x = scales.x.getPixelForValue(stepIndex);
        const yTop    = scales.y.top;
        const yBottom = scales.y.bottom;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBottom);
        ctx.strokeStyle = ann.color;
        ctx.lineWidth   = 2;
        ctx.setLineDash([6, 3]);
        ctx.stroke();

        ctx.fillStyle  = ann.color;
        ctx.font       = "11px sans-serif";
        ctx.textAlign  = "center";
        ctx.fillText(ann.label, x, yTop + 14);

        ctx.restore();
      });
    }
  };

  chartInstance = new Chart(ctx, {
    type: "line",

    data: {
      labels: chartData.labels.map((l, i) => i % 4 === 0 ? l : ""),

      datasets: [{
        label:           "Енергийно ниво (%)",
        data:            chartData.data,

        borderColor:     "#2e7d32",
        backgroundColor: "rgba(46, 125, 50, 0.1)",
        borderWidth:     2,
        fill:            true,
        tension:         0.4,
        pointRadius:     0,
      }]
    },

    plugins: [annotationPlugin],

    options: {
      responsive: true,
      animation:  { duration: 800 },

      layout: {
        padding: { top: 40 }
      },

      scales: {
        x: {
          title: {
            display: true,
            text:    "Час на деня"
          }
        },
        y: {
          min:   0,
          max:   100,
          title: {
            display: true,
            text:    "Енергийно ниво (%)"
          },
          ticks: {
            callback: val => `${val}%`
          }
        }
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `Енергия: ${ctx.parsed.y}%`
          }
        }
      }
    }
  });
}
