// pages/api/auth/login.js
import jwt from "jsonwebtoken";
import { serialize } from "cookie";       // ⬅️ named import
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const JWT_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET || "dev_fallback_secret";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "missing_credentials" });
    }

    const db = new Database("db/database.sqlite");
    try {
      // If your emails are stored exactly as typed, remove toLowerCase()
      const user = db
        .prepare("SELECT id, name, email, role, password FROM users WHERE email = ?")
        .get(String(email).trim());

      if (!user) return res.status(401).json({ error: "invalid_credentials" });

      // Works for either plain text (dev) or bcrypt hash
      const ok = compareFlexible(password, user.password);
      if (!ok) return res.status(401).json({ error: "invalid_credentials" });

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.setHeader(
        "Set-Cookie",
        serialize(JWT_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",                 // cookie available to all routes
          maxAge: 60 * 60 * 24 * 7,  // 7 days
        })
      );

      return res.status(200).json({
        ok: true,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } finally {
      // Always close the DB
      try { db.close(); } catch {}
    }
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ error: "server_error" });
  }
}

// Helper: supports bcrypt or plain for dev
function compareFlexible(plain, stored) {
  try {
    if (typeof stored === "string" && (stored.startsWith("$2a$") || stored.startsWith("$2b$"))) {
      return bcrypt.compareSync(plain, stored);
    }
    return String(plain) === String(stored);
  } catch {
    return false;
  }
}