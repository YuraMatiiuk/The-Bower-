import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

// Normalise suburb the same way everywhere
const norm = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "");

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const postcode = String(req.query.postcode || "").trim();
  const suburbRaw = String(req.query.suburb || "");
  const suburbNorm = norm(suburbRaw);

  if (!postcode || !suburbNorm) {
    return res.status(400).json({ ok: false, error: "postcode and suburb required" });
  }

  try {
    const hit = db
      .prepare(
        "SELECT 1 FROM service_areas WHERE postcode = ? AND suburb_norm = ? LIMIT 1"
      )
      .get(postcode, suburbNorm);

    if (hit) return res.status(200).json({ ok: true });

    const suggestions = db
      .prepare("SELECT suburb FROM service_areas WHERE postcode = ? ORDER BY suburb ASC LIMIT 50")
      .all(postcode)
      .map((r) => r.suburb);

    return res.status(404).json({ ok: false, error: "No match", suggestions });
  } catch (e) {
    console.error("Service area check error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}