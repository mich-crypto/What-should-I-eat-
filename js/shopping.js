import { recipeById } from "./data.js";

const CATEGORY_ORDER = [
  "Produce",
  "Meat",
  "Fish",
  "Dairy",
  "Bakery",
  "Grains",
  "Pantry",
];

// ------------------------------------------------------------------ units
//
// Recipes come from four sources with four different idea of what a unit is:
// the built-in catalog is tidy metric, Spoonacular reports metric short
// forms (sometimes an empty string), TheMealDB hands over whatever the
// original author typed ("1 cup", "2 tbs", "to taste"), and Gemini is asked
// for metric but improvises. Two rows for the same thing in different units
// is the same bug as two rows for the same name, so units that *are*
// convertible get converted to one base and summed.
//
// factor = how many base units (g for mass, ml for volume) one of these is.
const UNIT_DEFS = {
  // mass -> g
  g: { cls: "mass", factor: 1 },
  kg: { cls: "mass", factor: 1000 },
  mg: { cls: "mass", factor: 0.001 },
  oz: { cls: "mass", factor: 28.35 },
  lb: { cls: "mass", factor: 453.6 },
  // volume -> ml
  ml: { cls: "volume", factor: 1 },
  cl: { cls: "volume", factor: 10 },
  dl: { cls: "volume", factor: 100 },
  l: { cls: "volume", factor: 1000 },
  tsp: { cls: "volume", factor: 5 },
  tbsp: { cls: "volume", factor: 15 },
  cup: { cls: "volume", factor: 240 },
  "fl oz": { cls: "volume", factor: 29.6 },
};

// Spelling variants, plurals and abbreviations, mapped onto the canonical
// unit names above (or onto a countable unit, which stays as-is).
const UNIT_SYNONYMS = {
  gram: "g", grams: "g", gramme: "g", grammes: "g", gr: "g", grs: "g",
  kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg", kgs: "kg",
  milligram: "mg", milligrams: "mg",
  ounce: "oz", ounces: "oz", ozs: "oz",
  pound: "lb", pounds: "lb", lbs: "lb",
  milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml", mls: "ml",
  centiliter: "cl", centilitre: "cl",
  deciliter: "dl", decilitre: "dl",
  liter: "l", liters: "l", litre: "l", litres: "l", ltr: "l",
  teaspoon: "tsp", teaspoons: "tsp", tsps: "tsp", tspn: "tsp", "t.": "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp", tblsp: "tbsp", "t.b.s": "tbsp",
  cups: "cup",
  "fluid ounce": "fl oz", "fluid ounces": "fl oz", floz: "fl oz", "fl. oz": "fl oz", "fl. oz.": "fl oz",
  // countables: no conversion, just one spelling
  piece: "pc", pieces: "pc", pcs: "pc", pce: "pc", "": "pc", whole: "pc",
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
  can: "can", cans: "can", tin: "can", tins: "can",
  jar: "jar", jars: "jar",
  pack: "pack", packs: "pack", packet: "pack", packets: "pack",
  bunch: "bunch", bunches: "bunch",
  sprig: "sprig", sprigs: "sprig",
  stalk: "stalk", stalks: "stalk", stick: "stalk", sticks: "stalk",
  head: "head", heads: "head",
  fillet: "fillet", fillets: "fillet",
  handful: "handful", handfuls: "handful", handfull: "handful", handfulls: "handful",
  pinch: "pinch", pinches: "pinch",
  dash: "pinch", dashes: "pinch",
  // "salt to taste" isn't a quantity at all; see formatAmount
  "to taste": "to taste", "as needed": "to taste", "as required": "to taste",
  taste: "to taste", garnish: "to taste", "for garnish": "to taste",
  "to serve": "to taste", "for serving": "to taste",
};

// ------------------------------------------------------------------ names
//
// Words that describe how an ingredient was *prepared or picked*, not what
// you put in the basket: "2 large ripe tomatoes, finely chopped" and
// "tomatoes" are one line on a shopping list. Anything that changes which
// product you buy (ground, smoked, dried, canned, frozen, whole-milk...)
// is deliberately NOT in here.
const NOISE_WORDS = new Set([
  "fresh", "freshly", "raw", "ripe", "organic", "quality", "good", "best",
  "large", "small", "medium", "big", "extra", "virgin", "pure",
  "chopped", "finely", "coarsely", "roughly", "thinly", "thickly",
  "diced", "minced", "sliced", "shredded", "grated", "crushed", "cubed",
  "halved", "quartered", "trimmed", "peeled", "deseeded", "seeded", "pitted",
  "drained", "rinsed", "washed", "divided", "optional", "plus", "needed",
  "packed", "level", "heaped", "approx", "about", "cold", "warm", "hot",
  "room", "temperature", "your", "choice", "any",
  // grammatical filler: "leaves of basil" is "basil leaves"
  "of", "the", "a", "an",
]);

