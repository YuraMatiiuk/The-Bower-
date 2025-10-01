import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("./db/database.sqlite");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { name, email, password, phone, address, suburb, postcode } = req.body;
  if (!name || !email || !password || !phone || !address || !suburb || !postcode) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.prepare(`
      INSERT INTO users (name, email, password, role, phone, address, suburb, postcode)
      VALUES (?, ?, ?, 'donor', ?, ?, ?, ?)
    `).run(name, email, hash, phone, address, suburb, postcode);

    return res.status(200).json({ message: "Signup successful" });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Email already in use" });
    }
    console.error("❌ Signup error:", err.message);
    return res.status(500).json({ error: "Failed to sign up" });
  }
}