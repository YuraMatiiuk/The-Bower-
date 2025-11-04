// pages/api/admin/orders.js
import Database from "better-sqlite3";
import { requireAdmin } from "../../../lib/auth";

export default function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  const db = new Database("db/database.sqlite");
  try {
    if (req.method === "GET") {
      // list pending + confirmed (you can filter by ?status=pending)
      const { status = "" } = req.query || {};
      const where = [];
      const params = {};
      if (status) {
        where.push("o.status = @status");
        params.status = String(status);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const orders = db.prepare(
        `
        SELECT o.id, o.caseworker_id, o.status, o.created_at,
               u.name as caseworker_name, u.email as caseworker_email
        FROM orders o
        LEFT JOIN users u ON u.id = o.caseworker_id
        ${whereSql}
        ORDER BY o.id DESC
        `
      ).all(params);

      // Fetch items for each
      const itemsStmt = db.prepare(
        `
        SELECT oi.order_id, i.id as item_id, i.name, i.category, i.condition, i.image_url
        FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id = ?
        `
      );

      const metaStmt = db.prepare(
        `SELECT key, value FROM order_meta WHERE order_id = ?`
      );

      const out = orders.map((o) => {
        const items = itemsStmt.all(o.id);
        const metaRows = metaStmt.all(o.id);
        const meta = Object.fromEntries(metaRows.map(m => [m.key, m.value]));
        return { ...o, items, meta };
      });

      return res.status(200).json({ ok: true, orders: out });
    }

    if (req.method === "POST") {
      const { orderId, action } = req.body || {};
      if (!orderId || !action) return res.status(400).json({ ok: false, error: "missing_args" });

      if (action === "approve") {
        db.prepare(`UPDATE orders SET status='confirmed' WHERE id = ?`).run(orderId);
        return res.status(200).json({ ok: true });
      }
      // (Optional) Add "reject": requires expanding orders.status enum to include 'rejected'
      return res.status(400).json({ ok: false, error: "unsupported_action" });
    }

    return res.status(405).end();
  } catch (e) {
    console.error("admin orders error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}