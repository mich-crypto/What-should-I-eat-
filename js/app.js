import { Store, DEFAULT_SETTINGS } from "./storage.js";
import { RECIPES, recipeById, currentSeason, matchesDiet, displayTags, categorizeIngredient } from "./data.js";
import { computeTargets, sumNutrition, pct } from "./nutrition.js";
import { generatePlan, regenerateSlot } from "./planner.js";
import { buildShoppingList } from "./shopping.js";
import { suggestRecipeWithAI, generatePlanWithAI } from "./ai.js";
import { suggestMealDbRecipe, generatePlanFromMealDb } from "./mealdb.js";
import { VERSION, BUILD_DATE } from "./version.js";

const view = document.getElementById("view");
const topbarTitle = document.getElementById("topbar-title");
const topbarVersion = document.getElementById("topbar-version");
const toastEl = document.getElementById("toast");

// Shown on every tab (not just Settings) so it's a quick, no-navigation way
// to confirm which build a device is actually running — handy when
// troubleshooting a stale cache.
topbarVersion.textContent = `v${VERSION}`;
const loadingOverlay = document.getElementById("loading-overlay");
const loadingTextEl = document.getElementById("loading-text");

function showLoading(text) {
  loadingTextEl.textContent = text;
  loadingOverlay.hidden = false;
}
function hideLoading() {
  loadingOverlay.hidden = true;
}

let state = {
  tab: "plan",
  settings: Store.getSettings(),
  prefs: Store.getPrefs(),
  history: Store.getHistory(),
  plan: Store.getPlan(),
  discoverMeal: "dinner",
  discoverIndex: 0,
  shoppingChecked: {},
};

// Recipes already fetched from Gemini/TheMealDB in a previous session,
// restored so a saved plan referencing one still resolves, and so
// regenerating a plan can reuse them instantly instead of re-fetching.
registerSessionRecipes(Store.getWebRecipeCache());

/**
 * A saved plan can reference a recipe that no longer resolves — most
 * commonly an AI-sourced recipe, whose id only ever lived in the in-memory
 * RECIPES array for that one session and was never actually persisted.
 * Rendering such a plan would otherwise throw partway through and leave
 * the Plan tab blank, so validate on load and silently regenerate if
 * anything doesn't check out.
 */
function planIsValid(plan) {
  if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) return false;
  return plan.days.every((day) => MEAL_ORDER_FOR_VALIDATION.every((m) => day[m] && recipeById(day[m].recipeId)));
}
const MEAL_ORDER_FOR_VALIDATION = ["breakfast", "lunch", "dinner"];

if (!planIsValid(state.plan)) {
  state.plan = generatePlan(state);
  Store.setPlan(state.plan);
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (toastEl.hidden = true), 1800);
}

function markUsed(recipeId) {
  state.history[recipeId] = new Date().toISOString();
  Store.setHistory(state.history);
}

function setPref(recipeId, value) {
  state.prefs[recipeId] = value;
  Store.setPrefs(state.prefs);
}

// ---------------------------------------------------------------- Recipe detail modal

const modalBackdrop = document.getElementById("recipe-modal");
const modalSheet = document.getElementById("modal-sheet");

function closeRecipeModal() {
  modalBackdrop.hidden = true;
  modalSheet.innerHTML = "";
}

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeRecipeModal();
});

function openRecipeModal(recipe) {
  const liked = state.prefs[recipe.id] === 1;
  const photo = recipe.image ? `background-image:url('${recipe.image}')` : "";

  modalSheet.innerHTML = `
    <div class="modal-photo" style="${photo}">
      <button class="modal-close" id="modal-close-btn" aria-label="Close">
        <svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>
      </button>
    </div>
    <div class="modal-body">
      <div class="modal-title">${recipe.title}</div>
      <div class="modal-meta">${minutesLabel(recipe)} · ${recipe.nutrition.kcal} kcal · ${recipe.nutrition.protein}g protein · ${recipe.nutrition.carbs}g carbs · ${recipe.nutrition.fat}g fat</div>
      ${displayTags(recipe).length ? `<div class="modal-tags">${displayTags(recipe).map((t) => `<span>${t}</span>`).join("")}</div>` : ""}

      <div class="modal-section-title">Ingredients (1 serving)</div>
      <ul class="modal-ing-list">
        ${recipe.ingredients.map((i) => `<li><span>${i.name}</span><span class="q">${i.qty} ${i.unit}</span></li>`).join("")}
      </ul>

      ${
        recipe.steps && recipe.steps.length
          ? `<div class="modal-section-title">Steps</div>
             <ol class="modal-step-list">
               ${recipe.steps.map((s, i) => `<li><span class="n">${i + 1}</span><span>${s}</span></li>`).join("")}
             </ol>`
          : ""
      }

      ${recipe.sourceNote ? `<div class="modal-source">🔎 ${recipe.sourceNote}</div>` : ""}
    </div>
    <div class="modal-actions">
      <button id="modal-like-btn" class="${liked ? "liked" : ""}">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2.3 4.8 5.7 4.2c2-.3 3.9.6 5 2.2 1.1-1.6 3-2.5 5-2.2 3.4.6 5.2 4 3.7 7.5C19.5 16.4 12 21 12 21z"/></svg>
        ${liked ? "Liked" : "Like this"}
      </button>
    </div>
  `;
  modalBackdrop.hidden = false;

  document.getElementById("modal-close-btn").addEventListener("click", closeRecipeModal);
  document.getElementById("modal-like-btn").addEventListener("click", (e) => {
    const newVal = state.prefs[recipe.id] === 1 ? 0 : 1;
    setPref(recipe.id, newVal);
    e.currentTarget.classList.toggle("liked", newVal === 1);
    e.currentTarget.lastChild.textContent = newVal === 1 ? "Liked" : "Like this";
    if (state.tab === "plan") renderPlan();
  });
}

