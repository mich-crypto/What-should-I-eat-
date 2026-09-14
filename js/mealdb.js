// TheMealDB integration — a free, keyless public recipe API
// (https://www.themealdb.com/api.php). Chosen as the app's default
// "real internet" recipe source for two reasons: it needs no API key or
// billing at all, and — unlike the built-in catalog's hand-picked stock
// photos — every recipe comes back with the *actual* photo of that exact
// dish, which is the fix for "the pictures don't match the recipe".
//
// Trade-off: TheMealDB has no cook-time or nutrition data, and doesn't
// split recipes into breakfast/lunch/dinner (only "Breakfast" exists as a
// category; everything else is mixed cuisines/proteins). So minutes and
// nutrition here are clearly-labeled estimates, and "lunch" vs "dinner" is
// really just "a savory meal" picked from the same pool for both.

const BASE = "https://www.themealdb.com/api/json/v1/1";

const SAVORY_CATEGORIES = ["Chicken", "Beef", "Pork", "Seafood", "Pasta", "Lamb", "Miscellaneous", "Goat"];

const ESTIMATED_NUTRITION = {
  breakfast: { kcal: 350, protein: 16, carbs: 42, fat: 13 },
  lunch: { kcal: 480, protein: 28, carbs: 48, fat: 18 },
  dinner: { kcal: 560, protein: 32, carbs: 46, fat: 22 },
};

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TheMealDB request failed (${res.status})`);
  return res.json();
}

function pickCategory(meal, diet) {
  if (meal === "breakfast") return "Breakfast";
  if (diet?.vegan) return "Vegan";
  if (diet?.vegetarian) return "Vegetarian";
  return SAVORY_CATEGORIES[Math.floor(Math.random() * SAVORY_CATEGORIES.length)];
}

function parseMeasure(measure) {
  const m = (measure || "").trim();
  const match = m.match(/^(\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return { qty: 1, unit: m || "to taste" };
  let qty = match[1];
  if (qty.includes("/")) {
    const [n, d] = qty.split("/").map(Number);
    qty = d ? n / d : 1;
  } else {
    qty = parseFloat(qty);
  }
  return { qty: Math.round(qty * 100) / 100, unit: match[2].trim() || "pc" };
}

function parseIngredients(raw, categorizeIngredient) {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const name = (raw[`strIngredient${i}`] || "").trim();
    if (!name) continue;
    const { qty, unit } = parseMeasure(raw[`strMeasure${i}`]);
    out.push({ name, qty, unit, category: categorizeIngredient(name) });
  }
  return out;
}

function parseSteps(instructions) {
  const byLine = (instructions || "")
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  return (instructions || "")
    .split(/(?<=[.!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toRecipe(raw, meal, categorizeIngredient, minutesEstimate) {
  return {
    id: `mealdb-${raw.idMeal}`,
    title: raw.strMeal,
    meal,
    season: ["all"],
    minutes: minutesEstimate, // TheMealDB doesn't provide cook time — see sourceNote
    tags: [raw.strArea, raw.strCategory].filter(Boolean).map((t) => t.toLowerCase()),
    image: raw.strMealThumb, // the real photo for this exact dish
    nutrition: ESTIMATED_NUTRITION[meal],
    ingredients: parseIngredients(raw, categorizeIngredient),
    steps: parseSteps(raw.strInstructions),
    sourceNote: `From TheMealDB${raw.strArea ? ` · ${raw.strArea} cuisine` : ""}. Nutrition and cook time are rough estimates — TheMealDB doesn't provide them.`,
  };
}

/**
 * Fetch one recipe for a meal slot, honoring diet constraints and avoiding
 * ids already used elsewhere in the plan. Tries a few random candidates
 * (from the appropriate category) before giving up.
 * `categorizeIngredient` and `matchesDiet` are injected from data.js to
 * avoid a circular import.
 */
export async function suggestMealDbRecipe({ meal, diet, excludeIds, categorizeIngredient, matchesDiet, minutesEstimate = 30 }) {
  const category = pickCategory(meal, diet);
  const { meals } = await getJson(`${BASE}/filter.php?c=${encodeURIComponent(category)}`);
  if (!meals || meals.length === 0) throw new Error(`No TheMealDB recipes in category ${category}`);

  const candidates = meals
    .filter((m) => !excludeIds.has(`mealdb-${m.idMeal}`))
    .sort(() => Math.random() - 0.5)
    .slice(0, 6);

  for (const candidate of candidates) {
    try {
      const { meals: detail } = await getJson(`${BASE}/lookup.php?i=${candidate.idMeal}`);
      const raw = detail?.[0];
      if (!raw) continue;
      const recipe = toRecipe(raw, meal, categorizeIngredient, minutesEstimate);
      if (matchesDiet(recipe, diet)) return recipe;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(`Couldn't find a ${meal} recipe on TheMealDB matching your dietary settings`);
}

/** A full plan's worth of recipes, one slot at a time (no bulk endpoint exists). */
export async function generatePlanFromMealDb({ days, diet, cookTime, categorizeIngredient, matchesDiet }) {
  const MEAL_ORDER = ["breakfast", "lunch", "dinner"];
  const usedIds = new Set();
  const planDays = [];

  for (let d = 0; d < days; d++) {
    const day = {};
    for (const meal of MEAL_ORDER) {
      const recipe = await suggestMealDbRecipe({
        meal,
        diet,
        excludeIds: usedIds,
        categorizeIngredient,
        matchesDiet,
        minutesEstimate: cookTime?.[meal] ?? 30,
      });
      usedIds.add(recipe.id);
      day[meal] = recipe;
    }
    planDays.push(day);
  }
  return planDays;
}
