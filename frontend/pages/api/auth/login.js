import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: "1d" });

    const isProd = process.env.NODE_ENV === "production";
    const cookie = [
      `auth=${token}`,
      "HttpOnly",
      "Path=/",
      "SameSite=Lax",
      "Max-Age=86400",
      isProd ? "Secure" : null,
    ].filter(Boolean).join("; ");

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ message: "Login successful", role: user.role });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    return res.status(500).json({ error: "Failed to login" });
  }
}
