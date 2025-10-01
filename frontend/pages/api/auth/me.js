import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "supersecretkey";

export default function handler(req, res) {
  try {
    const token = req.cookies?.auth;
    if (!token) return res.status(200).json({ user: null });

    const payload = jwt.verify(token, SECRET);
    return res.status(200).json({ user: payload }); // {id, name, role, ...}
  } catch {
    return res.status(200).json({ user: null });
  }
}