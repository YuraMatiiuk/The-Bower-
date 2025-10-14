// pages/api/square/services.js

const BASES = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
};

export default async function handler(_req, res) {
  try {
    const env = (process.env.SQUARE_ENV || "sandbox").toLowerCase();
    const base = BASES[env] || BASES.sandbox;
    const token = process.env.SQUARE_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ error: "missing_access_token" });

    // Search for CATALOG ITEMs, then filter to Appointments services
    const r = await fetch(`${base}/v2/catalog/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": "2023-12-13",
      },
      body: JSON.stringify({
        object_types: ["ITEM"],
        include_related_objects: true,
      }),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res
        .status(500)
        .json({ error: "square_request_failed", status: r.status, detail: text });
    }

    const data = await r.json();
    const items = data?.objects || [];

    // Only keep items that are appointment services
    const services = items
      .filter((obj) => {
        const t = obj?.type || obj?.object_type;
        const productType =
          obj?.item_data?.product_type || obj?.itemData?.productType;
        return t === "ITEM" && productType === "APPOINTMENTS_SERVICE";
      })
      .map((svc) => {
        const vars =
          svc?.item_data?.variations || svc?.itemData?.variations || [];
        return {
          service_id: svc.id,
          version: svc.version,
          name: svc?.item_data?.name || svc?.itemData?.name,
          variations: vars.map((v) => ({
            id: v.id,
            version: v.version,
            name:
              v?.item_variation_data?.name || v?.itemVariationData?.name || "",
          })),
        };
      });

    return res.status(200).json({ services });
  } catch (e) {
    console.error("List services error:", e);
    return res.status(500).json({
      error: "failed_to_list_services",
      detail: String(e?.message || e),
    });
  }
}