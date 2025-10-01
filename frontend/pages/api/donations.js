// pages/api/donations.js
import Database from "better-sqlite3";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const config = {
  api: { bodyParser: false },
};

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

const norm = (s) => String(s || "").trim().toUpperCase();

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

function extFromName(name = "") {
  const e = path.extname(String(name).toLowerCase());
  return ALLOWED_EXT.has(e) ? e : "";
}
function safeBasename(name = "") {
  return path.basename(name).replace(/[^\w.-]+/g, "_");
}
function randomName(ext = "") {
  return crypto.randomBytes(16).toString("hex") + ext;
}

function parseForm(req, uploadDir) {
  const form = formidable({
    multiples: false,
    uploadDir, // temp
    keepExtensions: true,
    maxFileSize: MAX_FILE_BYTES,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Ensure uploads dir exists
  const uploadsDir = path.join(process.cwd(), "public/uploads");
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}

  try {
    // 1) Auth
    const token = req.cookies?.auth;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const payload = jwt.verify(token, SECRET);
    const userId = payload?.id;
    if (!userId) return res.status(401).json({ error: "Invalid auth token" });

    // 2) Parse form
    const { fields, files } = await parseForm(req, uploadsDir);

    const {
      itemName,
      category,       // optional (text) for backward-compat
      category_id,    // preferred
      condition,
      address,
      suburb,
      postcode,
    } = fields;

    if (!itemName || !condition || !suburb || !postcode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 3) Service-area validation
    const pc = String(postcode).trim();
    const sub = norm(suburb);
    const sa = db
      .prepare("SELECT 1 FROM service_areas WHERE postcode = ? AND UPPER(TRIM(suburb)) = ?")
      .get(pc, sub);
    if (!sa) {
      return res.status(400).json({
        error:
          "Sorry, we currently only collect from approved suburbs/postcodes. Please check our service area.",
      });
    }

    // 4) Resolve category id (prefer category_id, else map/create from category text)
    let catId = category_id ? Number(category_id) : null;
    if (!catId && category) {
      const found = db
        .prepare("SELECT id FROM categories WHERE UPPER(name)=UPPER(?)")
        .get(String(category).trim());
      if (found?.id) {
        catId = found.id;
      } else {
        const ins = db
          .prepare("INSERT INTO categories (name) VALUES (?)")
          .run(String(category).trim());
        catId = Number(ins.lastInsertRowid);
      }
    }
    if (!catId) {
      return res.status(400).json({ error: "Please choose a category." });
    }

    // 5) Image (optional): validate + move to final name
    let imageUrl = null;
    const f = files?.image ? (Array.isArray(files.image) ? files.image[0] : files.image) : null;

    if (f && f.filepath) {
      const mime = (f.mimetype || "").toLowerCase();
      const orig = safeBasename(f.originalFilename || "");
      const pickedExt = extFromName(orig) || extFromName(f.newFilename) || "";
      const ext =
        pickedExt ||
        (mime.includes("jpeg") ? ".jpg"
          : mime.includes("jpg") ? ".jpg"
          : mime.includes("png") ? ".png"
          : mime.includes("webp") ? ".webp"
          : mime.includes("heic") ? ".heic"
          : mime.includes("heif") ? ".heif"
          : "");

      if (mime && !ALLOWED_MIME.has(mime)) {
        try { fs.unlinkSync(f.filepath); } catch {}
        return res.status(400).json({ error: "Unsupported image type. Please upload JPG, PNG, HEIC, or WEBP." });
      }
      if (!ext || !ALLOWED_EXT.has(ext)) {
        try { fs.unlinkSync(f.filepath); } catch {}
        return res.status(400).json({ error: "Unsupported image extension. Please upload JPG, PNG, HEIC, or WEBP." });
      }
      const stats = fs.statSync(f.filepath);
      if (stats.size > MAX_FILE_BYTES) {
        try { fs.unlinkSync(f.filepath); } catch {}
        return res.status(400).json({ error: "Image too large (max 10MB)." });
      }

      const finalName = randomName(ext);
      fs.renameSync(f.filepath, path.join(uploadsDir, finalName));
      imageUrl = "/uploads/" + finalName;
    }

    // 6) Donor record linked to user (create/update)
    let donor = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
    if (!donor) {
      const u = db.prepare("SELECT name, email FROM users WHERE id = ?").get(userId);
      if (!u) return res.status(400).json({ error: "User not found" });
      const info = db
        .prepare(
          "INSERT INTO donors (user_id, name, email, address, postcode) VALUES (?, ?, ?, ?, ?)"
        )
        .run(userId, u.name, u.email, `${address || ""}`, pc);
      donor = { id: info.lastInsertRowid };
    } else if (address) {
      db.prepare("UPDATE donors SET address = ?, postcode = ? WHERE id = ?")
        .run(`${address}`, pc, donor.id);
    }

    // 7) Save item (pending). Keep text category for now; store category_id too.
    db.prepare(
      `INSERT INTO items (donor_id, name, category, category_id, condition, accepted, status, image_url)
       VALUES (?, ?, ?, ?, ?, 0, 'pending', ?)`
    ).run(
      donor.id,
      String(itemName),
      category ? String(category) : "", // optional legacy text
      catId,
      String(condition),
      imageUrl
    );

    return res.status(200).json({ message: "Donation submitted successfully" });
  } catch (e) {
    console.error("❌ Donation error:", e);
    return res.status(500).json({ error: "Failed to save donation" });
  }
}