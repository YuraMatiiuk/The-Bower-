// pages/api/admin/items.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

// --- Optional email/template modules (loaded safely) ---
let sendMail = null;
let buildRejectionEmail = null;
let REJECTION_REASONS = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const emailMod = require("../../../lib/email");
  sendMail = emailMod?.sendMail || null;
} catch (_) {
  // lib/email.js not present; continue without emailing
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const tmplMod = require("../../../lib/rejectionTemplates");
  buildRejectionEmail = tmplMod?.buildRejectionEmail || null;
  REJECTION_REASONS = tmplMod?.REJECTION_REASONS || null;
} catch (_) {
  // lib/rejectionTemplates.js not present; use fallback below
}

const FALLBACK_REASONS = [
  { key: "not_accepted", label: "Not an accepted item" },
  { key: "too_large", label: "Too large" },
  { key: "poor_condition", label: "Poor condition" },
  { key: "overstocked", label: "Overstocked currently" },
];

// If you enforce admin via middleware, you can skip/adjust this.
function assertAdmin(_req) {
  return true;
}

export default async function handler(req, res) {
  if (!assertAdmin(req)) {
    return res.status(403).json({ error: "forbidden" });
  }

  if (req.method === "GET") {
    try {
      const items = db
        .prepare(
          `
          SELECT
            i.id,
            i.name,
            i.category,
            i.condition,
            i.status,
            i.image_url,
            d.name     AS donor_name,
            d.email    AS donor_email,
            d.address  AS donor_address,
            d.postcode AS donor_postcode
          FROM items i
          JOIN donors d ON d.id = i.donor_id
          WHERE i.status = 'pending'
          ORDER BY i.id DESC
        `
        )
        .all();

      return res.status(200).json({
        items,
        reasons: REJECTION_REASONS || FALLBACK_REASONS,
      });
    } catch (e) {
      console.error("❌ Error loading admin items:", e);
      return res.status(500).json({ error: "failed_to_load_items" });
    }
  }

  if (req.method === "POST") {
    const { itemId, action, reasonKey } = req.body || {};
    if (!itemId || !action) {
      return res.status(400).json({ error: "itemId and action required" });
    }
    if (!["approved", "rejected"].includes(action)) {
      return res.status(400).json({ error: "invalid action" });
    }

    try {
      // Confirm item + donor
      const row = db
        .prepare(
          `
          SELECT
            i.id, i.name, i.status,
            d.name  AS donor_name,
            d.email AS donor_email
          FROM items i
          JOIN donors d ON d.id = i.donor_id
          WHERE i.id = ?
        `
        )
        .get(itemId);

      if (!row) return res.status(404).json({ error: "item_not_found" });

      // Update status
      db.prepare("UPDATE items SET status = ? WHERE id = ?").run(action, itemId);

      // Send email on rejection if email/template available
      if (
        action === "rejected" &&
        row.donor_email &&
        typeof sendMail === "function" &&
        typeof buildRejectionEmail === "function"
      ) {
        try {
          const { subject, html } = buildRejectionEmail(
            reasonKey,
            row.donor_name || "there"
          );
          await sendMail({ to: row.donor_email, subject, html });
        } catch (mailErr) {
          console.warn("Email send failed (continuing):", mailErr?.message || mailErr);
        }
      }

      return res.status(200).json({ ok: true, message: `Item ${action}` });
    } catch (e) {
      console.error("❌ Error updating item:", e);
      return res.status(500).json({ error: "update_failed" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}