function likedAndDislikedTitles() {
  return {
    likedTitles: RECIPES.filter((r) => state.prefs[r.id] === 1).map((r) => r.title),
    dislikedTitles: RECIPES.filter((r) => state.prefs[r.id] === -1).map((r) => r.title),
  };
}

/** True estimated minutes badge for MealDB recipes, which don't carry a real cook time. */
function isEstimate(recipe) {
  return recipe.id.startsWith("mealdb-");
}
function minutesLabel(recipe) {
  return `${isEstimate(recipe) ? "~" : ""}${recipe.minutes} min`;
}

// A `function` declaration, not `const` — this is called from module
// top-level code (to hydrate the cache) before this line would otherwise
// have run, and function declarations (unlike const) are fully hoisted.
function isWebSourced(r) {
  return r.id.startsWith("ai-") || r.id.startsWith("mealdb-");
}

/** Add fetched recipes to the in-memory catalog (skipping ones already there) and persist any web-sourced ones so future plans can reuse them without a network round-trip. */
function registerSessionRecipes(recipes) {
  const known = new Set(RECIPES.map((r) => r.id));
  const fresh = recipes.filter((r) => !known.has(r.id));
  fresh.forEach((r) => RECIPES.push(r));

  const cacheable = fresh.filter(isWebSourced);
  if (cacheable.length === 0) return;
  const cache = Store.getWebRecipeCache();
  const byId = new Map(cache.map((r) => [r.id, r]));
  cacheable.forEach((r) => byId.set(r.id, { ...r, cachedAt: Date.now() }));
  let merged = Array.from(byId.values()).sort((a, b) => (b.cachedAt || 0) - (a.cachedAt || 0));
  const CACHE_CAP = 300;
  if (merged.length > CACHE_CAP) merged = merged.slice(0, CACHE_CAP);
  Store.setWebRecipeCache(merged);
}

/** Cached web-sourced recipes usable right now for a meal slot (matches diet, roughly fits the cook-time limit). */
function cachedCandidates(meal, sourcePrefix) {
  return RECIPES.filter(
    (r) =>
      r.id.startsWith(sourcePrefix) &&
      r.meal === meal &&
      matchesDiet(r, state.settings.diet) &&
      r.minutes <= state.settings.cookTime[meal] + 15 &&
      state.prefs[r.id] !== -1
  );
}

/** True if the cache alone has enough distinct recipes per meal to fill a plan with zero forced repeats. */
function canBuildPlanFromCache(days, sourcePrefix) {
  return MEAL_ORDER.every((meal) => cachedCandidates(meal, sourcePrefix).length >= days);
}

/** Build a full plan from cached recipes only — instant, no network call. */
function buildPlanFromCache(days, sourcePrefix, source) {
  const startDate = new Date();
  const usedByMeal = { breakfast: new Set(), lunch: new Set(), dinner: new Set() };
  const planDays = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const entry = { date: date.toISOString().slice(0, 10) };
    MEAL_ORDER.forEach((meal) => {
      const pool = cachedCandidates(meal, sourcePrefix).filter((r) => !usedByMeal[meal].has(r.id));
      const liked = pool.filter((r) => state.prefs[r.id] === 1);
      const finalPool = liked.length ? liked : pool;
      const pick = finalPool[Math.floor(Math.random() * finalPool.length)];
      usedByMeal[meal].add(pick.id);
      entry[meal] = { recipeId: pick.id, locked: false };
    });
    planDays.push(entry);
  }
  return { days: planDays, generatedAt: new Date().toISOString(), source };
}

const normalizeTitle = (t) => t.trim().toLowerCase();

/**
 * Bulk plan generation is one big JSON response, and LLMs are prone to
 * repeating a pattern across a long generation — the prompt asks Gemini for
 * distinct titles, but that's not a guarantee, so verify it here and fix any
 * repeat with a single-slot re-ask (excluding every title already used for
 * that meal type) instead of trusting the prompt alone. Mutates `aiDays` in
 * place; up to 2 retries per duplicate slot before giving up on that one.
 */
async function deduplicateAiPlan(aiDays, dislikedTitles) {
  const seenByMeal = { breakfast: new Set(), lunch: new Set(), dinner: new Set() };

  for (const day of aiDays) {
    for (const meal of MEAL_ORDER) {
      const seen = seenByMeal[meal];
      let recipe = day[meal];
      let attempts = 0;
      while (seen.has(normalizeTitle(recipe.title)) && attempts < 2) {
        attempts++;
        try {
          recipe = await suggestRecipeWithAI({
            apiKey: state.settings.geminiKey,
            meal,
            minutesLimit: state.settings.cookTime[meal],
            seasonal: state.settings.seasonal,
            season: currentSeason(),
            dislikedTitles: [...dislikedTitles, ...seen],
            diet: state.settings.diet,
          });
        } catch (err) {
          console.error(err);
          break; // keep the duplicate rather than fail the whole plan over one slot
        }
      }
      day[meal] = recipe;
      seen.add(normalizeTitle(recipe.title));
    }
  }
}

