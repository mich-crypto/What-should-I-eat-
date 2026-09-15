# What Should I Eat

A simple, installable web app for planning breakfast, lunch and dinner for
1–2 weeks: a meal plan tuned to your nutrition needs, a swipeable recipe
discovery screen, an auto-generated shopping list, and a "like" button that
nudges future plans toward your taste.

No build step and no account — it's static HTML/CSS/JS that stores
everything on-device (`localStorage`) and installs to the iPhone Home Screen
as a standalone app.

There's one **optional** backend: a small Cloudflare Worker + D1 database
that keeps two phones in a household in step (see **Household sync**). The
app is fully functional without it, and stays local-first with it — nothing
in the UI ever waits on the network.

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
  reused across multiple meals. Recomputed from scratch on every visit, so
  swapping a meal drops its now-unused ingredients and adds the new ones —
  matching by name/unit after normalizing casing, plurals and common unit
  wording (e.g. "onions"/"Onion", "grams"/"g"), so the same ingredient
  phrased differently by different recipes merges into one row instead of
  sitting next to it as a near-duplicate.
- **Settings tab** — personal details for the nutrition target, household
  size, plan length, dietary needs (vegetarian/vegan/gluten-free — enforced
  everywhere, not just a filter you have to remember), a "seasonal
  ingredients" toggle, a "maximize shopping efficiency" toggle, a per-meal
  cook-time limit, and the recipe source described below.
- **Recipe detail** — tapping any meal (in the Plan tab or Discover) opens a
  sheet with the photo, macros, full ingredient list, step-by-step
  instructions, and (for web-sourced recipes) a note on where it came from.
- **Loading state** — whenever the app is waiting on TheMealDB or Gemini
  (regenerating the plan, swapping a single slot, or Discover's "spark"
  idea), a small animated cooking-pot overlay shows instead of a bare
  spinner, since these calls can take a couple of seconds.

## Where recipes come from

Pick one in Settings → Recipe source. Whichever you pick, every recipe it
fetches is cached on-device — see **Caching web recipes** below for why
that matters for speed.

- **Spoonacular** (`js/spoonacular.js`) — **recommended.** 360,000+ recipes,
  each with the real photo of that exact dish, real nutrition, real cook
  times, and a true ingredient list. It's the only source that reports a
  countable ingredient list, which is what makes the **Simple recipes**
  limit an actual filter instead of a wish. One request returns up to 100
  fully-populated recipes, so ~3 requests fill a pool that lasts months and
  every swap afterwards is instant. Needs a free API key
  (spoonacular.com/food-api).

