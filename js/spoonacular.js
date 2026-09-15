// Spoonacular integration — the app's primary recipe source.
//
// Why this one, and why it's shaped as a *bulk* fetch:
// complexSearch returns up to 100 fully-populated recipes (real photo,
// ingredient list, cook time, nutrition, diet flags) in a SINGLE request.
// That's what makes the "prefetch pool" model work — a couple of calls
// fills a local pool that lasts for months, and every swipe/swap after
// that reads from the pool instantly instead of waiting on the network.
// TheMealDB needs one request per recipe, and Gemini needs a slow
// generation per plan, which is why neither can feel instant.
//
// It also carries the two things the other sources can't:
//   - an ingredient count we can filter on, so "simple recipes with few
//     ingredients" is an actual filter rather than a hope
//   - explicit glutenFree/vegan/vegetarian/dairyFree booleans from the
//     source itself, which we still re-verify locally (sources can be
//     wrong, and for an allergy that matters)

const BASE = "https://api.spoonacular.com/recipes/complexSearch";

// Spoonacular's "type" values per meal slot. Lunch rotates through a few
// so a pool isn't 100 near-identical main courses.
const MEAL_TYPES = {
  breakfast: ["breakfast"],
  lunch: ["main course", "salad", "soup", "sandwich"],
  dinner: ["main course"],
};

// Spoonacular aisle -> this app's ingredient category enum.
const AISLE_MAP = [
  [/produce/i, "Produce"],
  [/seafood/i, "Fish"],
  [/meat|poultry/i, "Meat"],
  [/cheese|milk|egg|dairy|yogurt/i, "Dairy"],
  [/bakery|bread/i, "Bakery"],
  [/pasta|rice|cereal|grain/i, "Grains"],
];

function categoryForAisle(aisle, name, categorizeIngredient) {
  const found = AISLE_MAP.find(([re]) => re.test(aisle || ""));
  if (found) return found[1];
  return categorizeIngredient(name); // fall back to our own keyword heuristic
}

function absoluteImage(image, id) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `https://img.spoonacular.com/recipes/${image.includes("-") ? image : `${id}-556x370.jpg`}`;
}

function nutrientAmount(nutrition, wanted, fallback) {
  const list = nutrition?.nutrients || [];
  const hit = list.find((n) => (n.name || "").toLowerCase() === wanted);
  return hit ? Math.round(hit.amount) : fallback;
}

function toRecipe(raw, meal, categorizeIngredient) {
  // Prefer metric measures — this app is metric throughout.
  const ingredients = (raw.extendedIngredients || []).map((ing) => {
    const metric = ing.measures?.metric;
    return {
      name: ing.name || ing.originalName || "ingredient",
      qty: Math.round((metric?.amount ?? ing.amount ?? 1) * 10) / 10,
      unit: metric?.unitShort || ing.unit || "",
      category: categoryForAisle(ing.aisle, ing.name || "", categorizeIngredient),
    };
  });

  const steps = (raw.analyzedInstructions || [])
    .flatMap((block) => block.steps || [])
    .map((s) => s.step)
    .filter(Boolean);

  const servings = raw.servings || 1;
  const perServing = (total, fallback) => (total ? Math.round(total / servings) : fallback);

  return {
    id: `spoon-${raw.id}`,
    title: raw.title,
    meal,
    season: ["all"],
    minutes: raw.readyInMinutes || 30,
    tags: (raw.dishTypes || []).slice(0, 3),
    // A real photo of this exact dish. complexSearch returns a full URL,
    // but some Spoonacular endpoints return a bare filename — if that ever
    // leaks through, an <img src="pasta-123.jpg"> would resolve against our
    // own origin and 404, so normalise it to an absolute URL here.
    image: absoluteImage(raw.image, raw.id),
    // complexSearch returns nutrition totals for the whole recipe; the rest
    // of the app works per serving.
    nutrition: {
      kcal: perServing(nutrientAmount(raw.nutrition, "calories", null), 450),
      protein: perServing(nutrientAmount(raw.nutrition, "protein", null), 20),
      carbs: perServing(nutrientAmount(raw.nutrition, "carbohydrates", null), 45),
      fat: perServing(nutrientAmount(raw.nutrition, "fat", null), 18),
    },
    ingredients,
    steps,
    // The source's own diet flags. matchesDiet() still re-checks the actual
    // ingredients locally — this is a hint, not the safety net.
    sourceDiet: {
      vegetarian: !!raw.vegetarian,
      vegan: !!raw.vegan,
      glutenFree: !!raw.glutenFree,
      dairyFree: !!raw.dairyFree,
    },
    sourceNote: `From Spoonacular${raw.sourceUrl ? ` · ${new URL(raw.sourceUrl).hostname}` : ""}.`,
  };
}

/**
 * Fetch a batch of recipes for one meal slot. One request, up to `number`
 * recipes — this is the call that fills the pool.
 *
 * Returns recipes already in the app's internal shape, filtered to those
 * that actually have ingredients, steps, and few enough ingredients to
 * count as "simple".
 */
export async function fetchRecipeBatch({
  apiKey,
  meal,
  diet,
  maxReadyTime,
  maxIngredients,
  number = 100,
  categorizeIngredient,
}) {
  if (!apiKey) throw new Error("No Spoonacular API key set");

  const types = MEAL_TYPES[meal] || MEAL_TYPES.dinner;
  const params = new URLSearchParams({
    apiKey,
    number: String(number),
    type: types[Math.floor(Math.random() * types.length)],
    // Random-ish window into the result set so repeat fetches don't return
    // the same first 100 recipes every time.
    offset: String(Math.floor(Math.random() * 400)),
    addRecipeInformation: "true",
    addRecipeInstructions: "true",
    addRecipeNutrition: "true",
    fillIngredients: "true",
    instructionsRequired: "true",
    limitLicense: "true", // prefer openly-licensed recipes, since we cache them
    sort: "random",
  });
  if (maxReadyTime) params.set("maxReadyTime", String(maxReadyTime));
  if (diet?.vegan) params.set("diet", "vegan");
  else if (diet?.vegetarian) params.set("diet", "vegetarian");
  if (diet?.glutenFree) params.set("intolerances", "gluten");

  const res = await fetch(`${BASE}?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("Spoonacular daily quota reached");
    throw new Error(`Spoonacular request failed (${res.status}): ${body.slice(0, 160)}`);
  }

  const data = await res.json();
  const results = data?.results || [];

  return results
    .map((raw) => toRecipe(raw, meal, categorizeIngredient))
    .filter(
      (r) =>
        r.ingredients.length > 0 &&
        r.steps.length > 0 &&
        (!maxIngredients || r.ingredients.length <= maxIngredients)
    );
}