/**
 * Build a full plan from whichever "Recipe source" is selected in Settings
 * (built-in catalog / TheMealDB / Gemini). Any failure — no network, no
 * key, rate limit, bad response — falls back to the built-in catalog so
 * the app always keeps working.
 */
async function buildNewPlan() {
  const source = state.settings.recipeSource;

  // If we've already fetched enough distinct recipes from this source to
  // fill the plan with zero forced repeats, reuse them instantly instead of
  // hitting the network — this is the slow part users actually feel,
  // especially Gemini's single big generation call.
  if (source === "mealdb" && canBuildPlanFromCache(state.settings.planDays, "mealdb-")) {
    toast("Using recipes you've already found on TheMealDB");
    return buildPlanFromCache(state.settings.planDays, "mealdb-", "mealdb");
  }
  if (source === "gemini" && state.settings.geminiKey && canBuildPlanFromCache(state.settings.planDays, "ai-")) {
    toast("Using recipes Gemini already found for you");
    return buildPlanFromCache(state.settings.planDays, "ai-", "ai");
  }

  if (source === "mealdb") {
    showLoading("Finding recipes on TheMealDB…");
    try {
      const mealDbDays = await generatePlanFromMealDb({
        days: state.settings.planDays,
        diet: state.settings.diet,
        cookTime: state.settings.cookTime,
        categorizeIngredient,
        matchesDiet,
      });
      const startDate = new Date();
      const days = mealDbDays.map((day, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const entry = { date: date.toISOString().slice(0, 10) };
        registerSessionRecipes(Object.values(day));
        MEAL_ORDER.forEach((meal) => (entry[meal] = { recipeId: day[meal].id, locked: false }));
        return entry;
      });
      return { days, generatedAt: new Date().toISOString(), source: "mealdb" };
    } catch (err) {
      console.error(err);
      toast("TheMealDB unavailable — using built-in recipes instead");
      return generatePlan(state);
    } finally {
      hideLoading();
    }
  }

  if (source === "gemini" && state.settings.geminiKey) {
    showLoading("Asking Gemini to build your plan from the web…");
    try {
      const { likedTitles, dislikedTitles } = likedAndDislikedTitles();
      const aiDays = await generatePlanWithAI({
        apiKey: state.settings.geminiKey,
        days: state.settings.planDays,
        persons: state.settings.persons,
        seasonal: state.settings.seasonal,
        season: currentSeason(),
        cookTime: state.settings.cookTime,
        likedTitles,
        dislikedTitles,
        diet: state.settings.diet,
      });
      await deduplicateAiPlan(aiDays, dislikedTitles);
      const startDate = new Date();
      const days = aiDays.map((day, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const entry = { date: date.toISOString().slice(0, 10) };
        registerSessionRecipes(Object.values(day));
        MEAL_ORDER.forEach((meal) => (entry[meal] = { recipeId: day[meal].id, locked: false }));
        return entry;
      });
      return { days, generatedAt: new Date().toISOString(), source: "ai" };
    } catch (err) {
      console.error(err);
      toast("Gemini unavailable — using built-in recipes instead");
      return generatePlan(state);
    } finally {
      hideLoading();
    }
  }

  return generatePlan(state);
}

/** Swap a single day/meal slot, preferring the selected online source when one is set. */
async function rerollSlot(dayIndex, meal) {
  const source = state.settings.recipeSource;
  const currentIds = new Set(
    state.plan.days.flatMap((d) => MEAL_ORDER.map((m) => d[m]?.recipeId).filter(Boolean))
  );

  const sourcePrefix = source === "mealdb" ? "mealdb-" : source === "gemini" ? "ai-" : null;
  if (sourcePrefix) {
    const cached = cachedCandidates(meal, sourcePrefix).filter((r) => !currentIds.has(r.id));
    if (cached.length > 0) {
      const recipe = cached[Math.floor(Math.random() * cached.length)];
      state.plan.days[dayIndex][meal] = { recipeId: recipe.id, locked: false };
      Store.setPlan(state.plan);
      toast(`Swapped in ${recipe.title}`);
      renderPlan();
      return;
    }
  }

  if (source === "mealdb") {
    showLoading("Asking TheMealDB for another option…");
    try {
      const recipe = await suggestMealDbRecipe({
        meal,
        diet: state.settings.diet,
        excludeIds: currentIds,
        categorizeIngredient,
        matchesDiet,
        minutesEstimate: state.settings.cookTime[meal],
      });
      registerSessionRecipes([recipe]);
      state.plan.days[dayIndex][meal] = { recipeId: recipe.id, locked: false };
      Store.setPlan(state.plan);
      toast(`Swapped in ${recipe.title}`);
      renderPlan();
      return;
    } catch (err) {
      console.error(err);
      toast("TheMealDB unavailable — picking from built-in recipes");
    } finally {
      hideLoading();
    }
  } else if (source === "gemini" && state.settings.geminiKey) {
    showLoading("Asking Gemini for another option…");
    try {
      const { dislikedTitles } = likedAndDislikedTitles();
      // Also steer away from every other <meal> already elsewhere in this
      // plan, so a single reroll can't hand back a dish already scheduled.
      const usedTitlesThisMeal = state.plan.days
        .map((d) => recipeById(d[meal]?.recipeId))
        .filter(Boolean)
        .map((r) => r.title);
      const recipe = await suggestRecipeWithAI({
        apiKey: state.settings.geminiKey,
        meal,
        minutesLimit: state.settings.cookTime[meal],
        seasonal: state.settings.seasonal,
        season: currentSeason(),
        dislikedTitles: [...dislikedTitles, ...usedTitlesThisMeal],
        diet: state.settings.diet,
      });
      registerSessionRecipes([recipe]);
      state.plan.days[dayIndex][meal] = { recipeId: recipe.id, locked: false };
      Store.setPlan(state.plan);
      toast(`Swapped in ${recipe.title}`);
      renderPlan();
      return;
    } catch (err) {
      console.error(err);
      toast("Gemini unavailable — picking from built-in recipes");
    } finally {
      hideLoading();
    }
  }

  const recipe = regenerateSlot(state.plan, dayIndex, meal, state);
  Store.setPlan(state.plan);
  toast(`Swapped in ${recipe.title}`);
  renderPlan();
}

