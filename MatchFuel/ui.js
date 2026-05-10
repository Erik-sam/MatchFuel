import { generateDayPlan }                        from "./mealPlanner.js";
import { generateWarmup }                          from "./warmup.js";
import { generateRecoveryPlan }                    from "./recovery.js";
import { buildEnergyChartData, renderEnergyChart } from "./energyChart.js";
import { resolveFood, getSuggestions }             from "./foodMatcher.js";
import { calculateBodyFat, renderBodyFatBar }      from "./bodyFat.js";
import {
  saveFeedback,
  loadHistory,
  getLatestCorrections,
  renderProgressChart
} from "./feedback.js";
import {
  initProfiles,
  listProfiles,
  getActiveProfile,
  setActiveProfile,
  createProfile,
  deleteProfile,
  saveProfileFields,
  loadProfileFields
} from "./profiles.js";

const PROFILE_INPUT_IDS = [
  "weight", "height", "age", "gender", "sleep", "position",
  "diet", "season", "wakeUpTime", "matchTime", "matchDuration",
  "morningWeight", "postMatchWeight", "injuries"
];

const FIELD_DEFAULTS = {
  wakeUpTime:    "07:00",
  matchTime:     "15:00",
  matchDuration: "90",
  diet:          "regular",
  season:        "cool"
};

let currentPlan = null;

const MAX_SESSIONS = 3;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function refreshAddSessionBtn() {
  const btn   = document.getElementById("addSessionBtn");
  const count = document.querySelectorAll(".session-row").length;
  btn.disabled = count >= MAX_SESSIONS;
  btn.textContent = count >= MAX_SESSIONS
    ? `Максимум ${MAX_SESSIONS} тренировки`
    : "+ Добави тренировка";
}

function addSessionRow() {
  const container = document.getElementById("sessionsContainer");
  if (container.querySelectorAll(".session-row").length >= MAX_SESSIONS) return;

  const row = document.createElement("div");
  row.className = "session-row";
  row.innerHTML = `
    <input class="session-date" type="date" value="${todayISO()}" max="${todayISO()}" />
    <select class="session-type">
      <option value="cardio">Кардио</option>
      <option value="strength">Силова</option>
      <option value="technical">Техническа</option>
    </select>
    <input class="session-minutes" type="number" placeholder="Минути" />
    <button class="remove-btn">✕</button>
  `;
  row.querySelector(".remove-btn").addEventListener("click", () => {
    row.remove();
    refreshAddSessionBtn();
  });
  container.appendChild(row);
  refreshAddSessionBtn();
}

