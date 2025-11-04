// lib/auth.js
import jwt from "jsonwebtoken";
import { parse as parseCookie } from "cookie";

export const JWT_NAME = "token";
const JWT_SECRET = process.env.JWT_SECRET || "dev_fallback_secret";

// Internal: read token from Cookie or Authorization header (Bearer)
function readTokenFromReq(req) {
  try {
    const raw = req?.headers?.cookie || "";
    if (raw) {
      const cookies = parseCookie(raw);
      if (cookies[JWT_NAME]) return cookies[JWT_NAME];
    }
  } catch {}
  // Optional Bearer support (useful for curl/Postman)
  const auth = req?.headers?.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

// Parse cookie ➜ verify JWT ➜ return user payload or null
export function getUserFromRequest(req) {
  try {
    const token = readTokenFromReq(req);
    if (!token) return null;
    const user = jwt.verify(token, JWT_SECRET); // { id, name, email, role, iat, exp }
    return user || null;
  } catch {
    return null;
  }
}

// Require *any* logged-in user
export function requireLoggedIn(req, res) {
  const me = getUserFromRequest(req);
  if (!me) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  return me;
}

// Require specific role(s). roles: string | string[]
export function requireRole(req, res, roles) {
  const me = requireLoggedIn(req, res);
  if (!me) return null;
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(me.role)) {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  return me;
}

// Convenience helpers
export function requireAdmin(req, res) {
  return requireRole(req, res, "admin");
}
export function requireDriver(req, res) {
  return requireRole(req, res, ["driver", "admin"]);
}
export function requireCaseworker(req, res) {
  return requireRole(req, res, ["caseworker", "admin"]);
}
// Optional combo used in some endpoints
export function requireDriverOrAdmin(req, res) {
  return requireDriver(req, res);
}