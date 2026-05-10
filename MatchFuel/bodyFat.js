// =============================================
// bodyFat.js
// =============================================
// Изчисляване и визуализация на процента мазнини
// по формулата на Deurenberg (1991):
//
//   BF% = 1.20 * BMI + 0.23 * age − 10.8 * genderFactor − 5.4
//   genderFactor = 1 за мъж, 0 за жена
//
// Защо Deurenberg, а не US Navy / skinfold:
// - Нужни са само тегло, ръст, възраст, пол
//   → всичко, което и без това събираме
// - Приемлива точност (±3-4%) за възрастни над 16г.
// - Не иска обиколки (Navy формулата иска шия/талия)
// =============================================

const bfRanges = {
  male: [
    { lo: 2,  hi: 5,  name: "Есенциални",  color: "#1976d2" },
    { lo: 6,  hi: 13, name: "Атлет",       color: "#43a047" },
    { lo: 14, hi: 17, name: "Фит",         color: "#9ccc65" },
    { lo: 18, hi: 24, name: "Средно",      color: "#fdd835" },
    { lo: 25, hi: 40, name: "Наднормено",  color: "#e53935" }
  ],
  female: [
    { lo: 10, hi: 13, name: "Есенциални",  color: "#1976d2" },
    { lo: 14, hi: 20, name: "Атлет",       color: "#43a047" },
    { lo: 21, hi: 24, name: "Фит",         color: "#9ccc65" },
    { lo: 25, hi: 31, name: "Средно",      color: "#fdd835" },
    { lo: 32, hi: 45, name: "Наднормено",  color: "#e53935" }
  ]
};

export function calculateBodyFat({ weight, height, age, gender }) {
  if (!weight || !height || !age || !gender) return null;
  if (height <= 0 || weight <= 0 || age <= 0) return null;

  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const genderFactor = gender === "male" ? 1 : 0;

  const bf = 1.20 * bmi + 0.23 * age - 10.8 * genderFactor - 5.4;

  const clamped = Math.max(2, Math.min(bf, 50));
  return Math.round(clamped * 10) / 10;
}

export function classifyBodyFat(bf, gender) {
  if (bf == null) return null;
  const ranges = bfRanges[gender] || bfRanges.male;

  for (let i = 0; i < ranges.length; i++) {
    const r    = ranges[i];
    const next = ranges[i + 1];
    if (!next)              return { name: r.name, color: r.color };
    if (bf < next.lo)       return { name: r.name, color: r.color };
  }
  return null;
}

export function renderBodyFatBar(containerId, bf, gender) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (bf == null) {
    container.innerHTML = `
      <div class="bf-placeholder">
        <span class="bf-placeholder-icon">▣</span>
        <div>
          <strong>% телесни мазнини</strong>
          <p>Попълни <em>тегло, височина, възраст и пол</em>, за да се покаже скалата с твоя индекс.</p>
        </div>
      </div>
    `;
    return;
  }

  const ranges = bfRanges[gender] || bfRanges.male;
  const cls    = classifyBodyFat(bf, gender);

  const minLo = ranges[0].lo;
  const maxHi = ranges[ranges.length - 1].hi;
  const span  = maxHi - minLo;

  const markerPct = Math.max(0, Math.min(100,
    ((bf - minLo) / span) * 100
  ));

  const segmentsHtml = ranges.map(r => {
    const widthPct = ((r.hi - r.lo) / span) * 100;
    return `
      <div class="bf-segment" style="flex: ${widthPct}; background:${r.color}">
        <span class="bf-seg-label">${r.name}</span>
        <span class="bf-seg-range">${r.lo}–${r.hi}%</span>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="bf-summary">
      <strong>% телесни мазнини:</strong>
      <span class="bf-value" style="color:${cls ? cls.color : "#555"}">${bf}%</span>
      ${cls ? `<span class="bf-category">(${cls.name})</span>` : ""}
    </div>
    <div class="bf-bar-wrap">
      <div class="bf-bar">
        ${segmentsHtml}
        <div class="bf-marker" style="left: ${markerPct}%" title="${bf}%">▼</div>
      </div>
    </div>
  `;
}
