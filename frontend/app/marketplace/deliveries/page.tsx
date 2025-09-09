"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Row = {
  reservation_id: number;
  item_id: number;
  item_name: string;
  category: string;
  condition: string;
  reservation_status: string;
};

export default function DeliveriesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Controlled inputs per reservation
  const [dates, setDates] = useState<Record<number, string>>({});
  const [slots, setSlots] = useState<Record<number, string>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await axios.get("/api/deliveries");
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      setMsg("Failed to load deliverable reservations");
    }
    setLoading(false);
  }

  async function schedule(reservationId: number, itemId: number) {
    setMsg("");
    const deliveryDate = dates[reservationId];
    const timeSlot = slots[reservationId];
    if (!deliveryDate || !timeSlot) {
      setMsg("Please choose a date and time slot");
      return;
    }
    try {
      const res = await axios.post("/api/deliveries", {
        reservationId,
        itemId,
        deliveryDate,
        timeSlot,
      });
      setMsg(res.data.message || "Delivery scheduled");
      load(); // refresh list; this one disappears after scheduling
    } catch (e: any) {
      console.error(e);
      setMsg(e?.response?.data?.error || "Failed to schedule delivery");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Schedule Deliveries</h1>
        <div className="space-x-2">
          <a href="/marketplace" className="text-blue-700 hover:underline">← Back to Marketplace</a>
          <a href="/marketplace/reservations" className="text-blue-700 hover:underline">My Reservations</a>
        </div>
      </div>

      {msg && <p className="mb-4 text-blue-600">{msg}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : rows.length === 0 ? (
        <p>No reservations need scheduling right now.</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Item</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Condition</th>
              <th className="border p-2">Delivery Date</th>
              <th className="border p-2">Time Slot</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.reservation_id}>
                <td className="border p-2">{r.item_name}</td>
                <td className="border p-2">{r.category}</td>
                <td className="border p-2">{r.condition}</td>
                <td className="border p-2">
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={dates[r.reservation_id] || ""}
                    onChange={(e) =>
                      setDates((d) => ({ ...d, [r.reservation_id]: e.target.value }))
                    }
                  />
                </td>
                <td className="border p-2">
                  <select
                    className="border p-2 rounded"
                    value={slots[r.reservation_id] || ""}
                    onChange={(e) =>
                      setSlots((s) => ({ ...s, [r.reservation_id]: e.target.value }))
                    }
                  >
                    <option value="">-- Select --</option>
                    <option value="9am-12pm">9am – 12pm</option>
                    <option value="12pm-3pm">12pm – 3pm</option>
                    <option value="3pm-5pm">3pm – 5pm</option>
                  </select>
                </td>
                <td className="border p-2">
                  <button
                    onClick={() => schedule(r.reservation_id, r.item_id)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Schedule
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}