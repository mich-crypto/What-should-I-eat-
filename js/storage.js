// Tiny localStorage wrapper. Everything the app remembers lives on-device only.
const NS = "wsie:"; // "What Should I Eat"

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    /* storage full or unavailable — fail silently, app still works in-memory */
  }
}

export const DEFAULT_SETTINGS = {
  name: "",
  sex: "female", // 'female' | 'male'
  age: 30,
  heightCm: 170,
  weightKg: 68,
  activity: 1.375, // sedentary 1.2, light 1.375, moderate 1.55, active 1.725, athlete 1.9
  goal: "maintain", // 'maintain' | 'lose' | 'gain'
  persons: 2,
  planDays: 7, // 7 or 14
  seasonal: true,
  maximizeEfficiency: true,
  cookTime: { breakfast: 15, lunch: 30, dinner: 45 },
  diet: { vegetarian: false, vegan: false, glutenFree: false },
  // Where recipes come from: 'builtin' (offline sample catalog),
  // 'mealdb' (TheMealDB — free, no key, real per-recipe photos),
  // or 'gemini' (Google AI with Search grounding, needs an API key).
  recipeSource: "mealdb",
  geminiKey: "",
};

export const Store = {
  getSettings() {
    const stored = read("settings", {});
    const merged = { ...DEFAULT_SETTINGS, ...stored };
    // Migrate the old on/off Gemini toggle (pre-1.4.0) to the new 3-way
    // recipeSource setting, so anyone who already turned it on keeps it.
    if (stored.useAI === true && stored.recipeSource === undefined) {
      merged.recipeSource = "gemini";
    }
    return merged;
  },
  setSettings(s) {
    write("settings", s);
  },
  getPlan() {
    return read("plan", null); // { days: [{date, breakfast:{recipeId, locked}, lunch:{...}, dinner:{...}}], generatedAt }
  },
  setPlan(plan) {
    write("plan", plan);
  },
  getPrefs() {
    // recipeId -> 1 (liked) | -1 (disliked)
    return read("prefs", {});
  },
  setPrefs(prefs) {
    write("prefs", prefs);
  },
  getHistory() {
    // recipeId -> last used ISO date, used to avoid repeats too soon
    return read("history", {});
  },
  setHistory(h) {
    write("history", h);
  },
};
