// Cloudflare Worker: household sync for What Should I Eat.
//
// Two endpoints and one table. The app stays local-first — phones read and
// write their own localStorage and never wait on this — so all the Worker
// does is let devices in the same household reconcile.
//
// On auth: the household code IS the credential. There are no accounts,
// no passwords, no email. That's a deliberate trade for a family shopping
// list: a code is ~59 bits of randomness, which is not guessable by brute
// force at any sane request rate, but it is also *not* real authentication
// — anyone who has the code has the data, and it can't be revoked without
// changing the code on every device. Appropriate for a meal plan; do not
// reuse this pattern for anything sensitive.

import { mergeDocuments, generateHouseholdCode, CODE_PATTERN } from "./sync-merge.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });

// A household document is small (a plan plus the ~42 recipes it points at),
// but cap it so one misbehaving client can't fill the table.
const MAX_DOC_BYTES = 512 * 1024;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["api","household",":code"]

    if (parts[0] !== "api" || parts[1] !== "household") {
      return json({ error: "not found" }, 404);
    }

    // POST /api/household -> mint a new household code
    if (parts.length === 2 && request.method === "POST") {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      const code = generateHouseholdCode(bytes);
      await env.DB.prepare(
        "INSERT INTO households (code, doc, updated_at) VALUES (?, ?, ?)"
      )
        .bind(code, JSON.stringify({ updatedAt: 0 }), Date.now())
        .run();
      return json({ code });
    }

    const code = (parts[2] || "").toUpperCase();
    if (!CODE_PATTERN.test(code)) return json({ error: "bad household code" }, 400);

    if (request.method === "GET") {
      const row = await env.DB.prepare("SELECT doc, updated_at FROM households WHERE code = ?")
        .bind(code)
        .first();
      if (!row) return json({ error: "unknown household" }, 404);
      return json({ doc: JSON.parse(row.doc), updatedAt: row.updated_at });
    }

    if (request.method === "PUT") {
      const raw = await request.text();
      if (raw.length > MAX_DOC_BYTES) return json({ error: "document too large" }, 413);

      let incoming;
      try {
        incoming = JSON.parse(raw);
      } catch {
        return json({ error: "invalid JSON" }, 400);
      }

      const row = await env.DB.prepare("SELECT doc FROM households WHERE code = ?")
        .bind(code)
        .first();
      if (!row) return json({ error: "unknown household" }, 404);

      // Merge rather than overwrite, so a phone that's been offline can't
      // clobber changes the other one made in the meantime.
      const merged = mergeDocuments(JSON.parse(row.doc), incoming);
      await env.DB.prepare("UPDATE households SET doc = ?, updated_at = ? WHERE code = ?")
        .bind(JSON.stringify(merged), Date.now(), code)
        .run();

      return json({ doc: merged });
    }

    return json({ error: "method not allowed" }, 405);
  },
};
