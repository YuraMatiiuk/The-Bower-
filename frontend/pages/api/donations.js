// pages/api/donations.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// ensure upload dir
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const unique = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const ext = (file.originalname || "").split(".").pop() || "jpg";
    cb(null, `${unique}.${ext}`);
  },
});
const upload = multer({ storage });

function getUserId(req) {
  const t = req.cookies?.auth;
  if (!t) return null;
  try {
    const p = jwt.verify(t, SECRET);
    return p?.id || null;
  } catch {
    return null;
  }
}

// helper to run multer in Next API route
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.array("images", 20)(req, res, (err) => {
      if (err) reject(err);
      else resolve(null);
    });
  });
}

const VALID_COND = new Set(["excellent", "good", "fair", "poor"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "unauth" });

  try {
    await runMulter(req, res);

    const body = req.body || {};
    // basic donor address (posted once per submission)
    const address = String(body.address || "").trim();
    const suburb = String(body.suburb || "").trim();
    const postcode = String(body.postcode || "").trim();

    // validate service area (reuse your existing list)
    const okArea = db
      .prepare(
        "SELECT 1 FROM service_areas WHERE postcode = ? AND suburb_norm = UPPER(TRIM(?)) LIMIT 1"
      )
      .get(postcode, suburb);

    if (!okArea) {
      return res.status(400).json({
        error: "out_of_area",
        message: "This suburb/postcode is not in our service area.",
      });
    }

    // upsert donor profile by user_id (also make sure donors table has user_id)
    let donor = db
      .prepare("SELECT id FROM donors WHERE user_id = ?")
      .get(userId);

    if (!donor) {
      const r = db
        .prepare(
          "INSERT INTO donors (name, email, address, suburb, postcode, user_id) VALUES ((SELECT name FROM users WHERE id=?),(SELECT email FROM users WHERE id=?),?,?,?,?)"
        )
        .run(userId, userId, address, suburb, postcode, userId);
      donor = { id: r.lastInsertRowid };
    } else {
      db.prepare(
        "UPDATE donors SET address=?, suburb=?, postcode=? WHERE id=?"
      ).run(address, suburb, postcode, donor.id);
    }

    // parse items JSON
    let items = [];
    try {
      items = JSON.parse(body.items || "[]");
      if (!Array.isArray(items)) items = [];
    } catch {
      items = [];
    }
    if (items.length === 0) {
      return res.status(400).json({ error: "no_items" });
    }

    // files (images) come in order
    const files = (req.files || []).map((f) => `/uploads/${path.basename(f.path)}`);

    const tx = db.transaction(() => {
      const insertedIds = [];
      items.forEach((it, idx) => {
        const name = String(it.itemName || "").trim();
        const category = String(it.category || "").trim();
        const condition = String(it.condition || "").toLowerCase().trim();

        if (!name || !category || !VALID_COND.has(condition)) {
          throw new Error("bad_item");
        }

        // optional dimensions
        const width = it.width_cm ? Number(it.width_cm) : null;
        const depth = it.depth_cm ? Number(it.depth_cm) : null;
        const height = it.height_cm ? Number(it.height_cm) : null;
        const weight = it.weight_kg ? Number(it.weight_kg) : null;

        const image_url = files[idx] || null;

        const r = db
          .prepare(
            `INSERT INTO items
             (donor_id, name, category, condition, accepted, status, image_url,
              width_cm, depth_cm, height_cm, weight_kg)
             VALUES (?, ?, ?, ?, 0, 'pending', ?, ?, ?, ?, ?)`
          )
          .run(
            donor.id,
            name,
            category,
            condition,
            image_url,
            width,
            depth,
            height,
            weight
          );

        insertedIds.push(r.lastInsertRowid);
      });

      return insertedIds;
    });

    const ids = tx();
    return res.status(201).json({ ok: true, item_ids: ids });
  } catch (err) {
    console.error("❌ Donation error:", err);
    if (String(err?.message) === "bad_item") {
      return res.status(400).json({ error: "bad_item" });
    }
    return res.status(500).json({ error: "server_error" });
  }
}