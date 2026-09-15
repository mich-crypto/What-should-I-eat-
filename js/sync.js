// Household sync client — local-first.
//
// The rule this module follows: the UI never waits on the network. Every
// read the app does still comes from localStorage, so swaps stay instant
// and the whole app keeps working with no signal. Sync is a background
// reconcile on top: pull on open, push (debounced) after a change.
//
// That ordering matters. If the plan were read from the server, we'd undo
// the prefetch-pool work that made swapping instant, and the app would
// stop working in a supermarket basement — which is exactly where the
// shopping list is needed most.

const PUSH_DEBOUNCE_MS = 1500;

export const Sync = {
  /** Ask the Worker to mint a new household code. */
  async createHousehold(endpoint) {
    const res = await fetch(`${trimSlash(endpoint)}/api/household`, { method: "POST" });
    if (!res.ok) throw new Error(`Couldn't create household (${res.status})`);
    const { code } = await res.json();
    return code;
  },

  async pull(endpoint, code) {
    const res = await fetch(`${trimSlash(endpoint)}/api/household/${encodeURIComponent(code)}`);
    if (res.status === 404) throw new Error("That household code doesn't exist");
    if (!res.ok) throw new Error(`Sync pull failed (${res.status})`);
    const { doc } = await res.json();
    return doc;
  },

  async push(endpoint, code, doc) {
    const res = await fetch(`${trimSlash(endpoint)}/api/household/${encodeURIComponent(code)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    if (res.status === 404) throw new Error("That household code doesn't exist");
    if (!res.ok) throw new Error(`Sync push failed (${res.status})`);
    const { doc: merged } = await res.json();
    return merged; // the server's merged view, which may include the other phone's changes
  },
};

function trimSlash(s) {
  return (s || "").replace(/\/+$/, "");
}

/**
 * Debounced push. Rapid edits (ticking five things off in a row) collapse
 * into one request instead of five.
 */
export function makeDebouncedPush(fn) {
  let timer = null;
  let pending = false;
  return function schedule() {
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!pending) return;
      pending = false;
      try {
        await fn();
      } catch (err) {
        // Offline or the Worker is down — keep the local copy and try on
        // the next change. Never surface this as a blocking failure.
        console.warn("sync push deferred:", err.message);
      }
    }, PUSH_DEBOUNCE_MS);
  };
}

/** Settings that belong to the household rather than to one phone. API keys never sync. */
export function shareableSettings(settings) {
  const { spoonacularKey, geminiKey, syncEndpoint, householdCode, ...shared } = settings;
  return shared;
}
