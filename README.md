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

## Deploy to Cloudflare Pages

This is a pure static site, so no build step is needed.

**Via the dashboard (connect the GitHub repo):**
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick this repo/branch.
2. Build settings: **Framework preset** `None`, **Build command** left
   empty, **Build output directory** `/` (the repo root).
3. Deploy. Cloudflare picks up `_headers` automatically (sets the correct
   `Content-Type` for `manifest.webmanifest` and stops `sw.js` from being
   cached stale).

**Via Wrangler CLI, without connecting Git:**
```
npx wrangler pages deploy . --project-name what-should-i-eat
```

Once it's live at your `*.pages.dev` URL (or a custom domain attached in
Pages → Custom domains), the "Add to Home Screen" flow below works exactly
the same as running it locally.

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
  like/skip, which feeds back into future plan generation. Tap a card's
  title/details to see the full recipe.
- **Shopping tab** — the whole plan's ingredients combined, scaled by
  household size, grouped by aisle/category, with a tag on any ingredient
  reused across multiple meals.
- **Settings tab** — personal details for the nutrition target, household
  size, plan length, a "seasonal ingredients" toggle, a "maximize shopping
  efficiency" toggle (biases recipe selection toward ingredient reuse), a
  per-meal cook-time limit, and the Gemini API key/toggle described below.
- **Recipe detail** — tapping any meal (in the Plan tab or Discover) opens a
  sheet with the photo, macros, full ingredient list, step-by-step
  instructions, and (for AI-sourced recipes) a note on where it was found.

## Where recipes come from

- **Built-in catalog** (`js/data.js`, ~65 recipes across breakfast/lunch/
  dinner) — used whenever AI sourcing is off, no API key is set, or a
  Gemini call fails. This is what makes the app fully usable offline out
  of the box.
- **Gemini, grounded in Google Search** (`js/ai.js`) — turn on "Source
  recipes from the web" in Settings and add a free Gemini API key
  (aistudio.google.com), and "Regenerate plan" / "Try another" instead ask
  Gemini 2.5 Flash, with Google Search grounding enabled, to find real
  recipes online that match your cook-time limits, season, household size,
  and liked/disliked dishes. The call happens directly from the browser
  (no backend) and returns structured JSON (title, ingredients, steps,
  nutrition) that slots into the exact same recipe shape the built-in
  catalog uses — the rest of the app doesn't know the difference.
  Search grounding is a metered feature on Gemini's API; check current
  pricing/quotas for your key if you plan to regenerate plans often.
- Swapping in a dedicated recipe API (Spoonacular, Edamam, TheMealDB, etc.)
  instead of/alongside Gemini is straightforward for the same reason —
  match the same recipe shape and nothing else in the app needs to change.
- Recipe photos currently link to Unsplash CDN URLs as placeholders;
  AI-sourced recipes show a plain color block instead since there's no
  stock photo for a dish just pulled from the web.

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
js/version.js        App version shown in Settings
icons/               Generated app icons (apple-touch-icon + PWA icons)
```

## Versioning & auto-update

The version shown at the bottom of the Settings tab comes from
`js/version.js`. **Bump `VERSION` there and `CACHE_VERSION` at the top of
`sw.js` together on every deploy** — same value in both places. That's what
makes an update "count": a new cache name means the service worker's
`activate` step drops the old cached app shell and fetches the new one.

Nothing further to run — a phone with the app already open (or added to
the Home Screen) picks the update up on its own:
1. The page checks for a new `sw.js` whenever it regains focus, and hourly
   while left open.
2. If the version changed, the new service worker installs, takes over
   immediately (`skipWaiting` + `clients.claim()`), and the page reloads
   itself once to pick up the new files — no manual refresh needed.
