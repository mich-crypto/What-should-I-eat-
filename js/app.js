import { Store, DEFAULT_SETTINGS } from "./storage.js";
import { RECIPES, recipeById, currentSeason } from "./data.js";
import { computeTargets, sumNutrition, pct } from "./nutrition.js";
import { generatePlan, regenerateSlot } from "./planner.js";
import { buildShoppingList } from "./shopping.js";
import { suggestRecipeWithAI, generatePlanWithAI } from "./ai.js";

const view = document.getElementById("view");
const topbarTitle = document.getElementById("topbar-title");
const toastEl = document.getElementById("toast");

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

if (!state.plan) {
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
      <div class="modal-meta">${recipe.minutes} min · ${recipe.nutrition.kcal} kcal · ${recipe.nutrition.protein}g protein · ${recipe.nutrition.carbs}g carbs · ${recipe.nutrition.fat}g fat</div>
      ${(recipe.tags || []).length ? `<div class="modal-tags">${recipe.tags.map((t) => `<span>${t}</span>`).join("")}</div>` : ""}

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

/**
 * Build a full plan. When AI suggestions are on and a Gemini key is set,
 * Gemini (with Google Search grounding) sources real recipes from the web;
 * otherwise, and if that call fails for any reason, fall back to the
 * built-in catalog so the app always keeps working.
 */
async function buildNewPlan() {
  if (state.settings.useAI && state.settings.geminiKey) {
    toast("Asking Gemini to build your plan from the web…");
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
      });
      const startDate = new Date();
      const days = aiDays.map((day, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const entry = { date: date.toISOString().slice(0, 10) };
        MEAL_ORDER.forEach((meal) => {
          RECIPES.push(day[meal]); // session-only, so recipeById() keeps working uniformly
          entry[meal] = { recipeId: day[meal].id, locked: false };
        });
        return entry;
      });
      return { days, generatedAt: new Date().toISOString(), source: "ai" };
    } catch (err) {
      console.error(err);
      toast("Gemini unavailable — using built-in recipes instead");
      return generatePlan(state);
    }
  }
  return generatePlan(state);
}

/** Swap a single day/meal slot, preferring a fresh web-sourced recipe when AI is on. */
async function rerollSlot(dayIndex, meal) {
  if (state.settings.useAI && state.settings.geminiKey) {
    toast("Asking Gemini for another option…");
    try {
      const { dislikedTitles } = likedAndDislikedTitles();
      const recipe = await suggestRecipeWithAI({
        apiKey: state.settings.geminiKey,
        meal,
        minutesLimit: state.settings.cookTime[meal],
        seasonal: state.settings.seasonal,
        season: currentSeason(),
        dislikedTitles,
      });
      RECIPES.push(recipe);
      state.plan.days[dayIndex][meal] = { recipeId: recipe.id, locked: false };
      Store.setPlan(state.plan);
      toast(`Swapped in ${recipe.title}`);
      renderPlan();
      return;
    } catch (err) {
      console.error(err);
      toast("Gemini unavailable — picking from built-in recipes");
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
  e.currentTarget.disabled = true;
  state.plan = await buildNewPlan();
  Store.setPlan(state.plan);
  toast(state.plan.source === "ai" ? "New plan sourced from the web" : "New plan generated");
  e.currentTarget.disabled = false;
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
        <div class="meal-meta">${recipe.minutes} min · ${recipe.nutrition.kcal} kcal</div>
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

  const html = state.plan.days
    .map((day, i) => {
      const date = new Date(day.date);
      const isToday = date.toDateString() === today.toDateString();
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
    (r) => r.meal === state.discoverMeal && r.minutes <= state.settings.cookTime[state.discoverMeal] + 60
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
          <span class="badge">${recipe.minutes} min</span>
          <span class="stamp like">Yum</span>
          <span class="stamp nope">Skip</span>
        </div>
        <div class="body">
          <div class="title">${recipe.title}</div>
          <div class="meta">${recipe.nutrition.kcal} kcal · ${(recipe.tags || []).join(", ")}</div>
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
  if (!state.settings.useAI || !state.settings.geminiKey) {
    toast("Add a Gemini API key in Settings to enable AI ideas");
    return;
  }
  toast("Asking Gemini for an idea…");
  try {
    const dislikedTitles = RECIPES.filter((r) => state.prefs[r.id] === -1).map((r) => r.title);
    const recipe = await suggestRecipeWithAI({
      apiKey: state.settings.geminiKey,
      meal: state.discoverMeal,
      minutesLimit: state.settings.cookTime[state.discoverMeal],
      seasonal: state.settings.seasonal,
      season: currentSeason(),
      dislikedTitles,
    });
    RECIPES.push(recipe); // session-only; not persisted to the static catalog
    pool.unshift(recipe);
    state.discoverIndex = 0;
    drawStack(pool);
    toast(`Gemini suggests: ${recipe.title}`);
  } catch (err) {
    toast("Couldn't reach Gemini — check your API key");
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
    <div class="card" style="padding:0 14px;">
      <div class="toggle-row">
        <div>
          <div class="t-label">Source recipes from the web (Gemini)</div>
          <div class="t-desc">When on, "Regenerate plan" and "Try another" ask Gemini — with Google Search grounding — to find real recipes online matching your settings, instead of picking from the built-in list. Falls back to the built-in list if Gemini is unavailable.</div>
        </div>
        <div class="switch ${s.useAI ? "on" : ""}" id="f-useai"><div class="knob"></div></div>
      </div>
    </div>
    <div class="field" style="margin-top:10px;">
      <label>Gemini API key</label>
      <input type="password" id="f-geminikey" value="${s.geminiKey}" placeholder="Paste your API key">
    </div>
    <p class="hint">Stored only on this device (localStorage) and sent directly to Google when a plan or suggestion is requested. Get a free key at aistudio.google.com. Without a key, the app uses its built-in sample recipes.</p>

    <button class="save-btn" id="btn-save">Save settings</button>
    <button class="link-btn" id="btn-reset">Reset all data on this device</button>
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
  toggle("f-useai", (v) => (s.useAI = v));

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
    toast(state.plan.source === "ai" ? "Settings saved — plan sourced from the web" : "Settings saved — plan updated");
    state.tab = "plan";
    render();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (!confirm("Clear all saved settings, plans and preferences on this device?")) return;
    localStorage.clear();
    location.reload();
  });
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
