// =============================================
// foodMatcher.js
// =============================================
// Разпознава въведените от потребителя имена на храни и
// ги свързва с канонични записи от foodDatabase.
//
// Защо отделен модул:
// - Изолира fuzzy логиката от чистата data+math в nutrition.js
// - Избягва циркулярен import — nutrition.js не знае за matcher-а
// - Всеки който иска да преведе user input → макроси
//   вика само resolveFood() и не се интересува как работи
// =============================================

import { foodDatabase, foodAliases, categoryAverages } from "./nutrition.js";

function normalize(input) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j]     + 1,
        dp[i][j - 1]     + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

const categoryHints = {
  meat:       ["месо", "пилешк", "пуешк", "говежд", "говежк", "телешк",
               "свинск", "агнешк", "meat", "beef", "pork", "lamb", "turkey"],
  fish:       ["риба", "сьомга", "скарид", "fish", "salmon", "tuna", "cod", "trout", "shrimp"],
  grain:      ["ориз", "паста", "хляб", "макарон", "спагет", "овес", "булгур",
               "кус", "тортил", "rice", "pasta", "bread", "oat"],
  fruit:      ["плод", "ябълк", "банан", "круш", "грозд", "ягод", "боровин",
               "диня", "ананас", "портокал", "fruit", "apple", "banana"],
  vegetable:  ["зеленчук", "домат", "краставиц", "моркo", "спанак", "броко",
               "чушк", "лук", "тиквич", "маруля", "salad", "vegetable"],
  dairy:      ["мляко", "кисело", "сирене", "кашкав", "извара", "фета",
               "milk", "yogurt", "cheese"],
  legume:     ["боб", "леща", "нахут", "тофу", "темпе", "bean", "lentil", "chickpea"],
  nut:        ["бадем", "орех", "фъстък", "almond", "walnut", "peanut", "nut"],
  sweet:      ["мед", "шоколад", "захар", "бисквит", "sugar", "chocolate", "honey"]
};

function guessCategory(input) {
  for (const cat of Object.keys(categoryHints)) {
    const hints = categoryHints[cat];
    if (hints.some(h => input.includes(h))) return cat;
  }
  return null;
}

export function resolveFood(rawInput) {
  const input = normalize(rawInput);
  if (!input) return { canonical: null, data: null, match: "none" };

  if (foodDatabase[input]) {
    return { canonical: input, data: foodDatabase[input], match: "exact" };
  }

  if (foodAliases[input]) {
    const canonical = foodAliases[input];
    return { canonical, data: foodDatabase[canonical], match: "alias" };
  }

  const threshold = input.length <= 4 ? 1 : 2;
  let bestKey  = null;
  let bestDist = Infinity;

  const candidates = [
    ...Object.keys(foodDatabase),
    ...Object.keys(foodAliases)
  ];

  for (const cand of candidates) {
    if (Math.abs(cand.length - input.length) > threshold) continue;

    const d = levenshtein(input, cand);
    if (d < bestDist) {
      bestDist = d;
      bestKey  = cand;
      if (d === 0) break;
    }
  }

  if (bestKey && bestDist <= threshold) {
    const canonical = foodDatabase[bestKey] ? bestKey : foodAliases[bestKey];
    return {
      canonical,
      data:       foodDatabase[canonical],
      match:      "fuzzy",
      suggestion: canonical
    };
  }

  const cat = guessCategory(input);
  if (cat && categoryAverages[cat]) {
    return {
      canonical: null,
      data:      categoryAverages[cat],
      match:     "category",
      category:  cat
    };
  }

  return { canonical: null, data: null, match: "none" };
}

export function getSuggestions(rawInput, limit = 6) {
  const input = normalize(rawInput);
  if (!input) return [];

  const seen   = new Set();
  const scored = [];

  function push(canonical, displayed, score) {
    if (seen.has(canonical)) return;
    seen.add(canonical);
    const label = foodDatabase[canonical] ? foodDatabase[canonical].label : canonical;
    scored.push({ canonical, displayed, label, score });
  }

  function scoreCandidate(candidate) {
    if (candidate.startsWith(input)) return 0;
    if (candidate.includes(input))   return 1;
    const d = levenshtein(candidate, input);
    return d <= 2 ? 2 + d : null;
  }

  Object.keys(foodDatabase).forEach(name => {
    const s = scoreCandidate(name);
    if (s !== null) push(name, name, s);
  });

  Object.keys(foodAliases).forEach(alias => {
    const s = scoreCandidate(alias);
    if (s !== null) push(foodAliases[alias], alias, s);
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit);
}
