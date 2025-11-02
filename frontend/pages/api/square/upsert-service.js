import crypto from "crypto";

const BASES = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end();
  }

  try {
    const env = (process.env.SQUARE_ENV || "sandbox").toLowerCase();
    const base = BASES[env] || BASES.sandbox;
    const token = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    if (!token || !locationId) return res.status(500).json({ error: "missing_env" });

    const idempotencyKey = crypto.randomUUID();

    const body = {
      idempotency_key: idempotencyKey,
      object: {
        id: "#the_bower_service",
        type: "ITEM",
        present_at_all_locations: false,
        present_at_location_ids: [locationId],
        item_data: {
          name: "Furniture Collection",
          description: "Pickup service for approved donations",
          product_type: "APPOINTMENTS_SERVICE",
          variations: [
            {
              id: "#the_bower_service_var",
              type: "ITEM_VARIATION",
              item_variation_data: {
                name: "Standard (60 min)",
                service_duration: { duration: "PT60M" },
                price_money: { amount: 0, currency: "AUD" },
                available_for_booking: true,
              },
            },
          ],
        },
      },
    };

    const r = await fetch(`${base}/v2/catalog/object`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": "2023-12-13",
      },
      body: JSON.stringify(body),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(500).json({ error: "upsert_failed", status: r.status, detail: data });
    }

    const svc = data?.catalog_object;
    const variation = svc?.item_data?.variations?.[0];

    return res.status(200).json({
      service_id: svc?.id,
      service_version: svc?.version,
      service_name: svc?.item_data?.name,
      variation_id: variation?.id,
      variation_version: variation?.version,
      variation_name: variation?.item_variation_data?.name,
    });
  } catch (e) {
    console.error("Upsert service error:", e);
    return res.status(500).json({ error: "upsert_exception", detail: String(e?.message || e) });
  }
}