// Multi-word phrases that have to go before the string is split into words,
// either because they're noise as a phrase ("all-purpose" flour is just
// flour on a list) or because the words mean something different apart.
const PHRASE_FIXES = [
  // "minced beef" is the product you buy as ground beef, not beef with a
  // prep note — without this, "minced" is dropped as a prep word and the
  // two land on the same row as a beef joint.
  [/\bminced?\s+(beef|pork|lamb|veal|chicken|turkey|meat)\b/g, "ground $1"],
  [/\bmince\b(?!d)/g, "ground beef"],
  [/\ball[-\s]?purpose\b/g, ""],
  [/\bplain\s+(?=flour\b)/g, ""],
  [/\bfree[-\s]?range\b/g, ""],
  [/\bto\s+taste\b/g, ""],
  [/\bfor\s+(garnish|serving|drizzling|frying|greasing)\b/g, ""],
  [/\bat\s+room\s+temperature\b/g, ""],
];

// Same ingredient, different shopping culture. Mapped onto whichever
// spelling the built-in catalog uses, so web recipes line up with it.
const NAME_SYNONYMS = {
  scallion: "spring onion",
  scallions: "spring onion",
  cilantro: "coriander",
  aubergine: "eggplant",
  courgette: "zucchini",
  garbanzo: "chickpea",
  capsicum: "pepper",
  passata: "tomato",
  rocket: "arugula",
  prawn: "shrimp",
  prawns: "shrimp",
  mince: "ground beef",
};

// TheMealDB's measure column is free text, so it arrives carrying size and
// prep words instead of units: "1 large", "2 cloves minced", "200g chopped".
// These are all just "one of the thing".
const SIZE_UNITS = new Set(["large", "small", "medium", "big", "whole", "half", "quarter", "few", "some"]);

function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * English plural -> singular, ordered longest-rule-first. Deliberately
 * conservative: a word it doesn't recognize comes back untouched, because a
 * wrong singular invents a *new* key and splits a row rather than merging
 * one (the exact bug this is here to fix).
 */
const F_PLURALS = new Set([
  "leaves", "halves", "knives", "loaves", "shelves", "wolves", "calves", "lives", "hooves",
]);

function singular(word) {
  if (word.length <= 3) return word;
  if (/(ss|us|is|os|as)$/.test(word)) return word; // glass, hummus, basis
  if (/ies$/.test(word)) return word.slice(0, -3) + "y"; // berries -> berry
  if (/oes$/.test(word)) return word.slice(0, -2); // tomatoes -> tomato
  // "leaves" -> "leaf" but "cloves" -> "clove": only the handful of words
  // that really do swap f/v get the -f treatment.
  if (/ves$/.test(word)) {
    const stem = word.slice(0, -3);
    return F_PLURALS.has(word) ? stem + "f" : stem + "ve";
  }
  if (/(ch|sh|x|z)es$/.test(word)) return word.slice(0, -2); // dishes -> dish
  if (/s$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * The string two spellings of one ingredient have to agree on.
 *
 * "Water" / "water" / "Cold water, divided" / "2 cups water (room
 * temperature)" all reduce to "water". Tokens are sorted, so word order
 * stops mattering too ("oil, olive" == "olive oil").
 */
export function canonicalName(rawName) {
  let s = stripAccents(String(rawName || "")).toLowerCase();
  s = s.replace(/\([^)]*\)/g, " "); // drop parenthetical notes
  // Commas separate words, they don't end the name: truncating here turned
  // "oil, olive" into plain "oil". The prep/size words that usually follow a
  // comma ("olive oil, extra virgin") are dropped by NOISE_WORDS below
  // instead, which leaves the real words in whichever order they came.
  s = s.replace(/[,;]/g, " ");
  PHRASE_FIXES.forEach(([re, to]) => { s = s.replace(re, to); });
  s = s.replace(/[^a-z\s-]/g, " ").replace(/-/g, " ");

  const words = s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => NAME_SYNONYMS[w] || w)
    .join(" ")
    .split(/\s+/)
    .map(singular)
    .filter((w) => w && !NOISE_WORDS.has(w));

  // Everything was noise ("fresh, to taste") — fall back to the plain
  // lowercased name rather than collapsing unrelated items into one key.
  if (words.length === 0) return s.trim().replace(/\s+/g, " ") || "item";
  return words.sort().join(" ");
}

