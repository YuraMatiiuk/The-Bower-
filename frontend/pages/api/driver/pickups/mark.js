// pages/api/driver/pickups/mark.js
import Database from "better-sqlite3";
import { requireRole } from "../../../../lib/auth"; // or import { requireDriver }

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Allow drivers and admins
  const me = requireRole(req, res, ["driver", "admin"]); // or: const me = requireDriver(req, res);
  if (!me) return; // 401/403 already sent

  const { itemId, bookingId, action, reason } = req.body || {};
  if (!itemId || !bookingId || !action) {
    return res.status(400).json({ error: "missing_fields" });
  }

  // Only these actions supported
  const A_COLLECT = "collected";
  const A_REJECT  = "rejected";
  const A_CANCEL  = "cancelled";
  if (![A_COLLECT, A_REJECT, A_CANCEL].includes(action)) {
    return res.status(400).json({ error: "invalid_action" });
  }

  const db = new Database("db/database.sqlite");
  try {
    const tx = db.transaction(() => {
      // Verify booking belongs to item and is a collection
      const b = db
        .prepare(`SELECT id, item_id, type, status FROM bookings WHERE id = ? AND item_id = ? AND type = 'collection'`)
        .get(Number(bookingId), Number(itemId));
      if (!b) {
        throw Object.assign(new Error("not_found"), { httpCode: 404 });
      }

      if (action === A_COLLECT) {
        // items.status -> 'collected'; bookings.status -> 'completed'
        db.prepare(`UPDATE items SET status = 'collected' WHERE id = ?`).run(Number(itemId));
        db.prepare(`UPDATE bookings SET status = 'completed' WHERE id = ?`).run(Number(bookingId));
      } else if (action === A_REJECT) {
        // items.status -> 'rejected', clear collection slot; booking -> 'cancelled'
        db.prepare(`UPDATE items SET status = 'rejected', collection_date = NULL, time_slot = NULL WHERE id = ?`)
          .run(Number(itemId));
        db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(Number(bookingId));
        // If you later add a notes table/column, persist `reason` there.
      } else if (action === A_CANCEL) {
        // booking cancelled; keep item approved so it can be rebooked
        db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(Number(bookingId));
        db.prepare(`UPDATE items SET collection_date = NULL, time_slot = NULL WHERE id = ?`).run(Number(itemId));
      }
    });

    tx();
    return res.status(200).json({ ok: true });
  } catch (e) {
    const status = e.httpCode || 500;
    console.error("pickup mark error:", e);
    return res.status(status).json({ error: status === 404 ? "not_found" : "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}