- **TheMealDB** (`js/mealdb.js`) — **the keyless default**, so the app works
  with zero setup. A free public recipe API (themealdb.com). "Regenerate
  plan" / "Try another" fetch a real recipe matching the meal type and your
  dietary settings, and —
  unlike the built-in catalog's approximate stock photos — the photo shown
  is the actual photo of that exact dish. Trade-off: TheMealDB doesn't
  provide nutrition or cook-time data (or a breakfast/lunch/dinner split
  beyond "Breakfast" vs. everything else), so those are clearly-labeled
  estimates, and being a crowdsourced database its data is occasionally a
  little inconsistent (e.g. a title mentioning an ingredient the listed
  ingredients don't include).
- **Built-in catalog** (`js/data.js`, ~65 recipes) — fully offline, and
  what every recipe source falls back to if a live call fails for any
  reason (no network, rate limit, bad response). Photos here are matched
  to the dish by keyword (curry → a curry photo, salad → a salad photo,
  etc.) rather than being the specific dish's real photo, since there
  aren't 65 unique stock photos to give each recipe its own.
- **Gemini, grounded in Google Search** (`js/ai.js`) — needs a free API key
  (aistudio.google.com). Asks Gemini 2.5 Flash, with Google Search
  grounding enabled, to find real recipes online matching your cook-time
  limits, season, dietary needs, household size, and liked/disliked
  dishes. No photo is available for these (Gemini doesn't return one), so
  the UI shows a plain color block instead. Search grounding is a metered
  feature on Gemini's API; check current pricing/quotas if you plan to
  regenerate plans often. A whole plan is generated in one request, and
  long bulk generations are where LLMs are most prone to repeating a
  pattern — the prompt tells Gemini every breakfast/lunch/dinner title
  must be distinct, and that's checked afterward too: any repeat gets
  replaced with a single targeted re-ask before the plan is shown, so a
  duplicated dish never actually reaches the app.

All four return the exact same recipe shape (title, ingredients, steps,
nutrition, tags), so the rest of the app — planner, shopping list, swipe
UI, dietary filtering — doesn't know or care which source a recipe came
from. Adding another one is a matter of matching that same shape in a
single new file.

A note on the ones deliberately *not* integrated, since they come up:
**Edamam** no longer has a free tier (their Recipe Search API starts at
$9/month); **Open Food Facts** is a barcoded packaged-product database, not
recipes — searching it for "chicken curry" returns supermarket ready-meals;
and **BigOven**'s API is key-gated with no verifiable free tier. Spoonacular
was the only one of that group that's both free-tier and an actual recipe
database.

### Variety across the plan

Every path that fills a plan tracks which recipe it already placed for
each meal type earlier in that same plan and excludes it from the next
day's pick — the built-in planner, the Gemini bulk-generation dedup pass,
TheMealDB's per-slot fetching, and the recipe cache all do this
independently, so it holds regardless of which source is active or how
many of them a single "Regenerate plan" ends up touching (e.g. cache for
most slots, a live fetch to top up the rest). It degrades gracefully
rather than failing outright: once every non-excluded option (matching
cook-time/season/preference, then just diet, then the whole catalog for
that meal) is exhausted — realistically only on a very long plan against
a small catalog — a repeat is allowed rather than showing nothing.
Matching is done by dish title, not by id, since the same real dish can
end up cached under more than one id (Gemini hands it a fresh random id
each time it's suggested) — an id-only check would still let the same
dish appear twice under two different ids.

## Simple recipes

Settings → **Simple recipes** sets the most ingredients a recipe may have
to be offered (default 8). It's applied when picking from the pool, and
passed to the fetch so batches skew simple in the first place.

It only really bites on Spoonacular, because that's the only source with a
trustworthy ingredient list. For reference, TheMealDB's median recipe has
**12 ingredients** and only ~12% have 8 or fewer — so on that source a
strict limit mostly just empties the pool.

If a limit is so strict that a fetched batch yields almost nothing, the app
says so ("Not enough recipes with N ingredients or fewer — raise the limit
in Settings"), falls back to built-in recipes so you still get a plan, and
**stops re-requesting that meal type** rather than burning daily quota on a
query that isn't paying off. Saving settings clears that back-off, so
raising the limit retries immediately.

## Caching web recipes (so regenerating a plan is fast)

This is the core of how the app stays fast. Fetching happens **ahead of
time and in bulk**; choosing happens **locally and instantly**. Nothing the
user does waits on a network call.

A whole plan from Gemini is one big generation request — noticeably slower
than picking from a local list — and TheMealDB needs one network round-trip
per meal slot. Spoonacular sidesteps both by returning up to 100 recipes
per request. Every recipe any source returns gets saved on-device
(`js/storage.js`'s `webRecipeCache`, capped at 300, oldest trimmed first)
and restored on every app load.

On Spoonacular the pool also **restocks itself in the background**: once a
plan is on screen, any meal type whose pool has thinned out is topped up
without a loading spinner, so the *next* regenerate and swap are instant
too. Background failures are silent by design — nothing is blocked on them.

"Regenerate plan" and "Try another" check that cache first: if it already
has enough distinct matching recipes to fill the request (same meal type,
still satisfies your current dietary settings and cook-time limit) with
zero forced repeats, the plan builds from the cache instantly — no network
call at all. It only falls back to actually fetching from Gemini/TheMealDB
when the cache can't cover the request, e.g. the first time you use a
source, or right after turning on a dietary restriction the cache doesn't
have enough matches for yet.

Settings shows how many recipes are cached, with a **Clear** button if
you'd rather force fresh results next time than keep reusing what's been
fetched before — clearing takes effect immediately, not just after a
reload.

## Household sync (Cloudflare Worker + D1)

Optional. Without it the app is entirely local; with it, two phones in the
same household share the meal plan, shopping list and likes — tick milk off
in the shop and it disappears on the other phone too.

### Deploy it

```bash
npm install -g wrangler        # once
wrangler login

wrangler d1 create what-should-i-eat
#   ^ paste the printed database_id into wrangler.toml

wrangler d1 execute what-should-i-eat --remote --file=worker/schema.sql
wrangler deploy
```

`wrangler deploy` prints a URL like `https://what-should-i-eat-sync.<you>.workers.dev`.

### Pair the phones

1. Settings → **Household sync** → paste that URL into **Sync server URL**.
2. Tap **Create household** — it generates a code like `7K2P-9XQF-3RTB`.
3. On the second phone, enter the *same URL and code*, then tap **Sync now**.

### How it works, and what it deliberately doesn't do

**Local-first.** Every read the UI does still comes from localStorage, so
swaps stay instant and the app keeps working with no signal — which is
exactly where a shopping list is needed most. Sync is a background
reconcile on top: pull on open and on returning to the foreground, push
(debounced) after a change. Nothing in the UI ever waits on the network.

**Merging, not last-write-wins.** Whole-document LWW would silently throw
away one person's work. So the plan takes the newer side (and the recipes
it references travel with it, or the other phone would render a plan full
of ids it never fetched), likes merge additively from both phones, and the
shopping checkboxes merge **per item** — because that's the one thing you
genuinely both edit at once, standing in different aisles.

**The household code is the only credential.** No accounts, no passwords,
no email. It's ~59 bits of randomness, which isn't brute-forceable at any
sane request rate, but it is *not* real authentication: anyone with the
code has the data, and revoking means changing the code on every device.
That's a deliberate trade for a family shopping list — don't reuse the
pattern for anything sensitive. **API keys never sync**; they stay on the
device that entered them.

## Send the shopping list to iPhone Reminders

The Shopping tab has a **Send list to Reminders** button. Already-ticked
items are left out. It uses the best channel available:

1. **An Apple Shortcut** — the only route that makes each item its *own*
   reminder in a list you choose. Create a Shortcut that takes text input
   and adds it to Reminders, then put its exact name in Settings →
   **Reminders export**.
2. **The iOS share sheet** — no setup, but Reminders receives the list as a
   single reminder.
3. **Clipboard** — the universal fallback.

## Dietary needs (vegetarian / vegan / gluten-free)

Turned on in Settings, these are treated as hard requirements, not soft
preferences — checked in the planner, Discover, and single-slot "try
another" alike, and enforced regardless of which recipe source is active
(the constraint is also written into the Gemini/TheMealDB prompts and
query, then re-checked locally against the ingredients that come back).
Vegetarian/vegan are derived from each ingredient's category (no
`Meat`/`Fish`, and for vegan no `Dairy` either — eggs are filed under
`Dairy` in this app's ingredient categories, which conveniently makes that
check correct without extra bookkeeping). Gluten-free is a keyword check
against ingredient names (flour, bread, pasta, etc.) — a reasonable
approximation, but not a certified allergen list; double-check ingredients
yourself for a serious allergy.

## Project structure

```
index.html          Shell + tab bar
manifest.webmanifest PWA manifest (Home Screen icon/name/colors)
sw.js                Offline app-shell cache
css/styles.css       All styling (light + dark, iOS-safe-area aware)
js/data.js           Sample recipe catalog
js/storage.js        localStorage wrapper (settings/plan/prefs/history/web recipe cache)
js/nutrition.js      BMR/TDEE + macro targets
js/planner.js        Weekly plan generation & single-slot regeneration
js/shopping.js       Ingredient aggregation into a shopping list
js/ai.js             Optional Gemini-powered recipe suggestions
js/spoonacular.js     Spoonacular integration (recommended source, bulk prefetch)
js/mealdb.js          TheMealDB integration (free, keyless fallback)
js/app.js            UI rendering, swipe gestures, event wiring
js/sync.js            Household sync client (local-first)
js/version.js        App version shown in Settings
icons/               Generated app icons (apple-touch-icon + PWA icons)
worker/index.js      Cloudflare Worker: household sync endpoints
worker/sync-merge.js Merge logic (pure, unit-tested)
worker/schema.sql    D1 schema
wrangler.toml        Worker + D1 config
```

## Versioning & auto-update

The version shows in two places: under the page title in the top bar (every
tab — a quick way to confirm what build a device is actually running,
without digging into Settings) and again at the bottom of the Settings tab.
Both come from `js/version.js`.

**Bump `VERSION` there and `CACHE_VERSION` at the top of `sw.js` together on
every deploy** — same value in both places.

The service worker's cache is **network-first**: whenever there's a
connection, it always fetches the live file and refreshes the cache from
it — the cache is purely an offline fallback, used only if the network
request itself fails. That means a deploy reaches a device on its very
next load, without depending on the browser's own service-worker-update
lifecycle (which only checks periodically and can leave a stale cached
copy in place for a while). The `CACHE_VERSION` bump still matters — it's
what makes the `activate` step drop old offline-fallback caches — but it's
no longer the only thing standing between a deploy and a device seeing it.

On top of that, a page already open picks up a genuinely new service
worker on its own: it checks for one whenever it regains focus and hourly
while left open, and reloads itself once when a new one takes over
(`skipWaiting` + `clients.claim()`) — no manual refresh needed either way.
