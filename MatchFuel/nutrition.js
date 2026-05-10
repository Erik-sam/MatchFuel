// =============================================
// БАЗА ОТ ДАННИ НА ХРАНИ
// =============================================
// Всеки запис е за 100g и съдържа:
//   protein / carbs / fat → в грамове
//   category → използва се за fallback, когато
//              потребителят въведе непозната храна
//   label    → човешко показване в autocomplete dropdown
//
// Канонични имена (ключовете) — използват се из целия код
// (mealPlanner използва "rice", "chicken" и т.н. директно).
// Затова НЕ преименувай съществуващите ключове — само добавяй.
// =============================================

export const foodDatabase = {
  chicken:        { protein: 31,   carbs: 0,    fat: 3.6, category: "meat",      label: "Пилешко филе" },
  turkey:         { protein: 29,   carbs: 0,    fat: 1,   category: "meat",      label: "Пуешко филе" },
  beef:           { protein: 26,   carbs: 0,    fat: 15,  category: "meat",      label: "Говеждо" },
  veal:           { protein: 24,   carbs: 0,    fat: 6,   category: "meat",      label: "Телешко" },
  pork:           { protein: 27,   carbs: 0,    fat: 14,  category: "meat",      label: "Свинско" },
  lamb:           { protein: 25,   carbs: 0,    fat: 21,  category: "meat",      label: "Агнешко" },

  fish:           { protein: 22,   carbs: 0,    fat: 12,  category: "fish",      label: "Риба (общо)" },
  salmon:         { protein: 20,   carbs: 0,    fat: 13,  category: "fish",      label: "Сьомга" },
  tuna:           { protein: 28,   carbs: 0,    fat: 1,   category: "fish",      label: "Тон" },
  cod:            { protein: 18,   carbs: 0,    fat: 0.7, category: "fish",      label: "Треска" },
  trout:          { protein: 20,   carbs: 0,    fat: 3.5, category: "fish",      label: "Пъстърва" },
  shrimp:         { protein: 24,   carbs: 0.2,  fat: 0.3, category: "fish",      label: "Скариди" },

  egg:            { protein: 13,   carbs: 1.1,  fat: 11,  category: "dairy",     label: "Яйце" },
  egg_white:      { protein: 11,   carbs: 0.7,  fat: 0.2, category: "dairy",     label: "Белтък" },
  milk:           { protein: 3.4,  carbs: 5,    fat: 1,   category: "dairy",     label: "Мляко" },
  yogurt:         { protein: 3.5,  carbs: 4.7,  fat: 3.3, category: "dairy",     label: "Кисело мляко" },
  greek_yogurt:   { protein: 10,   carbs: 3.6,  fat: 0.4, category: "dairy",     label: "Гръцко мляко" },
  cottage_cheese: { protein: 11,   carbs: 3.4,  fat: 4.3, category: "dairy",     label: "Извара" },
  feta:           { protein: 14,   carbs: 4,    fat: 21,  category: "dairy",     label: "Сирене" },
  cheese:         { protein: 25,   carbs: 1.3,  fat: 33,  category: "dairy",     label: "Жълто сирене" },
  kashkaval:      { protein: 25,   carbs: 2,    fat: 27,  category: "dairy",     label: "Кашкавал" },

  rice:           { protein: 2.7,  carbs: 28,   fat: 0.3, category: "grain",     label: "Ориз (варен)" },
  brown_rice:     { protein: 2.6,  carbs: 23,   fat: 0.9, category: "grain",     label: "Кафяв ориз" },
  pasta:          { protein: 5,    carbs: 25,   fat: 1.1, category: "grain",     label: "Паста (варена)" },
  bread:          { protein: 9,    carbs: 49,   fat: 3.2, category: "grain",     label: "Бял хляб" },
  whole_bread:    { protein: 13,   carbs: 41,   fat: 4.2, category: "grain",     label: "Пълнозърнест хляб" },
  oats:           { protein: 13,   carbs: 67,   fat: 7,   category: "grain",     label: "Овесени ядки" },
  quinoa:         { protein: 4.4,  carbs: 21,   fat: 1.9, category: "grain",     label: "Киноа" },
  couscous:       { protein: 4,    carbs: 23,   fat: 0.2, category: "grain",     label: "Кускус" },
  bulgur:         { protein: 3,    carbs: 19,   fat: 0.2, category: "grain",     label: "Булгур" },
  tortilla:       { protein: 7,    carbs: 55,   fat: 7,   category: "grain",     label: "Тортила" },
  cornflakes:     { protein: 7,    carbs: 84,   fat: 0.4, category: "grain",     label: "Корнфлейкс" },
  potato:         { protein: 2,    carbs: 17,   fat: 0.1, category: "grain",     label: "Картоф" },
  sweet_potato:   { protein: 1.6,  carbs: 20,   fat: 0.1, category: "grain",     label: "Сладък картоф" },

  beans:          { protein: 9,    carbs: 21,   fat: 0.5, category: "legume",    label: "Боб" },
  lentils:        { protein: 9,    carbs: 20,   fat: 0.4, category: "legume",    label: "Леща" },
  chickpeas:      { protein: 8,    carbs: 27,   fat: 2.6, category: "legume",    label: "Нахут" },
  tofu:           { protein: 8,    carbs: 1.9,  fat: 4.8, category: "legume",    label: "Тофу" },
  tempeh:         { protein: 19,   carbs: 9,    fat: 11,  category: "legume",    label: "Темпе" },

  apple:          { protein: 0.3,  carbs: 14,   fat: 0.2, category: "fruit",     label: "Ябълка" },
  banana:         { protein: 1.1,  carbs: 23,   fat: 0.3, category: "fruit",     label: "Банан" },
  orange:         { protein: 0.9,  carbs: 12,   fat: 0.1, category: "fruit",     label: "Портокал" },
  pear:           { protein: 0.4,  carbs: 15,   fat: 0.1, category: "fruit",     label: "Круша" },
  grapes:         { protein: 0.7,  carbs: 18,   fat: 0.2, category: "fruit",     label: "Грозде" },
  strawberry:     { protein: 0.7,  carbs: 8,    fat: 0.3, category: "fruit",     label: "Ягоди" },
  blueberry:      { protein: 0.7,  carbs: 14,   fat: 0.3, category: "fruit",     label: "Боровинки" },
  watermelon:     { protein: 0.6,  carbs: 8,    fat: 0.2, category: "fruit",     label: "Диня" },
  pineapple:      { protein: 0.5,  carbs: 13,   fat: 0.1, category: "fruit",     label: "Ананас" },

  carrot:         { protein: 0.9,  carbs: 10,   fat: 0.2, category: "vegetable", label: "Морков" },
  tomato:         { protein: 0.9,  carbs: 3.9,  fat: 0.2, category: "vegetable", label: "Домат" },
  cucumber:       { protein: 0.7,  carbs: 3.6,  fat: 0.1, category: "vegetable", label: "Краставица" },
  lettuce:        { protein: 1.4,  carbs: 2.9,  fat: 0.2, category: "vegetable", label: "Маруля" },
  spinach:        { protein: 2.9,  carbs: 3.6,  fat: 0.4, category: "vegetable", label: "Спанак" },
  broccoli:       { protein: 2.8,  carbs: 7,    fat: 0.4, category: "vegetable", label: "Броколи" },
  bellpepper:     { protein: 1,    carbs: 6,    fat: 0.3, category: "vegetable", label: "Чушка" },
  onion:          { protein: 1.1,  carbs: 9,    fat: 0.1, category: "vegetable", label: "Лук" },
  zucchini:       { protein: 1.2,  carbs: 3.1,  fat: 0.3, category: "vegetable", label: "Тиквичка" },

  almonds:        { protein: 21,   carbs: 22,   fat: 50,  category: "nut",       label: "Бадеми" },
  walnuts:        { protein: 15,   carbs: 14,   fat: 65,  category: "nut",       label: "Орехи" },
  peanuts:        { protein: 26,   carbs: 16,   fat: 49,  category: "nut",       label: "Фъстъци" },
  peanut_butter:  { protein: 25,   carbs: 20,   fat: 50,  category: "nut",       label: "Фъстъчено масло" },
  olive_oil:      { protein: 0,    carbs: 0,    fat: 100, category: "fat",       label: "Зехтин" },
  avocado:        { protein: 2,    carbs: 9,    fat: 15,  category: "fat",       label: "Авокадо" },

  honey:          { protein: 0.3,  carbs: 82,   fat: 0,   category: "sweet",     label: "Мед" },
  chocolate:      { protein: 5,    carbs: 59,   fat: 30,  category: "sweet",     label: "Шоколад" }
};

