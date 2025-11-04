// pages/api/marketplace/index.js
import Database from "better-sqlite3";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const {
    q = "",
    category = "",
    page = "1",
    pageSize = "24",
  } = req.query || {};

  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(60, Math.max(1, parseInt(pageSize, 10) || 24));
  const offset = (p - 1) * ps;

  const db = new Database("db/database.sqlite", { fileMustExist: true });
  try {
    // Build WHERE for collected items only, with optional filters
    const where = ["status = 'collected'"];
    const params = {};

    if (category) {
      where.push("category = @category");
      params.category = String(category);
    }
    if (q) {
      where.push("(LOWER(name) LIKE @q OR LOWER(category) LIKE @q)");
      params.q = `%${String(q).toLowerCase()}%`;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Count for pagination
    const total = db
      .prepare(`SELECT COUNT(*) as c FROM items ${whereSql}`)
      .get(params).c;

    // Fetch items (newest first)
    const items = db
      .prepare(
        `
        SELECT
          id, name, category, condition, status,
          image_url,
          collection_date, time_slot
        FROM items
        ${whereSql}
        ORDER BY id DESC
        LIMIT @ps OFFSET @offset
        `
      )
      .all({ ...params, ps, offset });

    // Category facets (counts) for quick filtering UI
    const facets = db
      .prepare(
        `
        SELECT category, COUNT(*) AS count
        FROM items
        WHERE status = 'collected'
        GROUP BY category
        ORDER BY category ASC
        `
      )
      .all();

    return res.status(200).json({
      ok: true,
      items,
      total,
      page: p,
      pageSize: ps,
      facets,
    });
  } catch (e) {
    console.error("marketplace api error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}