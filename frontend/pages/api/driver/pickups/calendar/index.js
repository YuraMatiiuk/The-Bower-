// pages/api/driver/pickups/calendar/index.js
import Database from "better-sqlite3";

/**
 * GET /api/driver/pickups/calendar?month=YYYY-MM
 * -> { days: { "YYYY-MM-DD": number } }
 */
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { month } = req.query; // "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: "invalid_month", hint: "Use YYYY-MM" });
  }

  const [y, m] = month.split("-");
  const year = Number(y);
  const mon = Number(m);
  const lastDay = new Date(year, mon, 0).getDate();
  const first = `${y}-${m}-01`;
  const last = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

  const db = new Database("db/database.sqlite");
  // Adjust statuses if needed (e.g. include 'completed')
  const rows = db
    .prepare(
      `SELECT scheduled_date AS date, COUNT(*) AS c
         FROM bookings
        WHERE type='collection'
          AND scheduled_date >= ?
          AND scheduled_date <= ?
          AND status IN ('scheduled','confirmed')
        GROUP BY scheduled_date
        ORDER BY scheduled_date`
    )
    .all(first, last);

  const days = {};
  for (const r of rows) {
    days[r.date] = Number(r.c);
  }

  return res.status(200).json({ days });
}