// ---------------------------------------------------------------- Tabs

document.getElementById("tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  state.tab = btn.dataset.tab;
  render();
});

document.getElementById("btn-regenerate").addEventListener("click", async (e) => {
  if (state.tab !== "plan") return;
  const btn = e.currentTarget; // cache it — e.currentTarget is nulled out once the event finishes dispatching, before our `await` resumes
  btn.disabled = true;
  state.plan = await buildNewPlan();
  Store.setPlan(state.plan);
  toast(state.plan.source !== "builtin" ? "New plan sourced from the web" : "New plan generated");
  btn.disabled = false;
  render();
});

function render() {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === state.tab));
  document.getElementById("btn-regenerate").style.visibility = state.tab === "plan" ? "visible" : "hidden";
  const titles = { plan: "This week", discover: "Discover", shopping: "Shopping list", settings: "Settings" };
  topbarTitle.textContent = titles[state.tab];

  if (state.tab === "plan") renderPlan();
  else if (state.tab === "discover") renderDiscover();
  else if (state.tab === "shopping") renderShopping();
  else if (state.tab === "settings") renderSettings();
}

// ---------------------------------------------------------------- Plan tab

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MEAL_ORDER = ["breakfast", "lunch", "dinner"];

function mealRowHtml(day, dayIndex, meal, recipe) {
  const liked = state.prefs[recipe.id] === 1;
  const img = recipe.image
    ? `<img class="meal-thumb" src="${recipe.image}" alt="" onerror="this.style.background='linear-gradient(135deg,var(--accent),var(--accent-2))'; this.removeAttribute('src')">`
    : `<div class="meal-thumb"></div>`;
  return `
    <div class="meal-row" data-day="${dayIndex}" data-meal="${meal}" data-recipe="${recipe.id}">
      ${img}
      <div class="meal-info">
        <div class="meal-label">${meal}</div>
        <div class="meal-title">${recipe.title}</div>
        <div class="meal-meta">${minutesLabel(recipe)} · ${recipe.nutrition.kcal} kcal</div>
      </div>
      <div class="meal-actions">
        <button class="mini-btn like-slot ${liked ? "liked" : ""}" title="Like">
          <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2.3 4.8 5.7 4.2c2-.3 3.9.6 5 2.2 1.1-1.6 3-2.5 5-2.2 3.4.6 5.2 4 3.7 7.5C19.5 16.4 12 21 12 21z"/></svg>
        </button>
        <button class="mini-btn reroll-slot" title="Try another">
          <svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.74 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        </button>
      </div>
    </div>`;
}

function nutritionRowHtml(label, value, target, unit) {
  return `
    <div class="nutri-row">
      <div class="label">${label}</div>
      <div class="nutri-track"><div class="nutri-fill" style="width:${pct(value, target)}%"></div></div>
      <div class="val">${Math.round(value)}${unit} / ${Math.round(target)}${unit}</div>
    </div>`;
}

function renderPlan() {
  const targets = computeTargets(state.settings);
  const today = new Date();

  let repaired = false;
  const html = state.plan.days
    .map((day, i) => {
      const date = new Date(day.date);
      const isToday = date.toDateString() === today.toDateString();
      // A slot's recipe can vanish (e.g. an AI-sourced id from a session
      // that's since ended) — repair it on the fly instead of crashing
      // the whole tab on a missing .title/.nutrition lookup below.
      MEAL_ORDER.forEach((m) => {
        if (!recipeById(day[m]?.recipeId)) {
          regenerateSlot(state.plan, i, m, state);
          repaired = true;
        }
      });
      const recipes = MEAL_ORDER.map((m) => recipeById(day[m].recipeId));
      const totals = sumNutrition(recipes);

      return `
        <div class="card day-card">
          <div class="day-head">
            <div class="day-name">${isToday ? "Today" : DAY_NAMES[date.getDay()]}</div>
            <div class="day-date">${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
          </div>
          ${MEAL_ORDER.map((m, mi) => mealRowHtml(day, i, m, recipes[mi])).join("")}
          <div class="nutri-wrap">
            ${nutritionRowHtml("Calories", totals.kcal, targets.kcal, "")}
            ${nutritionRowHtml("Protein", totals.protein, targets.protein, "g")}
            ${nutritionRowHtml("Carbs", totals.carbs, targets.carbs, "g")}
            ${nutritionRowHtml("Fat", totals.fat, targets.fat, "g")}
          </div>
        </div>`;
    })
    .join("");

  if (repaired) Store.setPlan(state.plan);

  view.innerHTML = `<h2 class="section-title">${state.settings.planDays}-day plan · ${state.settings.persons} ${state.settings.persons === 1 ? "person" : "people"}</h2>${html}`;

  view.querySelectorAll(".like-slot").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const row = e.currentTarget.closest(".meal-row");
      const day = state.plan.days[row.dataset.day];
      const recipeId = day[row.dataset.meal].recipeId;
      const newVal = state.prefs[recipeId] === 1 ? 0 : 1;
      setPref(recipeId, newVal);
      toast(newVal === 1 ? "Liked — we'll plan more like this" : "Removed like");
      renderPlan();
    });
  });

  view.querySelectorAll(".reroll-slot").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const row = e.currentTarget.closest(".meal-row");
      const dayIndex = Number(row.dataset.day);
      const meal = row.dataset.meal;
      await rerollSlot(dayIndex, meal);
    });
  });

  view.querySelectorAll(".meal-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".mini-btn")) return; // like/reroll handle their own clicks
      const recipe = recipeById(row.dataset.recipe);
      if (recipe) openRecipeModal(recipe);
    });
  });
}

