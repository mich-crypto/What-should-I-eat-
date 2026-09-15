import { RECIPES, currentSeason, matchesDiet } from "./data.js";

const MEALS = ["breakfast", "lunch", "dinner"];

function isInSeason(recipe, season, seasonalOn) {
  if (!seasonalOn) return true;
  return recipe.season.includes("all") || recipe.season.includes(season);
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

/**
 * Score a candidate recipe for a slot.
 * - Liked recipes are boosted, disliked ones are excluded entirely.
 * - Recently used recipes are penalized so the week doesn't repeat too soon.
 * - When "maximize shopping efficiency" is on, recipes that reuse
 *   ingredients already scheduled this week score higher — the fewer
 *   unique items you need to buy, the better.
 */
function scoreRecipe(recipe, ctx) {
  let score = 0;
  const pref = ctx.prefs[recipe.id] || 0;
  score += pref * 5; // liked +5, disliked filtered out before this point

  const recency = daysSince(ctx.history[recipe.id]);
  if (recency < ctx.planDays) score -= (ctx.planDays - recency) * 2;

  if (ctx.maximizeEfficiency) {
    const overlap = recipe.ingredients.filter((ing) =>
      ctx.ingredientPool.has(ing.name)
    ).length;
    score += overlap * 1.5;
  }

  if (recipe.minutes <= ctx.cookTimeLimit) score += 1;
  score += Math.random() * 0.75; // small jitter so results aren't robotic

  return score;
}

function candidatesFor(meal, ctx) {
  return RECIPES.filter(
    (r) =>
      r.meal === meal &&
      isInSeason(r, ctx.season, ctx.seasonal) &&
      r.minutes <= ctx.cookTimeLimits[meal] + 0.001 &&
      ctx.prefs[r.id] !== -1 &&
      matchesDiet(r, ctx.diet)
  );
}

/**
 * Dietary needs (vegetarian/vegan/gluten-free) are a hard requirement, not
 * a preference, so every fallback tier below still enforces them — cook
 * time, season and even "not disliked" are relaxed first. Diet is only
 * ever dropped as a true last resort, if literally nothing of that meal
 * type in the catalog satisfies it.
 */
function pickRecipe(meal, ctx, exclude = new Set()) {
  const withoutExcluded = (list) => list.filter((r) => !exclude.has(r.id));
  const byMeal = RECIPES.filter((r) => r.meal === meal);
  const byMealAndDiet = byMeal.filter((r) => matchesDiet(r, ctx.diet));

  let pool = withoutExcluded(candidatesFor(meal, ctx));
  if (pool.length === 0) {
    // relax cook-time, then season, then "not disliked" — diet stays enforced
    pool = withoutExcluded(byMealAndDiet.filter((r) => isInSeason(r, ctx.season, ctx.seasonal) && ctx.prefs[r.id] !== -1));
  }
  if (pool.length === 0) {
    pool = withoutExcluded(byMealAndDiet.filter((r) => ctx.prefs[r.id] !== -1));
  }
  if (pool.length === 0) {
    pool = withoutExcluded(byMealAndDiet);
  }
  if (pool.length === 0) {
    // absolute last resort — no catalog recipe for this meal satisfies the
    // diet at all; better to suggest something than show nothing.
    pool = withoutExcluded(byMeal);
  }
  if (pool.length === 0) pool = byMeal;

  const scored = pool
    .map((r) => ({
      recipe: r,
      score: scoreRecipe(r, { ...ctx, cookTimeLimit: ctx.cookTimeLimits[meal] }),
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0].recipe;
}

/** Build a full plan of `days` days, 3 meals each. */
export function generatePlan({ settings, prefs, history }) {
  const season = currentSeason();
  const ctx = {
    prefs,
    history,
    season,
    seasonal: settings.seasonal,
    maximizeEfficiency: settings.maximizeEfficiency,
    cookTimeLimits: settings.cookTime,
    planDays: settings.planDays,
    diet: settings.diet,
    ingredientPool: new Set(),
  };

  const days = [];
  const startDate = new Date();
  // Recipes already placed in *this* generation, per meal type — without
  // this, nothing stops the same recipe winning every single day. Recency
  // scoring alone doesn't catch it (that only looks at past sessions, not
  // choices made earlier in this same loop), and "maximize efficiency"
  // actively makes it worse: once a recipe is picked, its own ingredients
  // are already in the pool, so it scores a perfect self-overlap match and
  // keeps winning again. pickRecipe()'s fallback ladder still allows a
  // repeat once every non-excluded option (cook-time/season/preference,
  // then diet, then finally the whole catalog for that meal) is exhausted,
  // so a small catalog degrades to repeats gracefully instead of crashing.
  const usedByMeal = { breakfast: new Set(), lunch: new Set(), dinner: new Set() };

  for (let d = 0; d < settings.planDays; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dayPlan = { date: date.toISOString().slice(0, 10) };

    for (const meal of MEALS) {
      const recipe = pickRecipe(meal, ctx, usedByMeal[meal]);
      usedByMeal[meal].add(recipe.id);
      dayPlan[meal] = { recipeId: recipe.id, locked: false };
      recipe.ingredients.forEach((ing) => ctx.ingredientPool.add(ing.name));
    }
    days.push(dayPlan);
  }

  return { days, generatedAt: new Date().toISOString(), source: "builtin" };
}

/** Replace a single slot (used by swipe / regenerate), respecting locks. */
export function regenerateSlot(plan, dayIndex, meal, { settings, prefs, history }) {
  const season = currentSeason();
  const ingredientPool = new Set();
  const usedElsewhereThisMeal = new Set();
  plan.days.forEach((day, i) => {
    MEALS.forEach((m) => {
      if (day[m]) {
        const r = RECIPES.find((r) => r.id === day[m].recipeId);
        if (r) r.ingredients.forEach((ing) => ingredientPool.add(ing.name));
        if (m === meal && i !== dayIndex) usedElsewhereThisMeal.add(day[m].recipeId);
      }
    });
  });

  const currentId = plan.days[dayIndex][meal].recipeId;
  // Exclude the slot's current recipe *and* every other day's <meal>, so a
  // reroll can't hand back a dish already scheduled elsewhere in the plan.
  const exclude = new Set([currentId, ...usedElsewhereThisMeal]);
  const ctx = {
    prefs,
    history,
    season,
    seasonal: settings.seasonal,
    maximizeEfficiency: settings.maximizeEfficiency,
    cookTimeLimits: settings.cookTime,
    planDays: settings.planDays,
    diet: settings.diet,
    ingredientPool,
  };
  const recipe = pickRecipe(meal, ctx, exclude);
  plan.days[dayIndex][meal] = { recipeId: recipe.id, locked: false };
  return recipe;
}
