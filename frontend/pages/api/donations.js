// pages/api/donations.js
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

export const config = { api: { bodyParser: false } }; // Multer handles multipart

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

// ---- helpers ----
const VALID_CONDITIONS = new Set(["excellent", "good", "fair", "poor"]);
function normalizeCondition(input) {
  const v = String(input || "").trim().toLowerCase();
  if (VALID_CONDITIONS.has(v)) return v;
  if (["like new","as new","near new","great","very good"].includes(v)) return "excellent";
  if (["ok","okay","used","decent"].includes(v)) return "good";
  if (["average","worn","well used"].includes(v)) return "fair";
  if (["bad","broken","poor condition"].includes(v)) return "poor";
  return v;
}
const norm = (s) => String(s||"").trim().toUpperCase().replace(/\s+/g," ").replace(/[^\w\s-]/g,"");

function getUserFromCookie(req){
  const token = req.cookies?.auth;
  if (!token) return null;
  try { return jwt.verify(token, SECRET); } catch { return null; }
}

function tableExists(name) {
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);
    return !!row;
  } catch {
    return false;
  }
}

// ---- uploads (allow single or multiple under several field names) ----
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`);
  },
});

// accept common field names & multiples
const upload = multer({ storage }).fields([
  { name: "image",  maxCount: 20 },   // your form appends "image" repeatedly
  { name: "images", maxCount: 20 },
  { name: "photos", maxCount: 20 },
]);

function runMulter(req, res){
  return new Promise((resolve,reject)=>{
    upload(req, res, (err)=> err ? reject(err) : resolve(null));
  });
}

// ---- handler ----
export default async function handler(req, res){
  if (req.method === "GET") return res.status(200).json({ ok: true });

  if (req.method !== "POST"){
    res.setHeader("Allow", ["POST","GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = getUserFromCookie(req);
  if (!user) return res.status(401).json({ error: "not_authenticated" });

  try {
    // parse multipart
    await runMulter(req, res);

    const {
      itemName,
      category = "",
      condition,
      address,
      suburb,
      postcode,
    } = req.body || {};

    // validate
    if (!itemName)   return res.status(400).json({ error: "item_name_required" });
    if (!condition)  return res.status(400).json({ error: "condition_required" });
    if (!suburb || !postcode) return res.status(400).json({ error: "address_required" });

    const cond = normalizeCondition(condition);
    if (!VALID_CONDITIONS.has(cond)){
      return res.status(400).json({ error: "invalid_condition", message: "Condition must be one of: excellent, good, fair, poor." });
    }

    // service-area: service_areas(postcode, suburb_norm)
    const pc = String(postcode).trim();
    const subNorm = norm(suburb);
    const sa = db.prepare(
      "SELECT 1 FROM service_areas WHERE postcode = ? AND suburb_norm = ? LIMIT 1"
    ).get(pc, subNorm);
    if (!sa){
      return res.status(400).json({ error: "out_of_area", message: "Sorry, we currently only collect from approved suburbs/postcodes." });
    }

    // user row
    const userRow = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(user.id);
    if (!userRow) return res.status(400).json({ error: "user_not_found" });

    // donor upsert (donors: id, name, email, address, postcode, user_id)
    const donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userRow.id);
    let donorId;
    if (!donor){
      const info = db.prepare(`
        INSERT INTO donors (user_id, name, email, address, postcode)
        VALUES (?, ?, ?, ?, ?)
      `).run(userRow.id, userRow.name || "", userRow.email || "", String(address||""), pc);
      donorId = info.lastInsertRowid;
    } else {
      db.prepare(`UPDATE donors SET name=?, email=?, address=?, postcode=? WHERE user_id=?`)
        .run(userRow.name||"", userRow.email||"", String(address||""), pc, userRow.id);
      donorId = donor.id;
    }

    // collect files (use first for items.image_url; save all to item_images if exists)
    const files = []
      .concat(req.files?.image  || [])
      .concat(req.files?.images || [])
      .concat(req.files?.photos || []);
    const first = files[0] || null;
    const primaryUrl = first ? `/uploads/${first.filename}` : null;

    // insert item
    const itemInfo = db.prepare(`
      INSERT INTO items (donor_id, name, category, condition, accepted, status, image_url)
      VALUES (?, ?, ?, ?, 0, 'pending', ?)
    `).run(donorId, String(itemName), String(category||""), cond, primaryUrl);
    const itemId = itemInfo.lastInsertRowid;

    // optional: write all images to item_images if that table exists
    if (files.length && tableExists("item_images")) {
      const stmt = db.prepare("INSERT INTO item_images (item_id, url) VALUES (?, ?)");
      for (const f of files) {
        stmt.run(itemId, `/uploads/${f.filename}`);
      }
    }

    return res.status(201).json({
      ok: true,
      message: "Donation submitted for review.",
      item_id: itemId,
      image_url: primaryUrl,
      files_uploaded: files.length
    });
  } catch (err){
    console.error("❌ Donation error:", err);
    // Surface Multer field-name issues cleanly
    if (err?.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ error: "unexpected_file_field", field: err?.field || "" });
    }
    return res.status(500).json({ error: "server_error", detail: String(err?.message || err) });
  }
}