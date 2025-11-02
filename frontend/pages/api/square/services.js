// pages/api/square/services.js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
  const env = (process.env.SQUARE_ENV || "sandbox").toLowerCase();
  const base =
    env === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

  if (!accessToken) {
    return res.status(400).json({ error: "Missing SQUARE_ACCESS_TOKEN" });
  }

  try {
    // Search Catalog for ITEM + ITEM_VARIATION; Appointments services are Items with product_type = APPOINTMENTS_SERVICE
    const r = await fetch(`${base}/v2/catalog/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-10-16",
      },
      body: JSON.stringify({
        include_deleted_objects: false,
        types: ["ITEM", "ITEM_VARIATION"],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({
        error: "square_request_failed",
        status: r.status,
        detail: JSON.stringify(data),
      });
    }

    const objs = Array.isArray(data.objects) ? data.objects : [];

    // Build a map of variations by parent item
    const variationsByItemId = {};
    for (const o of objs) {
      if (o.type === "ITEM_VARIATION" && o.item_variation_data?.item_id) {
        const arr =
          variationsByItemId[o.item_variation_data.item_id] || (variationsByItemId[o.item_variation_data.item_id] = []);
        arr.push({
          variation_id: o.id,
          name: o.item_variation_data?.name,
          price_money: o.item_variation_data?.price_money || null,
          team_member_ids: o.item_variation_data?.team_member_ids || null,
          service_duration_sec: o.item_variation_data?.service_duration?.duration || null,
        });
      }
    }

    // Keep only Items whose product_type === APPOINTMENTS_SERVICE
    const services = [];
    for (const o of objs) {
      if (o.type !== "ITEM") continue;
      const pd = o.item_data;
      if (pd?.product_type === "APPOINTMENTS_SERVICE") {
        services.push({
          item_id: o.id,
          name: pd.name,
          variations: variationsByItemId[o.id] || [],
        });
      }
    }

    return res.status(200).json({ services });
  } catch (e) {
    return res.status(500).json({ error: "unexpected", detail: String(e) });
  }
}