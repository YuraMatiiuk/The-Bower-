import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

// Helper: get user id from auth cookie
function getUserId(req, res) {
  const token = req.cookies?.auth;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  try {
    const payload = jwt.verify(token, SECRET);
    return payload.id;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

export default function handler(req, res) {
  if (req.method === "GET") {
    const userId = getUserId(req, res);
    if (!userId) return;

    try {
      const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      // Ensure donor profile row exists (create empty if missing)
      let donor = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(userId);
      if (!donor) {
        db.prepare("INSERT INTO donors (user_id, address, postcode, phone) VALUES (?, '', '', '')").run(userId);
        donor = db.prepare("SELECT * FROM donors WHERE user_id = ?").get(userId);
      }

      return res.status(200).json({
        user,
        profile: {
          address: donor.address || "",
          postcode: donor.postcode || "",
          phone: donor.phone || "",
        },
      });
    } catch (err) {
      console.error("❌ Profile GET error:", err.message);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  }

  if (req.method === "POST") {
    const userId = getUserId(req, res);
    if (!userId) return;

    const { name, address, postcode, phone } = req.body || {};
    try {
      if (name) {
        db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, userId);
      }

      // Upsert donor profile
      const exists = db.prepare("SELECT id FROM donors WHERE user_id = ?").get(userId);
      if (exists) {
        db.prepare("UPDATE donors SET address = ?, postcode = ?, phone = ? WHERE user_id = ?")
          .run(address || "", postcode || "", phone || "", userId);
      } else {
        db.prepare("INSERT INTO donors (user_id, address, postcode, phone) VALUES (?, ?, ?, ?)")
          .run(userId, address || "", postcode || "", phone || "");
      }

      return res.status(200).json({ message: "Profile updated" });
    } catch (err) {
      console.error("❌ Profile POST error:", err.message);
      return res.status(500).json({ error: "Failed to update profile" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
