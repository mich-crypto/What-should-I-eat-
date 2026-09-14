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

/**
 * Combine every ingredient across the plan into one shopping list, scaled by
 * household size. Items sharing a name+unit are summed; items that appear in
 * more than one recipe are flagged so the "efficiency" benefit is visible.
 */
export function buildShoppingList(plan, persons) {
  const map = new Map(); // key: name|unit -> { name, unit, qty, category, recipes:Set, checked }

  plan.days.forEach((day) => {
    ["breakfast", "lunch", "dinner"].forEach((meal) => {
      const slot = day[meal];
      if (!slot) return;
      const recipe = recipeById(slot.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach((ing) => {
        const key = `${ing.name}|${ing.unit}`;
        const scaledQty = ing.qty * persons;
        if (!map.has(key)) {
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
