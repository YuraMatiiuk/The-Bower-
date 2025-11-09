// pages/api/admin/users/password.js
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("./db/database.sqlite");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id, newPassword } = req.body || {};
  if (!id || !newPassword || String(newPassword).trim().length < 1) {
    return res.status(400).json({ error: "Missing id or newPassword" });
  }

  try {
    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const hash = await bcrypt.hash(String(newPassword), 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, id);

    return res.status(200).json({ message: "Password updated" });
  } catch (e) {
    console.error("❌ Password update error:", e.message);
    return res.status(500).json({ error: "Failed to update password" });
  }
}