// pages/api/collections/eligible.js
import Database from "better-sqlite3";
import { requireLoggedIn, requireAdmin } from "../../lib/auth"; // adjust path if needed

/**
 * GET /api/collections/eligible
 *   - default (no query): donor-scoped (only this user's approved & unscheduled items)
 *   - ?scope=all : admin-only, returns ALL approved & unscheduled items (any donor)
 */
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const scope = String(req.query.scope || "mine");
  const db = new Database("db/database.sqlite");

  try {
    if (scope === "all") {
      // Admin-only view: all approved + not yet scheduled
      const admin = requireAdmin(req, res);
      if (!admin) return;

      const rows = db.prepare(`
        SELECT i.id, i.name, i.category, i.condition, i.image_url,
               d.name  AS donor_name,
               d.email AS donor_email
        FROM items i
        JOIN donors d ON d.id = i.donor_id
        WHERE i.status = 'approved'
          AND (i.collection_date IS NULL OR TRIM(i.collection_date) = '')
        ORDER BY i.id DESC
      `).all();

      console.log("[eligible:all] count=", rows.length);
      return res.status(200).json({ items: rows, scope: "all" });
    }

    // Default: donor-scoped
    const me = requireLoggedIn(req, res);
    if (!me) return;

    const rows = db.prepare(`
      SELECT i.id, i.name, i.category, i.condition, i.image_url
      FROM items i
      JOIN donors d ON d.id = i.donor_id
      WHERE i.status = 'approved'
        AND (i.collection_date IS NULL OR TRIM(i.collection_date) = '')
        AND (
          d.user_id = @uid
          OR LOWER(TRIM(COALESCE(d.email,''))) = LOWER(TRIM(@email))
        )
      ORDER BY i.id DESC
    `).all({ uid: me.id, email: me.email });

    console.log("[eligible:mine]", me.email, "count=", rows.length);
    return res.status(200).json({ items: rows, scope: "mine" });
  } catch (e) {
    console.error("eligible error:", e);
    return res.status(500).json({ error: "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}