import { Client, Environment } from "square";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

const db = new Database("./db/database.sqlite");
const SECRET = process.env.JWT_SECRET || "supersecretkey";

const client = new Client({
  environment: process.env.SQUARE_ENV === "sandbox" ? Environment.Sandbox : Environment.Production,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const locationId = process.env.SQUARE_LOCATION_ID;
const serviceVariationId = process.env.SQUARE_SERVICE_VARIATION_ID;
const serviceVariationVersion = Number(process.env.SQUARE_SERVICE_VARIATION_VERSION || 0);

function getUser(req) {
  const token = req.cookies?.auth;
  if (!token) return null;
  try { return jwt.verify(token, SECRET); } catch (_) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  const user = getUser(req);
  if (!user) return res.status(401).json({ error: "not_authenticated" });

  try {
    const { itemId, startAt, teamMemberId } = req.body || {};
    if (!itemId || !startAt) return res.status(400).json({ error: "itemId and startAt required" });

    // Ensure item belongs to donor and is approved
    const row = db.prepare(`
      SELECT i.id, i.status, d.id AS donor_id, d.user_id, d.name, d.email, d.phone
      FROM items i
      JOIN donors d ON d.id = i.donor_id
      WHERE i.id = ?
    `).get(itemId);

    if (!row) return res.status(404).json({ error: "item_not_found" });
    if (row.user_id !== user.id) return res.status(403).json({ error: "forbidden" });
    if (row.status !== "approved") return res.status(400).json({ error: "not_approved" });

    // Ensure Square Customer exists
    let customerId = null;
    if (row.email) {
      const sr = await client.customersApi.searchCustomers({
        query: { filter: { emailAddress: { exact: row.email } } }
      });
      customerId = sr?.result?.customers?.[0]?.id || null;
      if (!customerId) {
        const cr = await client.customersApi.createCustomer({
          givenName: row.name || "Donor",
          emailAddress: row.email,
          phoneNumber: row.phone || undefined,
        });
        customerId = cr?.result?.customer?.id || null;
      }
    }

    // Create the booking
    const br = await client.bookingsApi.createBooking({
      booking: {
        locationId,
        customerId: customerId || undefined,
        startAt: new Date(startAt).toISOString(),
        appointmentSegments: [
          {
            durationMinutes: 60,
            serviceVariationId,
            serviceVariationVersion: serviceVariationVersion || undefined,
            teamMemberId: teamMemberId || undefined,
          }
        ]
      }
    });

    const booking = br?.result?.booking;
    if (!booking?.id) return res.status(500).json({ error: "square_booking_failed" });

    // Save collection row and link fields
    db.prepare(`INSERT INTO collections (item_id, collection_date, status)
                VALUES (?, ?, 'scheduled')`).run(itemId, booking.startAt);

    db.prepare(`UPDATE collections
                SET square_booking_id = ?, square_start_at = ?, square_end_at = ?,
                    square_location_id = ?, square_team_member_id = ?
                WHERE item_id = ? AND collection_date = ?`)
      .run(
        booking.id,
        booking.startAt,
        booking.endAt || null,
        booking.locationId || locationId,
        booking.appointmentSegments?.[0]?.teamMemberId || teamMemberId || null,
        itemId,
        booking.startAt
      );

    // Optional: mark item as "collected" later; keep "scheduled" status now
    db.prepare("UPDATE items SET status = 'collected' WHERE id = ?").run(itemId);

    return res.status(201).json({ ok: true, bookingId: booking.id });
  } catch (e) {
    console.error("Create booking error:", e);
    return res.status(500).json({ error: "create_booking_failed" });
  }
}