export const foodAliases = {
  "пилешко": "chicken", "пиле": "chicken", "пилешко филе": "chicken", "chiken": "chicken",
  "пуешко": "turkey", "пуйка": "turkey",
  "говеждо": "beef", "говежко": "beef",
  "телешко": "veal",
  "свинско": "pork",
  "агнешко": "lamb",

  "риба": "fish",
  "сьомга": "salmon", "salmon fillet": "salmon",
  "тон": "tuna", "туна": "tuna",
  "треска": "cod",
  "пъстърва": "trout",
  "скариди": "shrimp", "скарида": "shrimp",

  "яйце": "egg", "яйца": "egg", "eggs": "egg",
  "белтък": "egg_white", "белтъци": "egg_white", "egg whites": "egg_white",
  "мляко": "milk",
  "кисело мляко": "yogurt", "кисело": "yogurt",
  "гръцко мляко": "greek_yogurt", "гръцко кисело": "greek_yogurt", "greek yogurt": "greek_yogurt",
  "извара": "cottage_cheese", "cottage cheese": "cottage_cheese",
  "сирене": "feta", "фета": "feta",
  "жълто сирене": "cheese",
  "кашкавал": "kashkaval",

  "ориз": "rice",
  "кафяв ориз": "brown_rice", "brown rice": "brown_rice",
  "паста": "pasta", "макарони": "pasta", "спагети": "pasta",
  "хляб": "bread", "бял хляб": "bread",
  "пълнозърнест хляб": "whole_bread", "whole bread": "whole_bread", "whole grain bread": "whole_bread",
  "овес": "oats", "овесени ядки": "oats",
  "киноа": "quinoa",
  "кус-кус": "couscous", "кускус": "couscous",
  "булгур": "bulgur",
  "тортила": "tortilla",
  "корнфлейкс": "cornflakes",
  "картоф": "potato", "картофи": "potato",
  "сладък картоф": "sweet_potato", "батат": "sweet_potato",

  "боб": "beans",
  "леща": "lentils",
  "нахут": "chickpeas",
  "тофу": "tofu",
  "темпе": "tempeh",

  "ябълка": "apple", "ябълки": "apple",
  "банан": "banana", "банани": "banana",
  "портокал": "orange", "портокали": "orange",
  "круша": "pear", "круши": "pear",
  "грозде": "grapes",
  "ягода": "strawberry", "ягоди": "strawberry",
  "боровинки": "blueberry", "боровинка": "blueberry",
  "диня": "watermelon",
  "ананас": "pineapple",

  "морков": "carrot", "моркови": "carrot",
  "домат": "tomato", "домати": "tomato",
  "краставица": "cucumber", "краставици": "cucumber",
  "маруля": "lettuce", "салата": "lettuce",
  "спанак": "spinach",
  "броколи": "broccoli",
  "чушка": "bellpepper", "чушки": "bellpepper", "пипер": "bellpepper",
  "лук": "onion",
  "тиквичка": "zucchini", "тиквички": "zucchini",

  "бадем": "almonds", "бадеми": "almonds",
  "орех": "walnuts", "орехи": "walnuts",
  "фъстък": "peanuts", "фъстъци": "peanuts",
  "фъстъчено масло": "peanut_butter", "peanut butter": "peanut_butter",
  "зехтин": "olive_oil", "маслиново масло": "olive_oil",
  "авокадо": "avocado",

  "мед": "honey",
  "шоколад": "chocolate"
};

