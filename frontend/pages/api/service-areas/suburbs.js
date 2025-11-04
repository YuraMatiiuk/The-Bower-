// pages/api/service-areas/suburbs.js
import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const postcode = String(req.query.postcode || "").trim();
  if (!/^\d{4}$/.test(postcode)) {
    return res.status(400).json({ error: "bad_postcode" });
  }
  const rows = db
    .prepare(
      "SELECT DISTINCT suburb FROM service_areas WHERE postcode = ? ORDER BY suburb ASC"
    )
    .all(postcode);

  return res.status(200).json({
    postcode,
    suburbs: rows.map((r) => r.suburb),
  });
}