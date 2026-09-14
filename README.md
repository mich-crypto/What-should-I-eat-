# What Should I Eat

A simple, installable web app for planning breakfast, lunch and dinner for
1–2 weeks: a meal plan tuned to your nutrition needs, a swipeable recipe
discovery screen, an auto-generated shopping list, and a "like" button that
nudges future plans toward your taste.

No build step, no backend, no account — it's static HTML/CSS/JS that stores
everything on-device (`localStorage`) and installs to the iPhone Home Screen
as a standalone app.

## Run it locally

Any static file server works, e.g.:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser (or on your phone via your
computer's LAN IP, e.g. `http://192.168.1.23:8080`, for the full iOS
install experience).

## Install on iPhone (Add to Home Screen)

1. Open the app's URL in **Safari** on the iPhone (must be Safari, not
   Chrome — only Safari can install to the Home Screen on iOS).
2. Tap the **Share** icon → **Add to Home Screen** → **Add**.
3. Launch it from the Home Screen icon — it opens full-screen with no
   Safari address bar, uses the app icon generated in `icons/`, and keeps
   working offline for the app shell thanks to `sw.js`.

## What's implemented

- **Plan tab** — a 7- or 14-day grid of breakfast/lunch/dinner, each day's
  running totals for calories/protein/carbs/fat plotted against a personal
  target (Mifflin-St Jeor BMR × activity level, adjustable goal).
- **Discover tab** — Tinder-style swipe cards per meal type; swipe or tap to
  like/skip, which feeds back into future plan generation. An optional
  "spark" button asks Google's Gemini API for a fresh recipe idea.
- **Shopping tab** — the whole plan's ingredients combined, scaled by
  household size, grouped by aisle/category, with a tag on any ingredient
  reused across multiple meals.
- **Settings tab** — personal details for the nutrition target, household
  size, plan length, a "seasonal ingredients" toggle, a "maximize shopping
  efficiency" toggle (biases recipe selection toward ingredient reuse), a
  per-meal cook-time limit, and an optional Gemini API key.

## Recipe data & AI, and what to swap in for production

- `js/data.js` ships ~24 sample recipes so the app works fully offline out
  of the box. Swap this for a live call to a recipe API (Spoonacular,
  Edamam, TheMealDB, etc.) — every recipe object already matches the shape
  `js/ai.js` produces, so the rest of the app (planner, shopping list,
  swipe UI) needs no changes.
- `js/ai.js` calls `generativelanguage.googleapis.com` (Gemini) directly
  from the browser using a key the user pastes into Settings. That's fine
  for a personal tool; for a shared/public deployment, proxy that call
  through a small backend so the key isn't exposed client-side, and add
  real rate limiting.
- Recipe photos currently link to Unsplash CDN URLs as placeholders.

## Project structure

```
index.html          Shell + tab bar
manifest.webmanifest PWA manifest (Home Screen icon/name/colors)
sw.js                Offline app-shell cache
css/styles.css       All styling (light + dark, iOS-safe-area aware)
js/data.js           Sample recipe catalog
js/storage.js        localStorage wrapper (settings/plan/prefs/history)
js/nutrition.js      BMR/TDEE + macro targets
js/planner.js        Weekly plan generation & single-slot regeneration
js/shopping.js       Ingredient aggregation into a shopping list
js/ai.js             Optional Gemini-powered recipe suggestions
js/app.js            UI rendering, swipe gestures, event wiring
icons/               Generated app icons (apple-touch-icon + PWA icons)
```
