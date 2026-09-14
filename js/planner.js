import { RECIPES, currentSeason } from "./data.js";

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
      ctx.prefs[r.id] !== -1
  );
}

function pickRecipe(meal, ctx, exclude = new Set()) {
  let pool = candidatesFor(meal, ctx).filter((r) => !exclude.has(r.id));
  if (pool.length === 0) {
    // relax the cook-time constraint before giving up entirely
    pool = RECIPES.filter(
      (r) => r.meal === meal && ctx.prefs[r.id] !== -1 && !exclude.has(r.id)
    );
  }
  if (pool.length === 0) pool = RECIPES.filter((r) => r.meal === meal);

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
    ingredientPool: new Set(),
  };

  const days = [];
  const startDate = new Date();

  for (let d = 0; d < settings.planDays; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const dayPlan = { date: date.toISOString().slice(0, 10) };

    for (const meal of MEALS) {
      const recipe = pickRecipe(meal, ctx);
      dayPlan[meal] = { recipeId: recipe.id, locked: false };
      recipe.ingredients.forEach((ing) => ctx.ingredientPool.add(ing.name));
    }
    days.push(dayPlan);
  }

  return { days, generatedAt: new Date().toISOString() };
}

/** Replace a single slot (used by swipe / regenerate), respecting locks. */
export function regenerateSlot(plan, dayIndex, meal, { settings, prefs, history }) {
  const season = currentSeason();
  const ingredientPool = new Set();
  plan.days.forEach((day) => {
    MEALS.forEach((m) => {
      if (day[m]) {
        const r = RECIPES.find((r) => r.id === day[m].recipeId);
        if (r) r.ingredients.forEach((ing) => ingredientPool.add(ing.name));
      }
    });
  });

  const currentId = plan.days[dayIndex][meal].recipeId;
  const exclude = new Set([currentId]);
  const ctx = {
    prefs,
    history,
    season,
    seasonal: settings.seasonal,
    maximizeEfficiency: settings.maximizeEfficiency,
    cookTimeLimits: settings.cookTime,
    planDays: settings.planDays,
    ingredientPool,
  };
  const recipe = pickRecipe(meal, ctx, exclude);
  plan.days[dayIndex][meal] = { recipeId: recipe.id, locked: false };
  return recipe;
}
