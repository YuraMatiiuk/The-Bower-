// pages/api/collections/bulk.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

function getUserId(req) {
  try {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/(?:^|;\s*)auth=([^;]+)/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const payload = jwt.verify(token, SECRET);
    return payload?.id || null;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { itemIds, date, time_slot } = req.body || {};
  if (!Array.isArray(itemIds) || itemIds.length === 0 || !date || !time_slot) {
    return res.status(400).json({ error: "Missing itemIds, date, or time_slot" });
  }

  try {
    const donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
    if (!donor) return res.status(400).json({ error: "Donor profile not found" });

    const getItem = db.prepare(`
      SELECT id, donor_id, status
      FROM items
      WHERE id = ?
    `);

    const hasActiveBooking = db.prepare(`
      SELECT 1
      FROM bookings
      WHERE item_id = ?
        AND type = 'collection'
        AND status IN ('pending','confirmed')
      LIMIT 1
    `);

    const insertBooking = db.prepare(`
      INSERT INTO bookings (item_id, type, scheduled_date, time_slot, status)
      VALUES (?, 'collection', ?, ?, 'pending')
    `);

    // IMPORTANT: do NOT change status here (keeps 'approved' to satisfy CHECK)
    const updateItem = db.prepare(`
      UPDATE items
      SET collection_date = ?, time_slot = ?
      WHERE id = ?
    `);

    const results = [];
    const tx = db.transaction((ids) => {
      for (const id of ids) {
        const item = getItem.get(id);
        if (!item || item.donor_id !== donor.id) {
          results.push({ itemId: id, ok: false, error: "not_found_or_not_owner" });
          continue;
        }
        if (item.status !== "approved") {
          results.push({ itemId: id, ok: false, error: "not_approved" });
          continue;
        }
        const booked = hasActiveBooking.get(id);
        if (booked) {
          results.push({ itemId: id, ok: false, error: "already_booked" });
          continue;
        }

        const ins = insertBooking.run(id, String(date), String(time_slot));
        updateItem.run(String(date), String(time_slot), id);
        results.push({ itemId: id, ok: true, bookingId: ins.lastInsertRowid });
      }
    });

    tx(itemIds);

    const okCount = results.filter(r => r.ok).length;
    const failCount = results.length - okCount;
    return res.status(201).json({
      message: `Created ${okCount} booking(s), ${failCount} failed`,
      results,
    });
  } catch (e) {
    console.error("❌ POST /api/collections/bulk error:", e);
    return res.status(500).json({ error: "Failed to create bookings" });
  }
}