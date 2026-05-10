# MatchFuel — Резюме на проекта

> Подробно ръководство за разработчик, който никога не е виждал кода.
> Версия: 2026-05-07 · Целият frontend е в подпапката `MatchFuel/`.

---

## 1. Какво е MatchFuel и каква задача решава

**MatchFuel** е web приложение, което генерира персонализиран **план за деня на мач** на футболист — какво да яде, кога, колко да пие вода, как да загрее и как да се възстанови. Планът се адаптира автоматично след всеки мач въз основа на фийдбак от потребителя.

### Проблемът, който решава
Любителските и полупрофесионалните футболисти обикновено разчитат на интуиция или на общи статии в интернет — никой от тези подходи не отчита **техните** данни (тегло, сън от снощи, последните 3 тренировки, диета, контузии, час на мача). MatchFuel прави изчислението, което иначе би правил спортен диетолог, на база няколко минути попълване на форма.

### Какво **не** е MatchFuel
- Не е медицинско приложение — препоръките са приближения (BMR ≈ 30 kcal/kg, Deurenberg за BF%).
- Няма backend, няма акаунти. Всичко живее в `localStorage` на браузъра.
- Няма build стъпка, няма Node.js dependencies — статичен HTML/CSS/JS.
- Не поръчва храна, не вика лекар. Това е **advisory agent** — съветва, не действа.

### Технологичен стек
| Компонент | Какво | Защо |
|---|---|---|
| HTML + CSS | Чист, без рамка | По-малък bundle, нулева build стъпка |
| JS (ES modules) | `type="module"` навсякъде | Имплицитен strict mode, модулна изолация |
| Chart.js | От CDN в `index.html` | Единствен external dep — за енергийната графа |
| `localStorage` | Профили + история | Persist без backend |

---

## 2. Как работи — основният flow от вход до изход

Един "match-day cycle" минава през 4 фази (виж §6 за теоретичното оформление):

```
   ОБСЕРВАЦИЯ  →  РЕШЕНИЕ  →  ДЕЙСТВИЕ  →  УЧЕНЕ
   (UI form)    (модули)   (DOM render)  (фийдбак)
        ▲                                    │
        └────────────────────────────────────┘
              следващият план е по-добър
```

### 2.1 Какво се случва, когато потребителят натисне „ГЕНЕРИРАЙ ПЛАН"

Click handler-ът е в `ui.js:424`. Стъпките са следните:

1. **Четене на формата** — задължителни (`weight`, `sleep`, `matchTime`) + незадължителни (`height`, `age`, `gender`, `position`, `diet`, `season`, `wakeUpTime`, `matchDuration`, `skipBreakfast`, `injuries`, ...).

2. **Body fat** — `calculateBodyFat({weight, height, age, gender})` връща число или `null`. Ако не е `null`, `renderBodyFatBar` рисува цветна скала с маркер.

3. **Резолюция на храни** — всеки ред от вечерята минава през `resolveFood(raw)` от `foodMatcher.js`, който връща обект с `match: "exact" | "alias" | "fuzzy" | "category" | "none"`. „none" блокира генерирането и маркира реда червен.

   ```js
   // ui.js — съкратено
   const resolved = resolveFood(raw);
   if (resolved.match === "none") {
     nameInput.classList.add("invalid");
     unresolvedRows.push(raw);
     return;
   }
   eveningMeal.push({ food: resolved.canonical || raw, grams, macros: resolved.data });
   ```

4. **Зареждане на корекциите от последния мач** — `getLatestCorrections()` връща `{energyMultiplier, carbMultiplier, portionMultiplier}`. Първият мач → всички 1.0.

5. **Загрявка** — `generateWarmup(recentSessions, {injuries, intensity})` избира упражнения, филтрира по контузии и интензивност.