function addFoodRow() {
  const container = document.getElementById("foodContainer");
  const row = document.createElement("div");
  row.className = "food-row";
  row.innerHTML = `
    <input class="food-name"  type="text"   placeholder="Храна (напр. пилешко, chicken)" autocomplete="off" />
    <input class="food-grams" type="number" placeholder="Грамове" />
    <button class="remove-btn" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
  attachFoodAutocomplete(row.querySelector(".food-name"));
}

function attachFoodAutocomplete(input) {
  const row = input.closest(".food-row");
  let dropdown = null;

  function closeDropdown() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
  }

  function openDropdown() {
    closeDropdown();
    dropdown = document.createElement("ul");
    dropdown.className = "food-suggestions";
    row.appendChild(dropdown);
  }

  function applyValidationClass() {
    input.classList.remove("invalid", "fuzzy-matched", "category-matched");
    const v = input.value.trim();
    if (!v) return;
    const r = resolveFood(v);
    if (r.match === "none")     input.classList.add("invalid");
    else if (r.match === "fuzzy")    input.classList.add("fuzzy-matched");
    else if (r.match === "category") input.classList.add("category-matched");
  }

  input.addEventListener("input", () => {
    input.classList.remove("invalid", "fuzzy-matched", "category-matched");

    const suggestions = getSuggestions(input.value);
    if (suggestions.length === 0) { closeDropdown(); return; }

    openDropdown();
    suggestions.forEach(s => {
      const li = document.createElement("li");
      const labelSuffix = s.displayed !== s.label ? ` <span class="sugg-label">${s.label}</span>` : "";
      li.innerHTML = `<span class="sugg-main">${s.displayed}</span>${labelSuffix}`;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = s.displayed;
        closeDropdown();
        applyValidationClass();
      });
      dropdown.appendChild(li);
    });
  });

  input.addEventListener("blur", () => {
    setTimeout(() => { closeDropdown(); applyValidationClass(); }, 120);
  });
}

function collectFieldValues() {
  const fields = {};
  for (const id of PROFILE_INPUT_IDS) {
    const el = document.getElementById(id);
    if (el) fields[id] = el.value;
  }
  fields.skipBreakfast = document.getElementById("skipBreakfast")?.checked || false;
  const intensityEl = document.querySelector('input[name="warmupIntensity"]:checked');
  fields.warmupIntensity = intensityEl?.value || "full";
  return fields;
}

function applyFieldValues(fields) {
  for (const id of PROFILE_INPUT_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const value = fields[id] !== undefined ? fields[id] : (FIELD_DEFAULTS[id] || "");
    el.value = value;
  }
  const skipEl = document.getElementById("skipBreakfast");
  if (skipEl) skipEl.checked = !!fields.skipBreakfast;
  const intensity = fields.warmupIntensity || "full";
  const radio = document.querySelector(
    `input[name="warmupIntensity"][value="${intensity}"]`
  );
  if (radio) radio.checked = true;
}

function persistFields() {
  saveProfileFields(collectFieldValues());
}

function refreshProfileSelector() {
  const select = document.getElementById("profileSelect");
  const profiles = listProfiles();
  const active = getActiveProfile();
  select.innerHTML = profiles
    .map(p => `<option value="${p}" ${p === active ? "selected" : ""}>${p}</option>`)
    .join("");
}

function switchToProfile(name) {
  setActiveProfile(name);
  applyFieldValues(loadProfileFields());
  refreshHistoryView();
}

function refreshHistoryView() {
  const history = loadHistory();
  const listEl = document.getElementById("historyList");
  const progressSection = document.getElementById("progressSection");

  if (history.length === 0) {
    listEl.innerHTML = `<p class="history-empty">Все още няма запазени мачове за този профил.</p>`;
    progressSection.style.display = "none";
    return;
  }

  listEl.innerHTML = history.map(entry => {
    const c = entry.corrections;
    const fb = entry.feedback;
    return `
      <div class="history-card">
        <div class="history-card-head">
          <strong>${entry.date}</strong>
          <span class="history-score">${entry.score}/100</span>
        </div>
        <div class="history-meta">
          ${entry.energy} kcal · ${translateGlycogen(entry.glycogen)}
        </div>
        <div class="history-fb">
          ⭐ ${fb.physicalScore}/5 ·
          ${fb.legFatigue ? "🦵 умора" : "✅ без умора"} ·
          ${fb.mealTooHeavy ? "🍽 тежко" : "✅ ок хранене"} ·
          ${fb.lastedFullMatch ? "✅ цял мач" : "⏱ отпадна"}
        </div>
        <div class="history-corrections">
          Корекции: енергия ×${c.energyMultiplier},
          въглехидрати ×${c.carbMultiplier},
          порции ×${c.portionMultiplier}
        </div>
      </div>
    `;
  }).join("");

  progressSection.style.display = "block";
  renderProgressChart("progressCanvas");
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach(panel => {
    panel.style.display = panel.id === `tab-${tabName}` ? "block" : "none";
  });
  if (tabName === "history") refreshHistoryView();
}

document.addEventListener("DOMContentLoaded", () => {

  initProfiles();
  refreshProfileSelector();
  applyFieldValues(loadProfileFields());

  document.getElementById("profileSelect").addEventListener("change", (e) => {
    switchToProfile(e.target.value);
  });

  document.getElementById("newProfileBtn").addEventListener("click", () => {
    const name = prompt("Име на новия профил:");
    if (name === null) return;
    const result = createProfile(name);
    if (!result.ok) {
      alert(result.reason === "exists"
        ? "Вече има профил с това име."
        : "Името не може да бъде празно.");
      return;
    }
    refreshProfileSelector();
    applyFieldValues({});
    persistFields();
    refreshHistoryView();
  });

  document.getElementById("deleteProfileBtn").addEventListener("click", () => {
    const active = getActiveProfile();
    if (!confirm(`Сигурен ли си, че искаш да изтриеш профил "${active}"?\nЦялата му история ще бъде загубена.`)) return;
    deleteProfile(active);
    refreshProfileSelector();
    applyFieldValues(loadProfileFields());
    refreshHistoryView();
  });

  document.getElementById("tab-profile").addEventListener("change", persistFields);
  document.querySelectorAll('input[name="warmupIntensity"]').forEach(r =>
    r.addEventListener("change", persistFields)
  );
  document.getElementById("injuries").addEventListener("input", persistFields);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });


  const proModal = document.getElementById("proModal");
  const proAlert = () => alert("Тази функция е достъпна в Pro версията.");

  document.getElementById("proUpgradeBtn").addEventListener("click", () => {
    proModal.style.display = "flex";
  });
  document.getElementById("proCloseBtn").addEventListener("click", () => {
    proModal.style.display = "none";
  });
  proModal.addEventListener("click", (e) => {
    if (e.target === proModal) proModal.style.display = "none";
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && proModal.style.display === "flex") {
      proModal.style.display = "none";
    }
  });

  document.querySelectorAll(".pro-device, #proHrUploadBtn, .pro-hr-monitor, #proCtaBtn")
    .forEach(el => el.addEventListener("click", proAlert));

  document.getElementById("addSessionBtn")
    .addEventListener("click", addSessionRow);
  document.getElementById("addFoodBtn")
    .addEventListener("click", addFoodRow);

  addSessionRow();
  addFoodRow();

  refreshHistoryView();

  document.getElementById("generateBtn")
    .addEventListener("click", () => {

      const weight     = parseFloat(document.getElementById("weight").value);
      const sleepHours = parseFloat(document.getElementById("sleep").value);
      const matchTime  = document.getElementById("matchTime").value;

      if (isNaN(weight) || isNaN(sleepHours) || !matchTime) {
        alert("Моля попълни тегло, сън и час на мач!");
        return;
      }

      const height         = parseFloat(document.getElementById("height").value)         || null;
      const age            = parseFloat(document.getElementById("age").value)            || null;
      const gender         = document.getElementById("gender").value || null;
      const position       = document.getElementById("position").value || null;
      const wakeUpTime     = document.getElementById("wakeUpTime").value || "07:00";
      const matchDuration  = parseFloat(document.getElementById("matchDuration").value)  || 90;
      const skipBreakfast  = document.getElementById("skipBreakfast").checked;
      const diet           = document.getElementById("diet").value || "regular";
      const season         = document.getElementById("season").value || "cool";

      const morningWeight   = parseFloat(document.getElementById("morningWeight").value)   || null;
      const postMatchWeight = parseFloat(document.getElementById("postMatchWeight").value) || null;

      const bfWeight = morningWeight || weight;
      const bodyFat  = calculateBodyFat({ weight: bfWeight, height, age, gender });
      renderBodyFatBar("bodyFatContainer", bodyFat, gender);

      const injuriesRaw = document.getElementById("injuries").value.trim();
      const intensity   = document.querySelector('input[name="warmupIntensity"]:checked')?.value || "full";

      const sessionRows    = document.querySelectorAll(".session-row");
      const recentSessions = Array.from(sessionRows).map(row => ({
        date:    row.querySelector(".session-date").value || todayISO(),
        type:    row.querySelector(".session-type").value,
        minutes: parseFloat(row.querySelector(".session-minutes").value) || 0
      }));

      const foodRows = Array.from(document.querySelectorAll(".food-row"));

      const unresolvedRows = [];
      const eveningMeal    = [];

      foodRows.forEach(row => {
        const nameInput = row.querySelector(".food-name");
        const raw   = nameInput.value.trim();
        const grams = parseFloat(row.querySelector(".food-grams").value) || 0;
        if (!raw || grams <= 0) return;

        const resolved = resolveFood(raw);

        if (resolved.match === "none") {
          nameInput.classList.add("invalid");
          unresolvedRows.push(raw);
          return;
        }

        eveningMeal.push({
          food:   resolved.canonical || raw,
          grams,
          macros: resolved.data,
          _match: resolved.match,
          _category: resolved.category
        });
      });

      if (unresolvedRows.length > 0) {
        alert(
          "Следните храни не са разпознати:\n\n" +
          unresolvedRows.map(n => " • " + n).join("\n") +
          "\n\nИзползвай autocomplete предложенията или поправи правописа."
        );
        return;
      }

      const corrections = getLatestCorrections();
      const playerData  = {
        weight, sleepHours, recentSessions, corrections,
        height, age, gender, position,
        wakeUpTime, matchDuration, skipBreakfast,
        morningWeight, postMatchWeight,
        bodyFat,
        diet,
        season,
        injuriesRaw, warmupIntensity: intensity
      };

      const warmupResult = generateWarmup(recentSessions, {
        injuries: injuriesRaw,
        intensity
      });
      const plan         = generateDayPlan(playerData, eveningMeal, matchTime, warmupResult);

      currentPlan = plan;
      renderPlan(plan);

      document.getElementById("chartSection").style.display = "block";
      const chartData = buildEnergyChartData(plan.timeline, matchTime);
      renderEnergyChart("energyCanvas", chartData);

      document.getElementById("feedbackSection").style.display = "block";
      resetFeedbackForm();

      document.getElementById("planOutput")
        .scrollIntoView({ behavior: "smooth" });
    });

  document.querySelectorAll(".star").forEach(star => {
    star.addEventListener("click", () => {
      document.querySelectorAll(".star").forEach(s => s.classList.remove("active"));
      star.classList.add("active");
      updateLiveScore();
    });
  });

  document.querySelectorAll(".yn-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const groupId = btn.dataset.id;

      document.querySelectorAll(`.yn-btn[data-id="${groupId}"]`)
        .forEach(b => b.classList.remove("active-yes", "active-no"));

      const cls = btn.dataset.value === "yes" ? "active-yes" : "active-no";
      btn.classList.add(cls);

      updateLiveScore();
    });
  });

  document.getElementById("submitFeedbackBtn")
    .addEventListener("click", () => {

      const ratingBtn         = document.querySelector(".star.active");
      const legFatigueBtn     = document.querySelector('.yn-btn[data-id="legFatigue"].active-yes, .yn-btn[data-id="legFatigue"].active-no');
      const mealTooHeavyBtn   = document.querySelector('.yn-btn[data-id="mealTooHeavy"].active-yes, .yn-btn[data-id="mealTooHeavy"].active-no');
      const lastedFullMatchBtn = document.querySelector('.yn-btn[data-id="lastedFullMatch"].active-yes, .yn-btn[data-id="lastedFullMatch"].active-no');

      if (!ratingBtn || !legFatigueBtn || !mealTooHeavyBtn || !lastedFullMatchBtn) {
        alert("Моля отговори на всички въпроси!");
        return;
      }

      if (!currentPlan) {
        alert("Първо генерирай план!");
        return;
      }

      const feedback = {
        physicalScore:   parseInt(ratingBtn.dataset.value),
        legFatigue:      legFatigueBtn.classList.contains("active-yes"),
        mealTooHeavy:    mealTooHeavyBtn.classList.contains("active-yes"),
        lastedFullMatch: lastedFullMatchBtn.classList.contains("active-yes")
      };

      const entry = saveFeedback(currentPlan, feedback);
      renderFeedbackResult(entry);

      const recovery = generateRecoveryPlan({
        weight:       currentPlan.profile?.weight  || currentPlan.weight,
        diet:         currentPlan.diet             || currentPlan.profile?.diet,
        injuriesRaw:  currentPlan.profile?.injuriesRaw
      });
      renderRecovery(recovery);
      document.getElementById("recoverySection").style.display = "block";

      refreshHistoryView();

      document.getElementById("recoverySection")
        .scrollIntoView({ behavior: "smooth" });
    });
});

function updateLiveScore() {
  const ratingBtn     = document.querySelector(".star.active");
  const legBtn        = document.querySelector('.yn-btn[data-id="legFatigue"].active-yes, .yn-btn[data-id="legFatigue"].active-no');
  const heavyBtn      = document.querySelector('.yn-btn[data-id="mealTooHeavy"].active-yes, .yn-btn[data-id="mealTooHeavy"].active-no');
  const lastBtn       = document.querySelector('.yn-btn[data-id="lastedFullMatch"].active-yes, .yn-btn[data-id="lastedFullMatch"].active-no');
  const scoreEl       = document.getElementById("liveScore");

  if (!ratingBtn || !legBtn || !heavyBtn || !lastBtn) {
    scoreEl.textContent = "—";
    return;
  }

  const r = parseInt(ratingBtn.dataset.value);
  let score = ((r - 1) / 4) * 40;
  if (legBtn.classList.contains("active-no"))    score += 20;
  if (heavyBtn.classList.contains("active-no"))  score += 20;
  if (lastBtn.classList.contains("active-yes"))  score += 20;

  scoreEl.textContent = Math.round(score) + "/100";
}

function resetFeedbackForm() {
  document.querySelectorAll(".star").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".yn-btn").forEach(b => b.classList.remove("active-yes", "active-no"));
  document.getElementById("liveScore").textContent = "—";
  document.getElementById("feedbackResult").style.display = "none";
  document.getElementById("submitFeedbackBtn").style.display = "block";
}

function renderFeedbackResult(entry) {
  const resultDiv = document.getElementById("feedbackResult");
  const { corrections } = entry;

  function corrText(mult, label) {
    if (mult > 1.0) return `<li>↑ ${label} +${Math.round((mult-1)*100)}%</li>`;
    if (mult < 1.0) return `<li>↓ ${label} -${Math.round((1-mult)*100)}%</li>`;
    return `<li>✓ ${label} — без промяна</li>`;
  }

  resultDiv.innerHTML = `
    <div class="feedback-saved">
      <h3>Фийдбакът е запазен</h3>
      <p>Оценка на мача: <strong style="color:#00e676">${entry.score}/100</strong></p>
      <p style="margin-top:8px">Корекции за следващия план:</p>
      <ul>
        ${corrText(corrections.energyMultiplier,  "Обща енергия")}
        ${corrText(corrections.carbMultiplier,    "Въглехидрати")}
        ${corrText(corrections.portionMultiplier, "Порции")}
      </ul>
    </div>
  `;

  resultDiv.style.display = "block";
  document.getElementById("submitFeedbackBtn").style.display = "none";
}

function renderPlan(plan) {
  const container  = document.getElementById("planOutput");
  const corrections = getLatestCorrections();
  const hasCorrns  = corrections.energyMultiplier !== 1.0 ||
                     corrections.carbMultiplier   !== 1.0 ||
                     corrections.portionMultiplier !== 1.0;

  const banner = hasCorrns
    ? `<div class="correction-banner">
        🔁 Планът е адаптиран спрямо фийдбак от предишен мач
       </div>`
    : "";

  const profileBits = [];
  if (plan.position) {
    profileBits.push(`Позиция: <strong>${translatePosition(plan.position)}</strong>`);
  }
  if (plan.matchDuration) {
    profileBits.push(`Мач: <strong>${plan.matchDuration} мин</strong>`);
  }
  if (plan.profile?.bodyFat != null) {
    profileBits.push(`BF: <strong>${plan.profile.bodyFat}%</strong>`);
  }
  if (plan.diet && plan.diet !== "regular") {
    profileBits.push(`Диета: <strong>${translateDiet(plan.diet)}</strong>`);
  }

  const mw = plan.profile?.morningWeight;
  const pw = plan.profile?.postMatchWeight;
  let weightDeltaLine = "";
  if (mw && pw) {
    const delta = (mw - pw).toFixed(1);
    weightDeltaLine = `<p>Тегло преди→след: <strong>${mw}kg → ${pw}kg</strong>
      (загуба ≈ ${delta}kg ≈ ${Math.round(delta * 1000)}ml течности)</p>`;
  }

  const profileLine = profileBits.length > 0
    ? `<p class="profile-line">${profileBits.join(" · ")}</p>`
    : "";

  let html = `
    ${banner}
    <div class="summary">
      <h2>📊 Обобщение</h2>
      ${profileLine}
      <p>Енергийна нужда: <strong>${plan.energy} kcal</strong></p>
      <p>Гликоген статус: <strong>${translateGlycogen(plan.glycogenStatus)}</strong></p>
      <p>
        Въглехидрати: <strong>${plan.adjustedMacros.carbs}g</strong> |
        Протеин: <strong>${plan.adjustedMacros.protein}g</strong> |
        Мазнини: <strong>${plan.adjustedMacros.fat}g</strong>
      </p>
      ${weightDeltaLine}
      ${plan.hydration
        ? `<p>Хидратация: <strong>${plan.hydration.totalMl}ml</strong> вода за деня
            <span class="hydration-breakdown">
              (база ${plan.hydration.breakdown.base}
              + тренировки ${plan.hydration.breakdown.training}
              + мач ${plan.hydration.breakdown.match})
            </span></p>`
        : ""}
    </div>
    <h2>📅 Времева линия</h2>
  `;

  plan.timeline.forEach(event => {
    const foodList = event.items && event.items.length > 0
      ? `<ul>${event.items.map(i => `<li>${i.food} — ${i.grams}g</li>`).join("")}</ul>`
      : "";

    const exerciseList = event.exercises && event.exercises.length > 0
      ? `<div class="exercise-grid">
          ${event.exercises.map(ex => `
            <div class="exercise-card">
              ${ex.gifUrl
                ? `<img src="${ex.gifUrl}" alt="${ex.name}" class="exercise-gif" />`
                : `<div class="exercise-no-gif">🏃</div>`}
              <div class="exercise-info">
                <strong>${ex.name}</strong>
                <span>${ex.duration}s ${ex.sets ? `× ${ex.sets} серии` : ""}</span>
                <em>${ex.purpose}</em>
              </div>
            </div>`).join("")}
        </div>`
      : "";

    const hydrationClass = event.isHydration ? " hydration-event" : "";

    const skippedList = event.skippedExercises && event.skippedExercises.length > 0
      ? `<div class="skipped-exercises">
          <p class="skipped-title">Пропуснати упражнения:</p>
          <ul>
            ${event.skippedExercises.map(s =>
              `<li><span class="skipped-name">${s.name}</span> — <em>${s.reason}</em></li>`
            ).join("")}
          </ul>
        </div>`
      : "";

    html += `
      <div class="timeline-event${hydrationClass}">
        <div class="event-time">${event.time}</div>
        <div class="event-body">
          <h3>${event.label}</h3>
          <p class="note">${event.note}</p>
          ${foodList}
          ${exerciseList}
          ${skippedList}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderRecovery(recovery) {
  const container = document.getElementById("recoveryOutput");
  const { meal, exercises, skippedExercises, totalMinutes } = recovery;

  const skippedHtml = skippedExercises.length > 0
    ? `<div class="skipped-exercises">
        <p class="skipped-title">Пропуснати упражнения:</p>
        <ul>
          ${skippedExercises.map(s =>
            `<li><span class="skipped-name">${s.name}</span> — <em>${s.reason}</em></li>`
          ).join("")}
        </ul>
      </div>`
    : "";

  container.innerHTML = `
    <div class="recovery-grid">
      <div class="recovery-card">
        <h3>🍽 Хранене (до ${meal.windowMinutes} мин след мача)</h3>
        <p class="recovery-row">
          <strong>${meal.protein.grams}g протеин</strong>
          <span class="recovery-suggest">${meal.protein.suggestions.join(" / ")}</span>
        </p>
        <p class="recovery-row">
          <strong>${meal.carbs.grams}g въглехидрати</strong>
          <span class="recovery-suggest">${meal.carbs.suggestions.join(" / ")}</span>
        </p>
        <p class="recovery-row">
          <strong>${meal.fluids.ml}ml течности</strong>
          <span class="recovery-suggest">${meal.fluids.note}</span>
        </p>
      </div>

      <div class="recovery-card">
        <h3>🧘 Упражнения (~${totalMinutes} мин)</h3>
        <ul class="recovery-exercises">
          ${exercises.map(ex => `
            <li>
              <strong>${ex.name}</strong>
              <span class="recovery-duration">${ex.duration}s</span>
              <em>${ex.purpose}</em>
            </li>
          `).join("")}
        </ul>
        ${skippedHtml}
      </div>
    </div>
  `;
}

function translateDiet(diet) {
  const t = {
    regular:     "Обикновен",
    vegetarian:  "Вегетарианец",
    vegan:       "Веган",
    gluten_free: "Без глутен"
  };
  return t[diet] || diet;
}

function translatePosition(pos) {
  const t = {
    goalkeeper: "Вратар",
    defender:   "Защитник",
    midfielder: "Полузащитник",
    forward:    "Нападател",
    referee:    "Съдия"
  };
  return t[pos] || pos;
}

function translateGlycogen(status) {
  const t = {
    low:    "Нисък 🔴 — препоръчваме повече въгл.",
    normal: "Нормален 🟡 — балансиран план",
    high:   "Висок 🟢 — добре заредени"
  };
  return t[status] || status;
}
