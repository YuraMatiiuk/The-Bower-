// pages/api/marketplace/checkout.js
import Database from "better-sqlite3";
import { requireRole } from "../../../lib/auth";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const me = requireRole(req, res, ["caseworker", "admin"]);
  if (!me) return;

  const {
    cart,
    delivery_name,
    delivery_phone,
    delivery_address,
    delivery_suburb = "",
    delivery_postcode,
    delivery_notes = ""
  } = req.body || {};

  // --- TEMP DEV DEBUG (remove later) ---
  if (process.env.NODE_ENV !== "production") {
    try { console.log("checkout payload:", JSON.stringify(req.body)); } catch {}
  }

  // Normalize cart into a clean array of numeric IDs
  const cartIds = Array.isArray(cart)
    ? cart
        .map((x) => {
          if (x == null) return null;
          if (typeof x === "number") return x;
          if (typeof x === "string") return Number(x);
          if (typeof x === "object" && x.id != null) return Number(x.id);
          return null;
        })
        .filter((n) => Number.isFinite(n))
    : [];

  // Dedupe
  const uniqueCartIds = [...new Set(cartIds)];

  if (uniqueCartIds.length === 0) {
    return res.status(400).json({ ok: false, error: "empty_cart" });
  }
  if (!delivery_name || !delivery_phone || !delivery_address || !delivery_postcode) {
    return res.status(400).json({ ok: false, error: "missing_delivery_fields" });
  }

  const db = new Database("db/database.sqlite");

  // Helpers
  const getItems = db.prepare(`
    SELECT id, name, status
    FROM items
    WHERE id IN (${uniqueCartIds.map(() => "?").join(",")})
  `);
  const insertOrder = db.prepare(`
    INSERT INTO orders (caseworker_id, created_at, status)
    VALUES (?, datetime('now'), 'pending')
  `);
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, item_id) VALUES (?, ?)
  `);
  const insertMeta = db.prepare(`
    INSERT INTO order_meta (order_id, key, value) VALUES (?, ?, ?)
  `);
  const markReserved = db.prepare(`
    UPDATE items SET status='reserved' WHERE id = ?
  `);

  try {
    // Ensure meta table exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS order_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id)
      )
    `).run();

    // Load and validate
    const items = getItems.all(...uniqueCartIds);
    if (items.length !== uniqueCartIds.length) {
      return res.status(400).json({ ok: false, error: "invalid_item_ids" });
    }
    const notCollectable = items.filter((it) => it.status !== "collected");
    if (notCollectable.length) {
      return res.status(400).json({
        ok: false,
        error: "some_items_unavailable",
        items: notCollectable.map((i) => ({ id: i.id, status: i.status })),
      });
    }

    // Transaction
    const tx = db.transaction(() => {
      const orderInfo = insertOrder.run(me.id);
      const orderId = orderInfo.lastInsertRowid;

      for (const it of items) {
        insertOrderItem.run(orderId, it.id);
        // If your items.status enum doesn't include 'reserved', comment the next line:
        markReserved.run(it.id);
      }

      insertMeta.run(orderId, "delivery_name", String(delivery_name));
      insertMeta.run(orderId, "delivery_phone", String(delivery_phone));
      insertMeta.run(orderId, "delivery_address", String(delivery_address));
      insertMeta.run(orderId, "delivery_suburb", String(delivery_suburb || ""));
      insertMeta.run(orderId, "delivery_postcode", String(delivery_postcode));
      insertMeta.run(orderId, "delivery_notes", String(delivery_notes || ""));

      return orderId;
    });

    const orderId = tx();
    return res.status(201).json({ ok: true, orderId });
  } catch (e) {
    console.error("checkout error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  } finally {
    try { db.close(); } catch {}
  }
}