6. **Главната оркестрация** — `generateDayPlan(playerData, eveningMeal, matchTime, warmupResult)` от `mealPlanner.js`:

   ```js
   const plan = generateDayPlan(playerData, eveningMeal, matchTime, warmupResult);
   ```

   Вътре в `generateDayPlan`:
   - `analyzeEveningMeal(eveningMeal)` → определя `glycogenStatus` ∈ {low, normal, high} и `carbAdjustment` ∈ {1.2, 1.0, 0.9}
   - `calculateEnergyNeeds(...)` → дневни калории (виж §5)
   - Корекциите се прилагат: `energy *= corrections.energyMultiplier`, `carbs *= corrections.carbMultiplier`
   - `calculateMacroNeeds(energy)` → 60% въглехидрати, 20% протеин, 20% мазнини
   - Енергията се разпределя между **закуска / обяд (ако мач ≥ 18:00) / предматч**
   - `buildMealFromMacros(macros, diet)` за всяко хранене — превръща макроси → грамове, ограничено по `portionLimits`
   - `generateHydrationReminders(...)` → напомняния на ~90 мин
   - Сглобява се `timeline: [{label, time, items, note}]`

7. **Рендериране** — `renderPlan(plan)` рисува timeline-а, `renderEnergyChart` рисува енергийната крива, `feedbackSection` се показва.

### 2.2 Цикъл след мача

Когато потребителят попълни 4 въпроса във фийдбак формата и натисне „ЗАПАЗИ ФИЙДБАК":

1. `saveFeedback(currentPlan, feedback)` → калкулира нови `corrections`, добавя запис в историята (max 10 за профил).
2. `generateRecoveryPlan(playerData)` → постматч хранене + леки упражнения, рендирани в `recoverySection`.
3. `renderProgressChart` обновява графата на представянето в таб „История".

---

## 3. Файлова структура

Целият frontend е в `MatchFuel/` (бившата папка `backend/`, преименувана 2026-05-07).
Една стара папка `frontend/` беше изтрита.

```
Software Project/
├── CLAUDE.md                  ← инструкции за AI-асистент при разработка
├── PROJECT_SUMMARY.md         ← този файл
├── package.json               ← без deps; може да се игнорира
├── MatchFuel/                 ← всичко интересно е тук
│   ├── index.html             ← главна страница; зарежда само ui.js
│   ├── style.css              ← всички стилове (вкл. PRO modal, feedback, recovery)
│   ├── ui.js                  ← ★ ВХОДНА ТОЧКА — свързва DOM и логиката
│   ├── mealPlanner.js         ← ★ ОРКЕСТРАТОР — generateDayPlan, timeline
│   ├── nutrition.js           ← foodDatabase (~65 храни) + calculateMacros
│   ├── foodMatcher.js         ← fuzzy matching (Levenshtein + BG/EN aliases)
│   ├── energy.js              ← calculateEnergyNeeds + recency decay
│   ├── energyChart.js         ← Chart.js рендер на енергийната крива
│   ├── warmup.js              ← exerciseLibrary + generateWarmup + injury filter
│   ├── feedback.js            ← saveFeedback + adaptive corrections + score
│   ├── bodyFat.js             ← Deurenberg формула + цветна скала
│   ├── hydration.js           ← daily water + reminder schedule
│   ├── recovery.js            ← post-match meal + light exercises
│   └── profiles.js            ← localStorage профили + history per profile
└── AI_Agent_Project/          ← университетска документация (отделен проект)
```

### Кой файл какво прави — в едно изречение

| Файл | Отговорност |
|---|---|
| `ui.js` | Слуша click-ове, събира form данни, вика модулите, рендира DOM. **Единственото място с DOM логика.** |
| `mealPlanner.js` | Главната `generateDayPlan` — взима всичко и връща timeline. **Тук е оркестрацията.** |
| `nutrition.js` | Чиста data — `foodDatabase`, `foodAliases`, `categoryAverages`. Без зависимости от друг наш модул. |
| `foodMatcher.js` | „chiken" → „chicken", „пилешко" → „chicken", „непознато месо" → category fallback. |
| `energy.js` | Калории за деня + макро разпределение. Recency-weighted training load. |
| `energyChart.js` | Симулира енергийна крива и я рисува с Chart.js. |
| `warmup.js` | exerciseLibrary + filter по контузия/интензивност. |
| `feedback.js` | След мача: преобразува отговори в множители за следващия план + score 0–100. |
| `bodyFat.js` | Deurenberg калкулатор + цветна скала с маркер. |
| `hydration.js` | Дневна вода + напомняния на 90 мин. |
| `recovery.js` | Постматч хранене + леки упражнения, диета- и контузия-aware. |
| `profiles.js` | Multi-profile localStorage layer. Всички per-profile данни минават оттук. |