// ---------------------------------------------------------------- Discover tab (swipe)

function discoverPool() {
  return RECIPES.filter(
    (r) =>
      r.meal === state.discoverMeal &&
      r.minutes <= state.settings.cookTime[state.discoverMeal] + 60 &&
      matchesDiet(r, state.settings.diet)
  ).sort((a, b) => (state.prefs[b.id] || 0) - (state.prefs[a.id] || 0));
}

function renderDiscover() {
  const pool = discoverPool();
  if (state.discoverIndex >= pool.length) state.discoverIndex = 0;

  view.innerHTML = `
    <div class="meal-filter">
      ${MEAL_ORDER.map((m) => `<button class="chip ${m === state.discoverMeal ? "active" : ""}" data-meal="${m}">${m}</button>`).join("")}
    </div>
    <div class="swipe-stage" id="swipe-stage"></div>
    <div class="swipe-actions">
      <button class="round-btn reject" id="btn-reject" title="Not for me">
        <svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"/></svg>
      </button>
      <button class="round-btn info" id="btn-ai" title="Ask AI for an idea">
        <svg viewBox="0 0 24 24"><path d="M12 2 9.3 9.3 2 12l7.3 2.7L12 22l2.7-7.3L22 12l-7.3-2.7z"/></svg>
      </button>
      <button class="round-btn like" id="btn-like" title="Like">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.2 2.3 4.8 5.7 4.2c2-.3 3.9.6 5 2.2 1.1-1.6 3-2.5 5-2.2 3.4.6 5.2 4 3.7 7.5C19.5 16.4 12 21 12 21z"/></svg>
      </button>
    </div>
    <p class="hint" style="margin-top:16px; text-align:center;">Swipe right to like, left to skip. Liked dishes show up more often in your weekly plan.</p>
  `;

  view.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.discoverMeal = chip.dataset.meal;
      state.discoverIndex = 0;
      renderDiscover();
    });
  });

  drawStack(pool);

  document.getElementById("btn-reject").addEventListener("click", () => swipeCurrent(pool, -1));
  document.getElementById("btn-like").addEventListener("click", () => swipeCurrent(pool, 1));
  document.getElementById("btn-ai").addEventListener("click", () => askAI(pool));
}

function drawStack(pool) {
  const stage = document.getElementById("swipe-stage");
  if (!stage) return;
  stage.innerHTML = "";

  if (pool.length === 0) {
    stage.innerHTML = `<div class="empty-state">No recipes match right now.<br>Try a longer cook-time limit in Settings.</div>`;
    return;
  }

  const slice = [pool[state.discoverIndex], pool[(state.discoverIndex + 1) % pool.length]].filter(Boolean);

  slice
    .slice()
    .reverse()
    .forEach((recipe, i) => {
      const isTop = i === slice.length - 1;
      const card = document.createElement("div");
      card.className = "swipe-card";
      card.style.transform = isTop ? "none" : "scale(0.96) translateY(10px)";
      card.style.zIndex = isTop ? 2 : 1;
      card.innerHTML = `
        <div class="photo" style="${recipe.image ? `background-image:url('${recipe.image}')` : ""}">
          <span class="badge">${minutesLabel(recipe)}</span>
          <span class="stamp like">Yum</span>
          <span class="stamp nope">Skip</span>
        </div>
        <div class="body">
          <div class="title">${recipe.title}</div>
          <div class="meta">${recipe.nutrition.kcal} kcal · ${displayTags(recipe).join(", ")}</div>
        </div>`;
      if (isTop) attachSwipeHandlers(card, pool);
      card.querySelector(".body").addEventListener("click", () => openRecipeModal(recipe));
      stage.appendChild(card);
    });
}

function attachSwipeHandlers(card, pool) {
  let startX = 0, startY = 0, dx = 0, dragging = false;

  const onDown = (x, y) => { dragging = true; startX = x; startY = y; card.style.transition = "none"; };
  const onMove = (x, y) => {
    if (!dragging) return;
    dx = x - startX;
    const dy = (y - startY) * 0.4;
    const rot = dx / 18;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    const like = card.querySelector(".stamp.like");
    const nope = card.querySelector(".stamp.nope");
    like.style.opacity = Math.max(0, dx / 100);
    nope.style.opacity = Math.max(0, -dx / 100);
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    card.style.transition = "transform 0.25s ease";
    if (dx > 90) return swipeCurrent(pool, 1, card);
    if (dx < -90) return swipeCurrent(pool, -1, card);
    card.style.transform = "none";
    dx = 0;
  };

  card.addEventListener("pointerdown", (e) => onDown(e.clientX, e.clientY));
  window.addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY));
  window.addEventListener("pointerup", onUp);
}