function resolveUnit(u) {
  // A countable ("clove", "handful") only ever appears in UNIT_SYNONYMS —
  // UNIT_DEFS holds the convertible units — so check the synonym table
  // first or countables come back unrecognized.
  if (UNIT_SYNONYMS[u] !== undefined) return UNIT_SYNONYMS[u];
  if (UNIT_DEFS[u]) return u;
  return null;
}

/** Canonical unit name, then its conversion class and factor. */
export function canonicalUnit(rawUnit) {
  let u = stripAccents(String(rawUnit ?? "")).toLowerCase().trim();
  u = u.replace(/\([^)]*\)/g, " ").replace(/\.$/, "").replace(/[,;]/g, " ").replace(/\s+/g, " ").trim();

  let unit = resolveUnit(u);

  // Not a unit on its own — dig a real one out of the free text, so
  // "2 cloves minced" measures in cloves and "200g chopped" in grams
  // instead of each becoming its own uncountable row.
  if (!unit) {
    const words = u.split(" ").filter(Boolean);
    for (let i = 0; i < words.length && !unit; i++) {
      unit = resolveUnit(`${words[i]} ${words[i + 1] ?? ""}`.trim()) || resolveUnit(words[i]);
    }
    if (!unit && words.some((w) => SIZE_UNITS.has(w))) unit = "pc";
    if (!unit && /taste|needed|required|serve|serving|garnish/.test(u)) unit = "to taste";
  }

  // No unit anywhere in the text ("juice of 2", "a sachet"): count it as a
  // plain item rather than inventing a one-off unit, which would show up as
  // its own row next to the same ingredient measured normally.
  if (!unit) unit = "pc";

  const def = UNIT_DEFS[unit];
  if (def) return { unit, cls: def.cls, factor: def.factor };
  if (unit === "to taste") return { unit, cls: "taste", factor: 1 };
  // Still unrecognized (a "sachet", a "sheet"): treated as a countable of
  // its own kind — it merges with itself, it just can't be converted.
  return { unit, cls: `count:${unit}`, factor: 1 };
}

/** The merge key: same ingredient, same measurable dimension. */
export function ingredientKey(name, unit) {
  return `${canonicalName(name)}|${canonicalUnit(unit).cls}`;
}

const PLURAL_DISPLAY = {
  cup: "cups", clove: "cloves", slice: "slices", can: "cans", jar: "jars",
  pack: "packs", bunch: "bunches", sprig: "sprigs", stalk: "stalks",
  head: "heads", fillet: "fillets", handful: "handfuls", pinch: "pinches",
};

function round(n) {
  if (n >= 10) return Math.round(n);
  return Math.round(n * 10) / 10;
}

/**
 * Turn a summed base quantity back into something you'd write on a list,
 * in whichever unit the recipes themselves mostly used — so a teaspoon of
 * spice stays teaspoons instead of becoming 5 ml, while 1200 g of potatoes
 * reads as 1.2 kg.
 */
export function formatAmount(baseQty, cls, unitCounts) {
  if (cls === "taste") return { qty: null, unit: "to taste", text: "to taste" };

  // Most-used original unit wins; ties go to the smaller one so the number
  // stays readable ("3 tsp", not "0.06 cup").
  let unit = null;
  let bestCount = -1;
  for (const [u, count] of unitCounts) {
    const factor = UNIT_DEFS[u]?.factor ?? 1;
    const bestFactor = unit ? UNIT_DEFS[unit]?.factor ?? 1 : Infinity;
    if (count > bestCount || (count === bestCount && factor < bestFactor)) {
      unit = u;
      bestCount = count;
    }
  }

  let factor = UNIT_DEFS[unit]?.factor ?? 1;
  let qty = baseQty / factor;
  // Scale up rather than print four digits.
  if (cls === "mass" && baseQty >= 1000) { unit = "kg"; qty = baseQty / 1000; }
  else if (cls === "volume" && baseQty >= 1000 && (unit === "ml" || unit === "cl" || unit === "dl")) {
    unit = "l";
    qty = baseQty / 1000;
  }

  const countable = cls.startsWith("count:");
  // You can't buy 1.8 avocados. Whole things round up — scaling a recipe to
  // an odd household size otherwise leaves fractions all over the list.
  qty = countable ? Math.ceil(qty - 0.01) || 1 : round(qty);
  // "4 stalks", not "4 stalk". Abbreviations (g, ml, tsp) never pluralize.
  const label = qty > 1 ? PLURAL_DISPLAY[unit] || unit : unit;
  const text = countable && unit === "pc" ? `${qty}` : `${qty} ${label}`;
  return { qty, unit, text };
}

