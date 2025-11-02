// pages/api/donations.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

export const config = {
  api: { bodyParser: false }, // Multer handles multipart
};

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

// ----- helpers -----
const VALID_CONDITIONS = new Set(["excellent", "good", "fair", "poor"]);

function normalizeCondition(input) {
  const v = String(input || "").trim().toLowerCase();
  if (VALID_CONDITIONS.has(v)) return v;
  if (["like new", "as new", "near new", "great", "very good"].includes(v)) return "excellent";
  if (["ok", "okay", "used", "decent"].includes(v)) return "good";
  if (["average", "worn", "well used"].includes(v)) return "fair";
  if (["bad", "broken", "poor condition"].includes(v)) return "poor";
  return v;
}

const norm = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");

// Ensure uploads dir exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Configure Multer for single file "image"
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    // unique filename with original extension
    const ext = path.extname(file.originalname || "");
    const name = Math.random().toString(36).slice(2) + Date.now().toString(36) + (ext || "");
    cb(null, name);
  },
});
const upload = multer({ storage });

// Convert multer to a promise to use async/await
function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single("image")(req, res, (err) => {
      if (err) reject(err);
      else resolve(null);
    });
  });
}

function getUserFromCookie(req) {
  const token = req.cookies?.auth;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// ----- handler -----
export default async function handler(req, res) {
  if (req.method === "GET") {
    // optional: list donor items or categories; currently noop
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = getUserFromCookie(req);
  if (!user) {
    return res.status(401).json({ error: "not_authenticated" });
  }

  try {
    // Parse multipart/form-data (fields + optional image)
    await runMulter(req, res);

    // Fields from form
    // Multer puts fields in req.body and file in req.file
    const {
      itemName,
      category = "",
      categoryId = null,
      condition,
      // donor details (allow override on donation)
      address,
      suburb,
      postcode,
    } = req.body || {};

    // Validate basics
    if (!itemName) return res.status(400).json({ error: "item_name_required" });
    if (!condition) return res.status(400).json({ error: "condition_required" });
    if (!suburb || !postcode) return res.status(400).json({ error: "address_required" });

    // Normalise + validate condition
    const cond = normalizeCondition(condition);
    if (!VALID_CONDITIONS.has(cond)) {
      return res.status(400).json({
        error: "invalid_condition",
        message: "Condition must be one of: excellent, good, fair, poor.",
      });
    }

    // Service area check (use suburb_norm)
    const pc = String(postcode).trim();
    const subNorm = norm(suburb);
    const sa = db
      .prepare("SELECT 1 FROM service_areas WHERE postcode = ? AND suburb_norm = ? LIMIT 1")
      .get(pc, subNorm);

    if (!sa) {
      return res.status(400).json({
        error: "out_of_area",
        message: "Sorry, we currently only collect from approved suburbs/postcodes.",
      });
    }

    // Upsert donor record for this user (store latest address on each donation)
    // 1) Find user row (email/name come from users table)
    const userRow = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(user.id);
    if (!userRow) {
      return res.status(400).json({ error: "user_not_found" });
    }

    // 2) Does donor exist for this user?
    const donor = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(userRow.id);

    const donorData = {
      name: userRow.name || "",
      email: userRow.email || "",
      address: address ? String(address) : (donor?.address || ""),
      suburb: String(suburb),
      postcode: String(postcode),
      user_id: userRow.id,
    };

    let donorId;
    if (!donor) {
      const info = db
        .prepare(
          `INSERT INTO donors (user_id, name, email, address, suburb, postcode)
           VALUES (@user_id, @name, @email, @address, @suburb, @postcode)`
        )
        .run(donorData);
      donorId = info.lastInsertRowid;
    } else {
      db.prepare(
        `UPDATE donors
         SET name = @name, email = @email, address = @address, suburb = @suburb, postcode = @postcode
         WHERE user_id = @user_id`
      ).run(donorData);
      donorId = donor.id;
    }

    // Handle uploaded image (if any)
    let imageUrl = null;
    if (req.file && req.file.filename) {
      imageUrl = `/uploads/${req.file.filename}`; // public path
    }

    // Insert item
    const insert = db.prepare(`
      INSERT INTO items (donor_id, name, category, category_id, condition, accepted, status, image_url)
      VALUES (?, ?, ?, ?, ?, 0, 'pending', ?)
    `);

    insert.run(
      donorId,
      String(itemName),
      category ? String(category) : "",
      categoryId ? Number(categoryId) : null,
      cond,
      imageUrl
    );

    return res.status(201).json({ ok: true, message: "Donation submitted for review." });
  } catch (err) {
    console.error("❌ Donation error:", err);
    return res.status(500).json({ error: "server_error", detail: String(err.message || err) });
  }
}