// pages/api/auth/me.js
import { getUserFromRequest } from "../../../lib/auth";

export default function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthenticated" });
  return res.status(200).json({ user });
}