function swipeCurrent(pool, direction, cardEl) {
  const recipe = pool[state.discoverIndex];
  if (!recipe) return;
  setPref(recipe.id, direction);

  const card = cardEl || document.querySelector(".swipe-card[style*='z-index: 2']") || document.querySelector(".swipe-card");
  if (card) {
    card.style.transition = "transform 0.35s ease, opacity 0.35s ease";
    card.style.transform = `translate(${direction * 500}px, -40px) rotate(${direction * 25}deg)`;
    card.style.opacity = "0";
  }

  toast(direction === 1 ? `Liked ${recipe.title}` : `Skipped ${recipe.title}`);
  state.discoverIndex = (state.discoverIndex + 1) % Math.max(pool.length, 1);
  setTimeout(() => drawStack(pool), 220);
}

async function askAI(pool) {
  if (state.settings.recipeSource !== "gemini" || !state.settings.geminiKey) {
    toast("Switch Recipe source to Gemini AI in Settings (and add a key) to enable this");
    return;
  }
  showLoading("Asking Gemini for an idea…");
  try {
    const { dislikedTitles } = likedAndDislikedTitles();
    const recipe = await suggestRecipeWithAI({
      apiKey: state.settings.geminiKey,
      meal: state.discoverMeal,
      minutesLimit: state.settings.cookTime[state.discoverMeal],
      seasonal: state.settings.seasonal,
      season: currentSeason(),
      dislikedTitles,
      diet: state.settings.diet,
    });
    registerSessionRecipes([recipe]);
    pool.unshift(recipe);
    state.discoverIndex = 0;
    drawStack(pool);
    toast(`Gemini suggests: ${recipe.title}`);
  } catch (err) {
    console.error(err);
    toast("Couldn't reach Gemini — check your API key");
  } finally {
    hideLoading();
  }
}

// ---------------------------------------------------------------- Shopping tab

function renderShopping() {
  const list = buildShoppingList(state.plan, state.settings.persons);
  const checkedCount = Object.values(state.shoppingChecked).filter(Boolean).length;

  const groups = Object.keys(list.grouped)
    .map(
      (cat) => `
      <div class="cat-title">${cat}</div>
      <div class="card">
        ${list.grouped[cat]
          .map((item) => {
            const key = `${item.name}|${item.unit}`;
            const checked = !!state.shoppingChecked[key];
            return `
            <div class="shop-item ${checked ? "checked" : ""}" data-key="${key}">
              <div class="checkbox ${checked ? "checked" : ""}">${checked ? '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>' : ""}</div>
              <div class="name">${item.name}${item.recipeCount > 1 ? `<span class="reuse-tag">used ×${item.recipeCount}</span>` : ""}</div>
              <div class="qty">${item.qty} ${item.unit}</div>
            </div>`;
          })
          .join("")}
      </div>`
    )
    .join("");

  view.innerHTML = `
    <div class="card shop-summary">
      <div class="stat"><div class="num">${list.totalItems}</div><div class="lbl">items</div></div>
      <div class="stat"><div class="num">${list.reusedCount}</div><div class="lbl">reused ingredients</div></div>
      <div class="stat"><div class="num">${checkedCount}/${list.totalItems}</div><div class="lbl">checked off</div></div>
    </div>
    ${state.settings.maximizeEfficiency ? `<p class="hint">Efficiency mode is on — recipes were chosen to reuse ingredients, so fewer items go to waste.</p>` : ""}
    ${groups}
  `;

  view.querySelectorAll(".shop-item").forEach((el) => {
    el.addEventListener("click", () => {
      const key = el.dataset.key;
      state.shoppingChecked[key] = !state.shoppingChecked[key];
      renderShopping();
    });
  });
}

// ---------------------------------------------------------------- Settings tab

