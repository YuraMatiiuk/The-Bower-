// pages/api/square/diag.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
  const env = (process.env.SQUARE_ENV || "sandbox").toLowerCase();
  const base = env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  if (!accessToken) {
    return res.status(200).json({
      ok: false,
      message: "SQUARE_ACCESS_TOKEN is missing in .env.local",
    });
  }

  try {
    const r = await fetch(`${base}/v2/locations`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-10-16",
      },
    });
    const j = await r.json();
    return res.status(r.ok ? 200 : r.status).json({
      ok: r.ok,
      env,
      status: r.status,
      locations_count: Array.isArray(j.locations) ? j.locations.length : 0,
      raw: j,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}