/**
 * Combine every ingredient across the plan into one shopping list, scaled
 * by household size.
 *
 * Merging is done on a canonical form of the name plus the unit's
 * conversion class, so "Water"/"water", "2 Large Tomatoes, diced"/"tomato"
 * and "500 ml"/"2 cups" all land on one row instead of several. Items that
 * appear in more than one recipe are flagged so the "efficiency" benefit is
 * visible.
 */
export function buildShoppingList(plan, persons) {
  const map = new Map(); // ingredientKey -> accumulator

  plan.days.forEach((day) => {
    ["breakfast", "lunch", "dinner"].forEach((meal) => {
      const slot = day[meal];
      if (!slot) return;
      const recipe = recipeById(slot.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach((ing) => {
        const { unit, cls, factor } = canonicalUnit(ing.unit);
        const key = `${canonicalName(ing.name)}|${cls}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            cls,
            base: 0,
            unitCounts: new Map(),
            names: new Map(),
            categories: new Map(),
            recipes: new Set(),
          });
        }
        const entry = map.get(key);
        const qty = Number(ing.qty) > 0 ? Number(ing.qty) : 1;
        entry.base += qty * persons * factor;
        entry.unitCounts.set(unit, (entry.unitCounts.get(unit) || 0) + 1);
        // Which spelling to *show* is a vote, not first-past-the-post: the
        // wording most recipes use wins, so the label doesn't flip around
        // as meals get swapped.
        const label = String(ing.name || "").trim();
        if (label) entry.names.set(label, (entry.names.get(label) || 0) + 1);
        if (ing.category) entry.categories.set(ing.category, (entry.categories.get(ing.category) || 0) + 1);
        entry.recipes.add(recipe.title);
      });
    });
  });

  foldTasteRows(map);

  const items = Array.from(map.values()).map((entry) => {
    const amount = formatAmount(entry.base, entry.cls, entry.unitCounts);
    return {
      key: entry.key,
      name: pickLabel(entry.names),
      unit: amount.unit,
      qty: amount.qty,
      amount: amount.text,
      category: pickMostCommon(entry.categories) || "Pantry",
      recipeCount: entry.recipes.size,
      recipes: Array.from(entry.recipes),
    };
  });

  items.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });

  const grouped = {};
  items.forEach((item) => {
    grouped[item.category] = grouped[item.category] || [];
    grouped[item.category].push(item);
  });

  const reusedCount = items.filter((i) => i.recipeCount > 1).length;

  return { items, grouped, reusedCount, totalItems: items.length };
}

/**
 * "Salt, to taste" is not a second kind of salt.
 *
 * A measure like "to taste" carries no quantity, so it can't be summed with
 * grams or teaspoons and lands in its own class. When some other recipe
 * *does* measure the same ingredient, that row already covers the shopping
 * trip, so the to-taste row is dropped into it — otherwise the list shows
 * "Salt 2 tsp" and "Salt to taste" as two things to buy.
 */
function foldTasteRows(map) {
  const measuredByName = new Map();
  for (const entry of map.values()) {
    if (entry.cls === "taste") continue;
    const name = entry.key.split("|")[0];
    const best = measuredByName.get(name);
    if (!best || entry.recipes.size > best.recipes.size) measuredByName.set(name, entry);
  }
  for (const [key, entry] of map) {
    if (entry.cls !== "taste") continue;
    const target = measuredByName.get(entry.key.split("|")[0]);
    if (!target) continue;
    // Keep the reuse count honest: those recipes really do use it.
    entry.recipes.forEach((title) => target.recipes.add(title));
    entry.names.forEach((count, name) => target.names.set(name, (target.names.get(name) || 0) + count));
    map.delete(key);
  }
}

/** Most-used spelling; ties go to the shortest, which is the plainest. */
function pickLabel(names) {
  let best = null;
  let bestCount = -1;
  for (const [name, count] of names) {
    if (count > bestCount || (count === bestCount && name.length < best.length)) {
      best = name;
      bestCount = count;
    }
  }
  return best || "Ingredient";
}

function pickMostCommon(counts) {
  let best = null;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) { best = value; bestCount = count; }
  }
  return best;
}