function renderSettings() {
  const s = state.settings;
  const targets = computeTargets(s);
  const webCache = Store.getWebRecipeCache();

  view.innerHTML = `
    <h2 class="section-title">About you</h2>
    <div class="card" style="padding:14px;">
      <div class="field">
        <label>Name (optional)</label>
        <input type="text" id="f-name" value="${s.name}" placeholder="Your name">
      </div>
      <div class="row2">
        <div class="field">
          <label>Sex</label>
          <div class="segmented" id="f-sex">
            <button data-v="female" class="${s.sex === "female" ? "active" : ""}">Female</button>
            <button data-v="male" class="${s.sex === "male" ? "active" : ""}">Male</button>
          </div>
        </div>
        <div class="field">
          <label>Age</label>
          <input type="number" id="f-age" value="${s.age}" min="10" max="100">
        </div>
      </div>
      <div class="row2">
        <div class="field">
          <label>Height (cm)</label>
          <input type="number" id="f-height" value="${s.heightCm}" min="120" max="230">
        </div>
        <div class="field">
          <label>Weight (kg)</label>
          <input type="number" id="f-weight" value="${s.weightKg}" min="30" max="250">
        </div>
      </div>
      <div class="field">
        <label>Activity level</label>
        <select id="f-activity">
          <option value="1.2" ${s.activity == 1.2 ? "selected" : ""}>Sedentary (little exercise)</option>
          <option value="1.375" ${s.activity == 1.375 ? "selected" : ""}>Light (1-3x/week)</option>
          <option value="1.55" ${s.activity == 1.55 ? "selected" : ""}>Moderate (3-5x/week)</option>
          <option value="1.725" ${s.activity == 1.725 ? "selected" : ""}>Active (6-7x/week)</option>
          <option value="1.9" ${s.activity == 1.9 ? "selected" : ""}>Athlete</option>
        </select>
      </div>
      <div class="field">
        <label>Goal</label>
        <div class="segmented" id="f-goal">
          <button data-v="lose" class="${s.goal === "lose" ? "active" : ""}">Lose</button>
          <button data-v="maintain" class="${s.goal === "maintain" ? "active" : ""}">Maintain</button>
          <button data-v="gain" class="${s.goal === "gain" ? "active" : ""}">Gain</button>
        </div>
      </div>
      <p class="hint">Estimated daily target: <strong>${targets.kcal} kcal</strong> · ${targets.protein}g protein · ${targets.carbs}g carbs · ${targets.fat}g fat.</p>
    </div>

    <h2 class="section-title">Household & plan</h2>
    <div class="card" style="padding:14px;">
      <div class="field">
        <label>Number of people</label>
        <div class="stepper">
          <button id="persons-dec">−</button>
          <div class="value" id="persons-val">${s.persons}</div>
          <button id="persons-inc">+</button>
        </div>
      </div>
      <div class="field">
        <label>Plan length</label>
        <div class="segmented" id="f-plandays">
          <button data-v="7" class="${s.planDays == 7 ? "active" : ""}">1 week</button>
          <button data-v="14" class="${s.planDays == 14 ? "active" : ""}">2 weeks</button>
        </div>
      </div>
    </div>

    <h2 class="section-title">Dietary needs</h2>
    <div class="card" style="padding:0 14px;">
      <div class="toggle-row">
        <div>
          <div class="t-label">Vegetarian</div>
          <div class="t-desc">No meat or fish, in the plan, Discover, and the shopping list.</div>
        </div>
        <div class="switch ${s.diet.vegetarian ? "on" : ""}" id="f-diet-vegetarian"><div class="knob"></div></div>
      </div>
      <div class="toggle-row">
        <div>
          <div class="t-label">Vegan</div>
          <div class="t-desc">No meat, fish, dairy, or eggs.</div>
        </div>
        <div class="switch ${s.diet.vegan ? "on" : ""}" id="f-diet-vegan"><div class="knob"></div></div>
      </div>
      <div class="toggle-row">
        <div>
          <div class="t-label">Gluten-free</div>
          <div class="t-desc">No wheat-based bread, pasta, or flour.</div>
        </div>
        <div class="switch ${s.diet.glutenFree ? "on" : ""}" id="f-diet-glutenfree"><div class="knob"></div></div>
      </div>
    </div>
    <p class="hint">These are treated as hard requirements everywhere — the plan, Discover, and single-slot swaps never show a recipe that breaks them. This is a keyword-based check, not a certified allergen list — for a serious allergy, double-check the ingredients yourself.</p>

    <h2 class="section-title">Preferences</h2>
    <div class="card" style="padding:0 14px;">
      <div class="toggle-row">
        <div>
          <div class="t-label">Seasonal ingredients</div>
          <div class="t-desc">Prefer recipes built around what's in season now.</div>
        </div>
        <div class="switch ${s.seasonal ? "on" : ""}" id="f-seasonal"><div class="knob"></div></div>
      </div>
      <div class="toggle-row">
        <div>
          <div class="t-label">Maximize shopping efficiency</div>
          <div class="t-desc">Favor recipes that reuse the same ingredients across the week.</div>
        </div>
        <div class="switch ${s.maximizeEfficiency ? "on" : ""}" id="f-efficiency"><div class="knob"></div></div>
      </div>
    </div>

    <h2 class="section-title">Cooking time limits</h2>
    <div class="card" style="padding:0 14px;">
      ${["breakfast", "lunch", "dinner"]
        .map(
          (m) => `
        <div class="slider-row">
          <div class="s-top"><span style="text-transform:capitalize">${m}</span><span>${s.cookTime[m]} min</span></div>
          <input type="range" min="5" max="90" step="5" value="${s.cookTime[m]}" data-meal="${m}" class="cooktime-slider">
        </div>`
        )
        .join("")}
    </div>

    <h2 class="section-title">Recipe source</h2>
    <div class="card" style="padding:14px;">
      <div class="segmented" id="f-recipesource">
        <button data-v="builtin" class="${s.recipeSource === "builtin" ? "active" : ""}">Built-in</button>
        <button data-v="mealdb" class="${s.recipeSource === "mealdb" ? "active" : ""}">Web (free)</button>
        <button data-v="gemini" class="${s.recipeSource === "gemini" ? "active" : ""}">Gemini AI</button>
      </div>
      <p class="hint" style="margin-top:12px; margin-bottom:0;" id="recipesource-desc"></p>
    </div>
    <div class="field" style="margin-top:10px;" id="geminikey-field">
      <label>Gemini API key</label>
      <input type="password" id="f-geminikey" value="${s.geminiKey}" placeholder="Paste your API key">
    </div>
    <p class="hint" id="geminikey-hint">Stored only on this device (localStorage) and sent directly to Google when a plan or suggestion is requested. Get a free key at aistudio.google.com.</p>

    <div class="toggle-row" style="padding:2px 2px 0;">
      <div>
        <div class="t-label">${webCache.length} recipe${webCache.length === 1 ? "" : "s"} cached from the web</div>
        <div class="t-desc">Reused instantly when regenerating a plan or swapping a meal, instead of re-fetching. Clear it to force fresh results next time.</div>
      </div>
      <button class="link-btn" id="btn-clear-cache" style="width:auto; margin:0; white-space:nowrap; flex-shrink:0;" ${webCache.length ? "" : "disabled"}>Clear</button>
    </div>

    <button class="save-btn" id="btn-save">Save settings</button>
    <button class="link-btn" id="btn-reset">Reset all data on this device</button>
    <div class="version-footer">What Should I Eat · v${VERSION} · ${BUILD_DATE}</div>
  `;

  document.getElementById("f-name").addEventListener("input", (e) => (s.name = e.target.value));
  document.getElementById("f-age").addEventListener("input", (e) => (s.age = Number(e.target.value)));
  document.getElementById("f-height").addEventListener("input", (e) => (s.heightCm = Number(e.target.value)));
  document.getElementById("f-weight").addEventListener("input", (e) => (s.weightKg = Number(e.target.value)));
  document.getElementById("f-activity").addEventListener("change", (e) => (s.activity = Number(e.target.value)));
  document.getElementById("f-geminikey").addEventListener("input", (e) => (s.geminiKey = e.target.value));

  segmented("f-sex", (v) => (s.sex = v));
  segmented("f-goal", (v) => (s.goal = v));
  segmented("f-plandays", (v) => (s.planDays = Number(v)));

  document.getElementById("persons-dec").addEventListener("click", () => {
    s.persons = Math.max(1, s.persons - 1);
    document.getElementById("persons-val").textContent = s.persons;
  });
  document.getElementById("persons-inc").addEventListener("click", () => {
    s.persons = Math.min(8, s.persons + 1);
    document.getElementById("persons-val").textContent = s.persons;
  });

  toggle("f-seasonal", (v) => (s.seasonal = v));
  toggle("f-efficiency", (v) => (s.maximizeEfficiency = v));
  toggle("f-diet-vegetarian", (v) => (s.diet.vegetarian = v));
  toggle("f-diet-vegan", (v) => (s.diet.vegan = v));
  toggle("f-diet-glutenfree", (v) => (s.diet.glutenFree = v));

  const RECIPE_SOURCE_DESC = {
    builtin: "Picks from the app's ~65 built-in sample recipes. Works fully offline; photos are approximate.",
    mealdb: "Finds real recipes on TheMealDB (themealdb.com) — free, no account needed, and each one shows the actual photo of that dish. Nutrition and cook time are estimates, since TheMealDB doesn't provide them.",
    gemini: "Asks Google's Gemini, with Search grounding, to find real recipes online matching your settings. Needs a free API key below.",
  };
  function updateRecipeSourceUI() {
    document.getElementById("recipesource-desc").textContent = RECIPE_SOURCE_DESC[s.recipeSource];
    const showGemini = s.recipeSource === "gemini";
    document.getElementById("geminikey-field").hidden = !showGemini;
    document.getElementById("geminikey-hint").hidden = !showGemini;
  }
  updateRecipeSourceUI();
  segmented("f-recipesource", (v) => {
    s.recipeSource = v;
    updateRecipeSourceUI();
  });

  view.querySelectorAll(".cooktime-slider").forEach((el) => {
    el.addEventListener("input", (e) => {
      s.cookTime[e.target.dataset.meal] = Number(e.target.value);
      e.target.closest(".slider-row").querySelector(".s-top span:last-child").textContent = `${e.target.value} min`;
    });
  });

  document.getElementById("btn-save").addEventListener("click", async (e) => {
    Store.setSettings(s);
    e.currentTarget.disabled = true;
    e.currentTarget.textContent = "Saving…";
    state.plan = await buildNewPlan();
    Store.setPlan(state.plan);
    toast(state.plan.source !== "builtin" ? "Settings saved — plan sourced from the web" : "Settings saved — plan updated");
    state.tab = "plan";
    render();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("Clear all saved settings, plans and preferences on this device?")) return;
    localStorage.clear();
    location.reload();
  });

  const clearCacheBtn = document.getElementById("btn-clear-cache");
  if (!clearCacheBtn.disabled) {
    clearCacheBtn.addEventListener("click", () => {
      Store.setWebRecipeCache([]);
      // Also drop them from the in-memory catalog so this takes effect
      // immediately, not just after a reload. Any current plan slot that
      // pointed at one of these self-heals via renderPlan's repair pass.
      for (let i = RECIPES.length - 1; i >= 0; i--) {
        if (isWebSourced(RECIPES[i])) RECIPES.splice(i, 1);
      }
      toast("Cache cleared — the next plan will fetch fresh recipes");
      renderSettings();
    });
  }
}

function segmented(id, onChange) {
  const wrap = document.getElementById(id);
  wrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      onChange(btn.dataset.v);
    });
  });
}

function toggle(id, onChange) {
  const el = document.getElementById(id);
  el.addEventListener("click", () => {
    const on = !el.classList.contains("on");
    el.classList.toggle("on", on);
    onChange(on);
  });
}

render();
