import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("./db/database.sqlite");

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      db.prepare(`
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, 'donor')
      `).run(name, email, hashedPassword);

      res.status(201).json({ message: "Donor account created" });
    } catch (err) {
      console.error("❌ Signup error:", err.message);
      res.status(500).json({ error: "Failed to create account" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
