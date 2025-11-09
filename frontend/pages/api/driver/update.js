// pages/api/driver/update.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

// pick the first non-empty key from an object
function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const body = req.body || {};

    // Accept ANY of these: collection_id | collectionId | collections_id | id
    const idRaw = pick(body, "collection_id", "collectionId", "collections_id", "id");
    const collectionId = Number(idRaw);

    // Accept status OR action; map action → status
    // (keep your old buttons working: "Delivered" → "completed", "Not_Delivered" → "rejected")
    const statusRaw = String(pick(body, "status", "action") || "").toLowerCase().trim();
    const status =
      statusRaw === "Delivered" ? "completed" :
      statusRaw === "Not_Delivered"   ? "rejected"  :
      statusRaw; // use provided value if already a status like 'scheduled', 'completed', etc.

    const driverNotes = pick(body, "driver_notes", "driverNotes", "notes");

    if (!Number.isFinite(collectionId) || collectionId <= 0) {
      return res.status(400).json({ error: "Missing or invalid collection_id/collectionId" });
    }
    if (!status) {
      return res.status(400).json({ error: "Missing required field: status (or action)" });
    }

    const exists = db.prepare("SELECT id FROM collections WHERE id = ?").get(collectionId);
    if (!exists) {
      return res.status(404).json({ error: `Collection ${collectionId} not found` });
    }

    const result = db.prepare(`
      UPDATE collections
      SET status = ?, driver_notes = COALESCE(?, driver_notes)
      WHERE id = ?
    `).run(status, driverNotes ?? null, collectionId);

    if (result.changes === 0) {
      return res.status(400).json({ error: "No changes made" });
    }

    return res.status(200).json({
      ok: true,
      id: collectionId,
      new_status: status,
      notes: driverNotes ?? null,
      message: "Pickup updated successfully",
    });
  } catch (e) {
    console.error("❌ Error updating pickup:", e);
    return res.status(500).json({ error: "Failed to update pickup", details: String(e?.message || e) });
  }
}