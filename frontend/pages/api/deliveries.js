import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

function getUserName(req, res) {
  try {
    const token = req.cookies?.auth;
    if (!token) return null;
    const payload = jwt.verify(token, SECRET);
    return payload?.name || null; // we store caseworker_name on reservations
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  if (req.method === "GET") {
    // Return this caseworker's RESERVED items that do not yet have a scheduled delivery
    const caseworkerName = getUserName(req, res);
    if (!caseworkerName) return res.status(401).json({ error: "Not authenticated" });

    try {
      const rows = db.prepare(`
        SELECT 
          r.id AS reservation_id,
          i.id AS item_id,
          i.name AS item_name,
          i.category,
          i.condition,
          r.status AS reservation_status
        FROM reservations r
        JOIN items i ON r.item_id = i.id
        LEFT JOIN deliveries d ON d.reservation_id = r.id
        WHERE r.caseworker_name = ?
          AND r.status = 'reserved'
          AND d.id IS NULL
        ORDER BY r.id DESC
      `).all(caseworkerName);

      return res.status(200).json(rows);
    } catch (err) {
      console.error("❌ Deliveries GET error:", err.message);
      return res.status(500).json({ error: "Failed to fetch deliverables" });
    }
  }

  if (req.method === "POST") {
    // Schedule a delivery for a reservation
    const caseworkerName = getUserName(req, res);
    if (!caseworkerName) return res.status(401).json({ error: "Not authenticated" });

    const { reservationId, itemId, deliveryDate, timeSlot } = req.body || {};
    if (!reservationId || !itemId || !deliveryDate || !timeSlot) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      // Ensure the reservation belongs to this caseworker and is still reserved
      const r = db.prepare(`
        SELECT r.id
        FROM reservations r
        WHERE r.id = ? AND r.item_id = ? AND r.caseworker_name = ? AND r.status = 'reserved'
      `).get(reservationId, itemId, caseworkerName);

      if (!r) return res.status(403).json({ error: "Reservation not found or not yours" });

      // Ensure there isn't already a delivery
      const existing = db.prepare("SELECT id FROM deliveries WHERE reservation_id = ?").get(reservationId);
      if (existing) return res.status(400).json({ error: "Delivery already scheduled for this reservation" });

      db.prepare(`
        INSERT INTO deliveries (item_id, reservation_id, delivery_date, time_slot, status)
        VALUES (?, ?, ?, ?, 'scheduled')
      `).run(itemId, reservationId, deliveryDate, timeSlot);

      return res.status(200).json({ message: "Delivery scheduled" });
    } catch (err) {
      console.error("❌ Deliveries POST error:", err.message);
      return res.status(500).json({ error: "Failed to schedule delivery" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}