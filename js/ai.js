// Optional Google Gemini integration.
//
// If the user pastes a Gemini API key into Settings and turns "AI
// suggestions" on, the swipe screen's "Surprise me" action calls the Gemini
// API directly from the phone (no backend needed) to invent a fresh recipe
// idea matching the current slot's constraints. The key never leaves the
// device except in that direct call to Google.
//
// Note: a key embedded in client-side code/localStorage is visible to
// anyone with access to the device/browser devtools. That's an accepted
// trade-off for a personal, installable web app with no server component —
// don't reuse a key that has billing-sensitive scopes attached.

const MODEL = "gemini-2.5-flash";

export async function suggestRecipeWithAI({ apiKey, meal, minutesLimit, seasonal, season, dislikedTitles }) {
  if (!apiKey) throw new Error("No Gemini API key set");

  const prompt = `Suggest one home-cooked ${meal} recipe that takes ${minutesLimit} minutes or less to cook.
${seasonal ? `Use ingredients that are in season during ${season} in a temperate climate.` : ""}
Avoid recipes similar to: ${dislikedTitles.join(", ") || "none"}.
Respond with ONLY minified JSON, no markdown fences, in this exact shape:
{"title":"...","minutes":number,"ingredients":[{"name":"...","qty":number,"unit":"g|ml|pc|tsp|tbsp|clove|slice|pinch","category":"Produce|Meat|Fish|Dairy|Bakery|Grains|Pantry"}],"nutrition":{"kcal":number,"protein":number,"carbs":number,"fat":number}}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 500 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status})`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = text.trim().replace(/^```json\s*|```$/g, "");
  const parsed = JSON.parse(cleaned);

  return {
    id: `ai-${Date.now()}`,
    title: parsed.title,
    meal,
    season: ["all"],
    minutes: parsed.minutes,
    tags: ["ai-suggested"],
    image: null, // no stock photo for an AI-invented dish; UI shows a placeholder
    nutrition: parsed.nutrition,
    ingredients: parsed.ingredients,
  };
}