---

## 4. Всички реализирани функции

Десетте feature-а са реализирани в реда, в който са планирани в `CLAUDE.md`. Всички са завършени към 2026-05-07.

### Feature 1 — Разширена база от храни + fuzzy matching
- `nutrition.js → foodDatabase` се разшири от ~10 до **~65 храни** (меса, риба, млечни, зърнени, бобови, плодове, зеленчуци).
- Всеки запис има `category`, използвана за fallback при непозната храна.
- `foodMatcher.js` имплементира 5-степенна резолюция:
  ```
  1. exact      → "chicken"
  2. alias      → "пилешко" → chicken (BG/EN речник)
  3. fuzzy      → "chiken" → chicken (Levenshtein ≤ 1 за къси, ≤ 2 за дълги)
  4. category   → "непознато месо" → categoryAverages.meat
  5. none       → грешка, маркира input-а
  ```
- Autocomplete dropdown на всеки food input.

### Feature 2 — Разширен профил
- Нови полета: `height`, `age`, `gender`, `position` (вратар/защитник/полузащитник/нападател/съдия), `matchDuration` (1–130 мин), `wakeUpTime`, `morningWeight`, `postMatchWeight`.
- `bodyFat.js` калкулатор по **Deurenberg (1991)**: `BF% = 1.20·BMI + 0.23·age − 10.8·genderFactor − 5.4`.
- Цветна 5-сегментна скала с маркер (Есенциални/Атлет/Фит/Средно/Наднормено).
- Закуската се позиционира **до 1 час след събуждане** (вместо фиксиран час).
- `position` е input към енергийното изчисление (полузащитник × 1.10, вратар × 0.90, ...).

### Feature 3 — Диетични предпочитания
- 4 опции: `regular`, `vegetarian`, `vegan`, `gluten_free`.
- `mealPlanner.js → dietSources` смени protein/carb pool-овете:
  ```js
  vegan: {
    proteins: ["tofu", "tempeh", "lentils", "chickpeas"],
    carbs:    ["rice", "pasta", "bread", "oats"]
  },
  gluten_free: {
    proteins: ["chicken", "fish", "egg"],
    carbs:    ["rice", "brown_rice", "quinoa", "potato"]
  }
  ```
- `recovery.js` използва същия `dietSources` → пост-мач храненето остава в синхрон.

### Feature 4 — Хидратация
- `calculateDailyWater(weight, season, recentSessions)`:
  ```
  total_ml = (35 × weight_kg
            + Σ minutes × ml_per_min × decay(d/2)
            + 600 mach_bonus) × seasonFactor

  seasonFactor: cold 0.95, cool 1.00, warm 1.10, hot 1.25
  ```
- `generateHydrationReminders` пуска reminder на всеки 90 мин от събуждане до края на мача + 30 мин.
- 70% от дневната вода се разпределя в активния прозорец; UI показва разбивка `{base, training, match}`.

### Feature 5 — Гъвкавост на хранене спрямо часа на мача
- Ако `matchTime ≥ 18:00` → автоматично се добавя **обяд** в timeline-а.
- Pre-match хранене се разполага **2.5–4 часа** преди мача (а не на фиксиран час).
- Когато разликите между храненията са твърде големи, порциите се преразпределят (warning в UI ако стане нереалистично).

### Feature 6 — Последни 3 тренировки с recency decay
- Замени плоския „weekly load" с `recentSessions: [{date, type, minutes}]`, max 3 реда.
- **Енергия:** `exp(-daysAgo / 3)` — половин живот 3 дни (gly-replenishment + DOMS).
  - Вчера ≈ 0.72, преди 3 дни ≈ 0.37, преди 7 ≈ 0.10.
- **Хидратация:** `exp(-daysAgo / 2)` — водният баланс се нормализира по-бързо.
  ```js
  // energy.js
  function recencyFactor(dateStr) {
    return Math.exp(-daysAgo(dateStr) / 3);
  }
  export function calculateRecentLoad(sessions) {
    return sessions.reduce((acc, s) =>
      acc + s.minutes * trainingFactors[s.type] * recencyFactor(s.date),
    0);
  }
  ```

