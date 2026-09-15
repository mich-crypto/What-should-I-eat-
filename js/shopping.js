import { recipeById } from "./data.js";

const CATEGORY_ORDER = [
  "Produce",
  "Meat",
  "Fish",
  "Dairy",
  "Bakery",
  "Grains",
  "Pantry",
];

// A few very common unit spellings, mapped to one canonical form. Ingredient
// names and units coming from free-text sources (TheMealDB, Gemini) vary in
// casing/pluralization/wording — "Onion" vs "onions", "grams" vs "g" — which
// would otherwise dedupe as *separate* rows instead of merging, making a
// swapped-out recipe's old ingredient look like it never left (a near-
// duplicate of the new one just appears next to it instead of replacing it).
const UNIT_SYNONYMS = {
  gram: "g", grams: "g", gr: "g",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", mls: "ml",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsps: "tbsp",
  teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp",
  piece: "pc", pieces: "pc", pcs: "pc",
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
};

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace(/s$/, "");
}
function normalizeUnit(unit) {
  const u = unit.trim().toLowerCase();
  return UNIT_SYNONYMS[u] || u;
}

/**
 * Combine every ingredient across the plan into one shopping list, scaled by
 * household size. Items sharing a name+unit (after normalizing casing,
 * whitespace, plurals and common unit synonyms) are summed; items that
 * appear in more than one recipe are flagged so the "efficiency" benefit is
 * visible.
 */
export function buildShoppingList(plan, persons) {
  const map = new Map(); // key: normalized name|unit -> { name, unit, qty, category, recipes:Set, checked }

  plan.days.forEach((day) => {
    ["breakfast", "lunch", "dinner"].forEach((meal) => {
      const slot = day[meal];
      if (!slot) return;
      const recipe = recipeById(slot.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach((ing) => {
        const key = `${normalizeName(ing.name)}|${normalizeUnit(ing.unit)}`;
        const scaledQty = ing.qty * persons;
        if (!map.has(key)) {
          // First occurrence sets the display name/unit — later matches
          // (any casing/wording variant) just add their quantity to it.
          map.set(key, {
            name: ing.name,
            unit: ing.unit,
            category: ing.category,
            qty: 0,
            recipes: new Set(),
            checked: false,
          });
        }
        const entry = map.get(key);
        entry.qty += scaledQty;
        entry.recipes.add(recipe.title);
      });
    });
  });

  const items = Array.from(map.values()).map((item) => ({
    ...item,
    qty: Math.round(item.qty * 10) / 10,
    recipeCount: item.recipes.size,
    recipes: Array.from(item.recipes),
  }));

  items.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  const grouped = {};
  items.forEach((item) => {
    grouped[item.category] = grouped[item.category] || [];
    grouped[item.category].push(item);
  });

  const reusedCount = items.filter((i) => i.recipeCount > 1).length;

  return { items, grouped, reusedCount, totalItems: items.length };
}
