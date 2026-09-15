// Merge logic for household sync, kept as a pure function so it can be
// unit-tested without a Worker runtime or a live D1 database.
//
// Conflict model, and why it's shaped this way:
//
// Two phones in one household edit different things at different times,
// usually not simultaneously. So most fields use plain last-write-wins on
// the whole document — simple, predictable, and good enough.
//
// The exception is `shoppingChecked`. That one genuinely does get edited
// at the same time (both of you in the shop, ticking things off), and
// whole-document LWW would silently throw away one person's ticks. So it
// merges per item, keeping the most recent change to each item
// individually. Ticking and unticking both carry a timestamp, so an
// untick can undo a tick and vice versa — whichever happened last wins,
// per item rather than per document.

/** Per-item last-write-wins for the shopping checkboxes. */
export function mergeShoppingChecked(mine = {}, theirs = {}) {
  const out = {};
  for (const key of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    const a = normalizeCheck(mine[key]);
    const b = normalizeCheck(theirs[key]);
    if (!a) { out[key] = b; continue; }
    if (!b) { out[key] = a; continue; }
    out[key] = a.at >= b.at ? a : b;
  }
  // Drop entries that ended up unchecked — no need to sync dead weight.
  for (const key of Object.keys(out)) {
    if (!out[key] || !out[key].checked) delete out[key];
  }
  return out;
}

/**
 * Accepts either the modern {checked, at} shape or a bare boolean from an
 * older client, so a device that hasn't updated yet can't corrupt the doc.
 */
function normalizeCheck(v) {
  if (v == null) return null;
  if (typeof v === "boolean") return v ? { checked: true, at: 0 } : null;
  if (typeof v === "object" && typeof v.at === "number") {
    return { checked: !!v.checked, at: v.at };
  }
  return null;
}

const EMPTY_DOC = {
  plan: null,
  planRecipes: [],
  prefs: {},
  shoppingChecked: {},
  settings: null,
  updatedAt: 0,
};

/**
 * Merge an incoming document from one device into the stored one.
 * `incoming.updatedAt` decides the winner for the whole-document fields.
 */
export function mergeDocuments(stored, incoming) {
  const base = { ...EMPTY_DOC, ...(stored || {}) };
  const next = { ...EMPTY_DOC, ...(incoming || {}) };
  const incomingIsNewer = (next.updatedAt || 0) >= (base.updatedAt || 0);

  // Whichever side is newer supplies the plan — and the recipes it
  // references travel with it, so the other phone can actually render the
  // plan instead of falling back to built-in recipes it never chose.
  const winner = incomingIsNewer ? next : base;

  return {
    plan: winner.plan,
    planRecipes: winner.planRecipes || [],
    prefs: { ...base.prefs, ...next.prefs }, // likes are additive; a like on either phone counts
    shoppingChecked: mergeShoppingChecked(base.shoppingChecked, next.shoppingChecked),
    settings: winner.settings,
    updatedAt: Math.max(base.updatedAt || 0, next.updatedAt || 0),
  };
}

/** Household codes: readable, typeable, and unguessable enough for a shopping list. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O/0, I/1/L — misread too easily
export function generateHouseholdCode(randomBytes) {
  const groups = [];
  let i = 0;
  for (let g = 0; g < 3; g++) {
    let s = "";
    for (let c = 0; c < 4; c++) s += CODE_ALPHABET[randomBytes[i++] % CODE_ALPHABET.length];
    groups.push(s);
  }
  return groups.join("-"); // e.g. 7K2P-9XQF-3RTB  (~59 bits)
}

export const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