export const categoryAverages = {
  meat:      { protein: 27,  carbs: 0,    fat: 10,  label: "≈ средно месо" },
  fish:      { protein: 22,  carbs: 0,    fat: 5,   label: "≈ средна риба" },
  dairy:     { protein: 10,  carbs: 4,    fat: 10,  label: "≈ средни млечни" },
  grain:     { protein: 6,   carbs: 35,   fat: 2,   label: "≈ средни зърнени" },
  legume:    { protein: 10,  carbs: 18,   fat: 3,   label: "≈ средни бобови" },
  fruit:     { protein: 0.7, carbs: 13,   fat: 0.2, label: "≈ среден плод" },
  vegetable: { protein: 1.3, carbs: 5,    fat: 0.3, label: "≈ среден зеленчук" },
  nut:       { protein: 20,  carbs: 18,   fat: 55,  label: "≈ средни ядки" },
  fat:       { protein: 1,   carbs: 5,    fat: 60,  label: "≈ средна мазнина" },
  sweet:     { protein: 3,   carbs: 70,   fat: 15,  label: "≈ средно сладко" }
};

export function calculateMacros(meal) {
  let totalProtein = 0;
  let totalCarbs   = 0;
  let totalFat     = 0;

  meal.forEach(item => {
    const data = item.macros || foodDatabase[item.food];

    if (!data) {
      console.warn(`Непозната храна в calculateMacros: ${item.food}`);
      return;
    }

    const factor = item.grams / 100;

    totalProtein += data.protein * factor;
    totalCarbs   += data.carbs   * factor;
    totalFat     += data.fat     * factor;
  });

  return {
    protein: totalProtein,
    carbs:   totalCarbs,
    fat:     totalFat
  };
}
