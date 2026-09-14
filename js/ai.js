// Google Gemini integration — recipes sourced from the live web.
//
// When the user pastes a Gemini API key into Settings and turns "AI
// suggestions" on, this app asks Gemini 2.5 Flash *with Google Search
// grounding* enabled, so the model looks up real recipes on the web rather
// than inventing them from memory. That's the whole point of this file:
// instead of picking from the small hand-written catalog in js/data.js,
// the weekly plan (and any single-slot "surprise me") gets recipes that
// reflect what's actually published online right now.
//
// Every call happens directly from the phone via fetch() — no backend.
// The key is stored in localStorage and only ever sent to Google. That's
// an accepted trade-off for a personal, installable web app with no
// server component; don't reuse a key that has billing-sensitive scopes.

const MODEL = "gemini-2.5-flash";

function endpoint(apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

async function callGemini(apiKey, prompt, maxOutputTokens) {
  const res = await fetch(endpoint(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }], // ground the answer in real web results
      generationConfig: { temperature: 0.8, maxOutputTokens },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no text");

  // The model sometimes wraps JSON in ```json fences, or adds a stray
  // sentence before/after — pull out the outermost {...} or [...] block.
  const match = text.match(/[[{][\s\S]*[\]}]/);
  if (!match) throw new Error("Could not find JSON in Gemini's response");
  return JSON.parse(match[0]);
}

const RECIPE_SCHEMA = `{"title":"...","minutes":number,"ingredients":[{"name":"...","qty":number,"unit":"g|ml|pc|tsp|tbsp|clove|slice|pinch","category":"Produce|Meat|Fish|Dairy|Bakery|Grains|Pantry"}],"nutrition":{"kcal":number,"protein":number,"carbs":number,"fat":number},"steps":["..."],"sourceNote":"short mention of where this style of recipe is popular online"}`;

function toRecipe(parsed, meal) {
  return {
    id: `ai-${meal}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: parsed.title,
    meal,
    season: ["all"],
    minutes: parsed.minutes,
    tags: ["ai-suggested"],
    image: null, // no stock photo for a freshly-found dish; UI shows a placeholder
    nutrition: parsed.nutrition,
    ingredients: parsed.ingredients,
    steps: parsed.steps || [],
    sourceNote: parsed.sourceNote || "",
  };
}

/** Single recipe idea for one slot (used by Discover's "spark" button). */
export async function suggestRecipeWithAI({ apiKey, meal, minutesLimit, seasonal, season, dislikedTitles }) {
  if (!apiKey) throw new Error("No Gemini API key set");

  const prompt = `Search the web for a real, popular home-cooked ${meal} recipe that takes ${minutesLimit} minutes or less to cook.
${seasonal ? `Prefer one built around ingredients that are in season during ${season} in a temperate climate.` : ""}
Avoid recipes similar to: ${dislikedTitles.join(", ") || "none"}.
Base it on an actual recipe you find, not a made-up one. Respond with ONLY minified JSON, no markdown fences, matching exactly this shape:
${RECIPE_SCHEMA}`;

  const parsed = await callGemini(apiKey, prompt, 900);
  return toRecipe(parsed, meal);
}

/**
 * A full plan's worth of recipes in one call — far fewer API round-trips
 * than asking meal-by-meal. Returns { days: [{ breakfast, lunch, dinner }] }
 * with each slot already in the app's recipe shape.
 */
export async function generatePlanWithAI({
  apiKey,
  days,
  persons,
  seasonal,
  season,
  cookTime,
  likedTitles,
  dislikedTitles,
}) {
  if (!apiKey) throw new Error("No Gemini API key set");

  const prompt = `Search the web and put together a ${days}-day meal plan (breakfast, lunch and dinner for each day) for ${persons} ${persons === 1 ? "person" : "people"}, using real recipes you find online — not invented ones.
Constraints:
- Breakfast: ${cookTime.breakfast} minutes or less to cook.
- Lunch: ${cookTime.lunch} minutes or less to cook.
- Dinner: ${cookTime.dinner} minutes or less to cook.
${seasonal ? `- Favor recipes built around ingredients in season during ${season} in a temperate climate.` : ""}
- The person likes: ${likedTitles.join(", ") || "no strong preferences yet"} — lean toward similar dishes/cuisines where sensible.
- Avoid anything like: ${dislikedTitles.join(", ") || "none"}.
- Vary the recipes across the plan (don't repeat the same dish on multiple days) and prefer some ingredient overlap between recipes in the same week, to keep the shopping list efficient.
Respond with ONLY minified JSON, no markdown fences, no commentary, in exactly this shape (an array of ${days} day objects):
{"days":[{"breakfast":${RECIPE_SCHEMA},"lunch":${RECIPE_SCHEMA},"dinner":${RECIPE_SCHEMA}}]}`;

  const parsed = await callGemini(apiKey, prompt, 8000);
  if (!Array.isArray(parsed?.days) || parsed.days.length === 0) {
    throw new Error("Gemini's plan response was missing days");
  }

  return parsed.days.map((day) => ({
    breakfast: toRecipe(day.breakfast, "breakfast"),
    lunch: toRecipe(day.lunch, "lunch"),
    dinner: toRecipe(day.dinner, "dinner"),
  }));
}
