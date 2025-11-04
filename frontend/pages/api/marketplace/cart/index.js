// pages/api/caseworker/caseworker/cart/index.js
import Database from "better-sqlite3";
import { requireRole, getUserFromRequest } from "@/lib/auth";

export default function handler(req, res) {
  // Caseworker (or admin) can use this
  const user = requireRole(req, res, ["caseworker", "admin"]);
  if (!user) return;

  const db = new Database("db/database.sqlite");

  try {
    if (req.method === "GET") {
      // Cart = reservations made by this caseworker with status='reserved'
      const rows = db.prepare(
        `
        SELECT r.id            AS reservation_id,
               r.item_id       AS item_id,
               i.name          AS name,
               i.category      AS category,
               i.condition     AS condition,
               i.image_url     AS image_url
        FROM reservations r
        JOIN items i ON i.id = r.item_id
        WHERE r.status = 'reserved'
          AND r.caseworker_name = @cw
        ORDER BY r.id DESC
        `
      ).all({ cw: user.name });

      return res.status(200).json({ ok: true, items: rows });
    }

    if (req.method === "POST") {
      // Add to cart
      const { itemId } = req.body || {};
      if (!itemId) return res.status(400).json({ ok: false, error: "missing_item" });

      // Only allow items already collected (available for distribution)
      const it = db.prepare("SELECT id, status FROM items WHERE id = ?").get(itemId);
      if (!it) return res.status(404).json({ ok: false, error: "item_not_found" });
      if (it.status !== "collected")
        return res.status(400).json({ ok: false, error: "not_available" });

      // Prevent duplicates for the same caseworker
      const exists = db.prepare(
        `SELECT 1 FROM reservations WHERE item_id = ? AND status='reserved' AND caseworker_name = ?`
      ).get(itemId, user.name);
      if (exists) return res.status(200).json({ ok: true, already: true });

      db.prepare(
        `
        INSERT INTO reservations (item_id, caseworker_name, status)
        VALUES (@item_id, @cw, 'reserved')
        `
      ).run({ item_id: itemId, cw: user.name });

      return res.status(201).json({ ok: true });
    }

    if (req.method === "DELETE") {
      // Remove from cart
      const { reservationId } = req.query || {};
      if (!reservationId) return res.status(400).json({ ok: false, error: "missing_reservation" });

      // Ensure it belongs to this caseworker
      const r = db.prepare("SELECT id, caseworker_name FROM reservations WHERE id = ?").get(reservationId);
      if (!r) return res.status(404).json({ ok: false, error: "not_found" });
      if (r.caseworker_name !== user.name) return res.status(403).json({ ok: false, error: "forbidden" });

      db.prepare("DELETE FROM reservations WHERE id = ?").run(reservationId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error("caseworker cart api error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}