### Feature 7 — Контузии + адаптирана загрявка
- Свободен текст input за контузии; `normalizeInjuries` го преобразува в канонични зони (`knee`, `ankle`, `hamstring`, `quad`, `groin`, `hip`, `back`, `shoulder`, `calf`).
- Поддържа **BG и EN** + частични съвпадения („болка в коляното" → `knee`).
- Всяко упражнение в `exerciseLibrary` има `zones: [...]`. Ако някоя зона е в injured list → пропуска се.
- Toggle „Лека / Пълна" интензивност — light режимът пропуска `highIntensity: true` упражнения (спринтове, high knees).
- UI показва списъка „пропуснати упражнения" с причината.

### Feature 8 — Възстановяване след мач
- Активира се след submit на фийдбак.
- **Хранене:** `0.3g protein/kg + 1.0g carbs/kg` в първите **30 минути** (anabolic window, по ISSN).
- Източниците следват `dietSources[diet]` → консистентност с feature 3.
- **Упражнения:** статичен списък (cooldown ход, 4 stretching, 3 foam rolling, дишане 4-7-8).
- Същият zone-tag модел като warmup → контузии се пропускат.

### Feature 9 — Pro версия (само UI)
- Бутон „◆ PRO" в header → отваря модал.
- Показва 4 устройства (Google Fit / Apple Health / Garmin / Polar) — всяко с таг „Available in Pro".
- HR upload бутон + real-time monitor placeholder.
- Click на която и да е заключена част → `alert("Available in Pro")`.
- **Без реален backend** — чисто демо за бъдещ paywall.

### Feature 10 — Multi-profile + tabs
- `profiles.js` управлява localStorage:
  ```
  fnwo_profiles → { [name]: { fields: {...}, history: [...] } }
  fnwo_active   → "име на активния профил"
  ```
- Profile bar най-горе: dropdown + бутони „+ Нов" / „× Изтрий".
- 3 tab-а: **Профил / План / История**.
- Migration: ако има стар глобален `fnwo_history`, мигрира се в `Default` профил при първо зареждане.
- Историята е per-profile → корекциите за един играч не „текат" в друг.

---

## 5. Как работи adaptive learning цикълът

Сърцето на проекта. Това е, което прави MatchFuel **agent**, а не калкулатор.

### 5.1 Сигналите (input от потребителя)

След мача потребителят попълва 4 въпроса:

| Сигнал | Тип | Значение |
|---|---|---|
| `physicalScore` | 1–5 (звезди) | Как се представи физически |
| `legFatigue` | да/не | Краката бяха ли уморени |
| `mealTooHeavy` | да/не | Беше ли тежко храненето |
| `lastedFullMatch` | да/не | Издържа ли цял мач |

### 5.2 Калкулиране на корекции (`feedback.js → calculateCorrections`)

Сигналите се преобразуват в три **множителя**, всеки в диапазона `[0.70, 1.30]`:

```js
let energyMultiplier  = 1.0;
let carbMultiplier    = 1.0;
let portionMultiplier = 1.0;

if (feedback.physicalScore <= 2)        energyMultiplier += 0.10;
else if (feedback.physicalScore === 3)  energyMultiplier += 0.05;
else if (feedback.physicalScore === 5)  energyMultiplier -= 0.05;

if (feedback.legFatigue)                carbMultiplier   += 0.15;
if (feedback.mealTooHeavy)              portionMultiplier -= 0.10;
if (!feedback.lastedFullMatch) {
  energyMultiplier += 0.10;
  carbMultiplier   += 0.10;
}
// ... clamp to [0.70, 1.30]
```

**Защо clamp:** един лош ден не може да причини runaway feedback. Дори при най-лоши отговори следващият план се сменя най-много с ±30%.

### 5.3 Прилагане на корекциите при следващия план

```js
// ui.js
const corrections = getLatestCorrections();         // от history[0] на профила
const playerData  = { weight, ..., corrections };
const plan = generateDayPlan(playerData, ...);

// mealPlanner.js (вътре в generateDayPlan)
energy            *= corrections.energyMultiplier;
adjustedMacros.carbs *= corrections.carbMultiplier;
// и при build-ването на хранене:
grams *= corrections.portionMultiplier;
```

### 5.4 Score за прогрес графата

Паралелно с корекциите се изчислява `score ∈ [0, 100]`:

```js
const physPoints    = ((feedback.physicalScore - 1) / 4) * 40;  // 0-40
const fatiguePoints = feedback.legFatigue       ? 0  : 20;
const heavyPoints   = feedback.mealTooHeavy     ? 0  : 20;
const endurePoints  = feedback.lastedFullMatch  ? 20 : 0;
return Math.round(physPoints + fatiguePoints + heavyPoints + endurePoints);
```

Този score се рисува като линейна графа в таб „История" — потребителят буквално вижда дали се подобрява.

### 5.5 Свойства на цикъла

- **Per-profile.** Всеки профил има своя си история → корекциите за един играч не влияят на друг.
- **Bounded.** Тройното clamp-ване гарантира стабилност.
- **Replayable.** Сигналите и корекциите се пазят отделно → може да се „превърти" история през различна decision policy (използва се в академичната ablation документация).
- **Малък data volume.** Max 10 запис на профил → няма смисъл от gradient descent. Простото additive correction е оптимално за този мащаб.

---

## 6. Връзка с AI Agent концепцията (Observe–Decide–Act–Learn)

MatchFuel е реализация на **simple learning agent** по класификацията на Russell & Norvig (*AIMA*, 4th ed., ch. 2). Папката `AI_Agent_Project/` съдържа подробна академична документация — тук е резюме.

### 6.1 Четирите фази

```
       ┌─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 │
   OBSERVE  ──►  DECIDE  ──►  ACT  ──►  LEARN  ──────────┘
   (sensors)    (reasoning)  (actuators)  (feedback)
```

### 6.2 OBSERVE — какво „вижда" агентът

Перцепциите идват от два източника:

| Източник | Канал | Честота |
|---|---|---|
| Match-day форма | DOM input елементи | При всяко генериране |
| Profile + history | `localStorage` (`profiles.js`) | При всеки цикъл |

**Без история няма учене.** Това прави `localStorage` слой памет на агента, не просто кеш.

### 6.3 DECIDE — pipeline от чисти функции

Решението е **детерминистичен pipeline**. Никой модул няма глобално mutable state — всичко минава през аргументи:

| Модул | Ролята му |
|---|---|
| `bodyFat.js` | Оценка на телесния състав |
| `energy.js` | Калории за деня (с recency decay) |
| `nutrition.js` | Макроси на храни |
| `foodMatcher.js` | Symbol grounding — текст → канонична храна |
| `mealPlanner.js` | Композиране на хранения + timeline |
| `warmup.js` | Загрявка с филтър по контузии |
| `hydration.js` | Вода + reminder schedule |
| `recovery.js` | Постматч план |

Това е „decision making", а не „просто аритметика", защото логиката е **conditional**:

- Същата храна → различен glycogen статус в зависимост от количеството въглехидрати
- Същата тренировка → различен принос към умората в зависимост от давността
- Същите упражнения → различна загрявка в зависимост от контузиите
- Същата енергия → различен timeline в зависимост от часа на мача

### 6.4 ACT — actuator-ите

Action space-ът е множеството DOM артефакти:

1. Timeline на деня
2. Енергийна графа
3. Карта със загрявка (с GIF-ове)
4. BF% скала
5. Карта за възстановяване
6. Хидратация summary

Агентът **не извършва действия в реалния свят** — играчът е actuator-ът, който премества тялото. Това е **advisory agent** (AIMA §27.1).

### 6.5 LEARN — out-of-band фаза

Учещият елемент работи по различна честота от decide loop-а — само след завършен мач. Той:

1. Чете 4-те сигнала от формата
2. Изчислява новите корекции (`calculateCorrections`)
3. Записва ги в `history[0]` на активния профил
4. При следващия `generateDayPlan` те се вкарват като множители

**Тип учене:** табличен, additive, с фиксирани стъпки и hard clamping. Близък до TD(λ) с константен step size, но без gradient.

### 6.6 Russell-Norvig таксономия

| Свойство | MatchFuel |
|---|---|
| Среда | Partially observable, stochastic, sequential, dynamic, continuous, single-agent |
| Тип агент | Simple learning agent (model-based reflex + learning element) |
| Decision policy | Hand-crafted rules + научени correction multipliers |
| Learning algorithm | Tabular per-feature additive correction with hard clamps |

---

## 7. Как се стартира и използва приложението

### 7.1 Стартиране (за разработчик)

**Опция A — отвори директно в браузър:**
```
двойно щракане на MatchFuel/index.html
```
Работи за всичко **освен** евентуални CORS-ограничения за GIF-овете.

**Опция B — локален статичен сървър (препоръчително):**
```bash
# с Python
cd MatchFuel
python -m http.server 8000
# отвори http://localhost:8000

# или с Node (без deps)
npx serve MatchFuel
```

**Няма** `npm install`, **няма** build, **няма** environment променливи. `package.json` в root-а съществува по исторически причини и не описва реални dependency-та.

### 7.2 Първи стъпки за потребител

1. **Създай профил** — горе в profile bar натисни „+ Нов", въведи име.
2. **Попълни таб „Профил"** — тегло, височина, възраст, пол, час на ставане, час на мач, диета, сезон, позиция. Всички полета се auto-save в активния профил.
3. **Премини на таб „План":**
   - Добави до 3 последни тренировки (дата + тип + минути).
   - Ако имаш контузия → попълни я в свободен текст.
   - Избери интензивност на загрявката (Пълна / По-лека).
   - Въведи какво си ял на вечеря (autocomplete-а помага).
4. **Натисни „ГЕНЕРИРАЙ ПЛАН"** — приложението показва:
   - Timeline (вечеря → закуска → [обяд] → предматч → загрявка → мач → възстановяване)
   - Енергийна графа
   - Карта със загрявка (с GIF-ове и пропуснати упражнения)
   - Хидратационна разбивка
5. **След мача попълни фийдбака** — 4 въпроса, ~10 секунди. Записва се history запис, появяват се корекции и постматч план за възстановяване.
6. **Таб „История"** — виж прогрес графата на представянето си.

### 7.3 Тестови сценарии за разработчик

| Какво искаш да тестваш | Минимални входни данни |
|---|---|
| Базов план | weight=70, sleep=7, matchTime=15:00 |
| Late-match lunch path | matchTime=20:00 → автоматично се добавя обяд |
| Recency decay | Добави 3 тренировки на различни дати, виж как `loadMul` се променя |
| Vegan meal pool | diet=vegan → източниците стават tofu/tempeh/lentils/chickpeas |
| Injury filter | injuries=„коляно" + intensity=light → пропуснати: high knees, sprints, lateral shuffles, ... |
| Adaptive learning | Завърши 1 мач с physicalScore=1 → следващ план има `energyMultiplier ≈ 1.20` |
| Multi-profile isolation | Създай 2 профила, попълни различни данни, превключвай — нищо не трябва да изтича |

### 7.4 Чести задачи при разработка

- **Добавяне на нова храна** → редактирай `nutrition.js → foodDatabase` (макроси на 100g + категория + label) и евентуално `foodAliases` за BG превод.
- **Промяна на decision rule** → намери го в съответния модул (`feedback.js` за корекции, `energy.js` за енергия, `mealPlanner.js` за meal composition).
- **Добавяне на нов tab/view** → разшири `tab-nav` в `index.html`, добави tab panel, hook-ни в `activateTab` (`ui.js`).

### 7.5 Където да започнеш да четеш кода

Ако четеш кода за първи път, мини в този ред:

```
1. index.html        (50 реда HTML за разглеждане → свикваш с DOM-а)
2. ui.js:424–575     (главния click handler — целият flow в едно)
3. mealPlanner.js    (generateDayPlan е оркестраторът)
4. energy.js         (най-короткия сложен модул — recency decay е тук)
5. feedback.js       (целият learning loop)
6. profiles.js       (storage layer — кратък и чист)
```

Останалите модули са листа в дървото — четат се при нужда.

---

*Този файл е огледало на кода към 2026-05-07. Ако структурата се промени, актуализирай и `CLAUDE.md` (където е по-кратката версия за AI асистенти).*
