"use client";

import React, { useEffect, useState } from "react";

type Order = {
  id: number;
  status: "pending" | "confirmed" | "delivered";
  created_at: string;
  caseworker_id: number;
  caseworker_name?: string;
  caseworker_email?: string;
  items: Array<{ item_id: number; name: string; category: string; condition: string; image_url?: string | null }>;
  meta: Record<string, string>;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState<"" | "pending" | "confirmed">("");

  async function load() {
    setMsg("");
    const qs = new URLSearchParams();
    if (filter) qs.set("status", filter);
    const r = await fetch(`/api/admin/orders?${qs.toString()}`);
    const data = await r.json();
    if (!r.ok || !data?.ok) {
      setMsg(data?.error || "Failed to load orders");
      setOrders([]);
    } else {
      setOrders(data.orders || []);
    }
  }
  useEffect(() => { load(); }, [filter]);

  async function approve(orderId: number) {
    setMsg("");
    const r = await fetch("/api/admin/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, action: "approve" }),
    });
    const data = await r.json();
    if (!r.ok || !data?.ok) {
      setMsg(data?.error || "Failed to approve");
    } else {
      load();
    }
  }

  function fmtDate(s: string) {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Orders (Delivery Requests)</h1>

      <div className="flex items-center gap-2">
        <button className={`px-3 py-1 rounded border ${filter === "" ? "bg-blue-600 text-white" : ""}`} onClick={() => setFilter("")}>All</button>
        <button className={`px-3 py-1 rounded border ${filter === "pending" ? "bg-blue-600 text-white" : ""}`} onClick={() => setFilter("pending")}>Pending</button>
        <button className={`px-3 py-1 rounded border ${filter === "confirmed" ? "bg-blue-600 text-white" : ""}`} onClick={() => setFilter("confirmed")}>Confirmed</button>
      </div>

      {msg && <div className="p-2 rounded border bg-yellow-50 text-sm">{msg}</div>}

      {orders.length === 0 ? (
        <p>No orders.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="border rounded p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="font-medium">Order #{o.id} • {o.status}</div>
                <div className="text-sm text-gray-600">{fmtDate(o.created_at)}</div>
              </div>
              <div className="text-sm text-gray-700 mt-1">
                Caseworker: {o.caseworker_name || o.caseworker_id} ({o.caseworker_email || "n/a"})
              </div>
              <div className="text-sm text-gray-700">Agency: {o.meta?.agency || "n/a"}</div>
              <div className="text-sm text-gray-700">
                Deliver to: {o.meta?.delivery_address}, {o.meta?.delivery_suburb} {o.meta?.delivery_postcode}
              </div>
              {o.meta?.notes && <div className="text-sm text-gray-600">Notes: {o.meta.notes}</div>}

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {o.items.map((it) => (
                  <div key={it.item_id} className="border rounded p-2 flex gap-2">
                    {it.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image_url} className="w-16 h-16 object-cover rounded border" alt={it.name}/>
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-[10px] text-gray-500">
                        No image
                      </div>
                    )}
                    <div className="text-sm">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-gray-600">{it.category} • {it.condition}</div>
                    </div>
                  </div>
                ))}
              </div>

              {o.status === "pending" && (
                <div className="mt-3">
                  <button onClick={() => approve(o.id)} className="px-3 py-1 rounded bg-green-600 text-white">
                    Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}