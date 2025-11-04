// app/driver/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import axios from "axios";

type Pickup = {
  booking_id?: number | null;
  item_id: number;
  item_name: string;
  category?: string;
  condition?: string;
  image_url?: string | null;
  collection_date?: string | null;
  time_slot?: string | null;
  item_status?: string;
  booking_status?: string;
  donor_name?: string | null;
  donor_email?: string | null;
  donor_address?: string | null;
  donor_postcode?: string | null;
};

export default function DriverDashboard() {
  const [dateISO, setDateISO] = useState(dayjs().format("YYYY-MM-DD"));
  const [monthISO, setMonthISO] = useState(dayjs().format("YYYY-MM"));
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendar, setCalendar] = useState<Record<string, number>>({});
  const [actionBusy, setActionBusy] = useState<number | string | null>(null); // can hold fallback key

  // Load pickups for selected date
  async function loadPickups(d: string) {
    setLoading(true);
    try {
      const res = await axios.get("/api/driver/pickups", {
        params: { date: d },
        validateStatus: () => true,
      });
      if (res.status === 200) {
        setPickups(res.data.pickups || []);
      } else {
        setPickups([]);
      }
    } finally {
      setLoading(false);
    }
  }

  // Load calendar counts for month
  async function loadCalendar(m: string) {
    const res = await axios.get("/api/driver/pickups/calendar", {
      params: { month: m },
      validateStatus: () => true,
    });
    if (res.status === 200 && res.data?.days) {
      setCalendar(res.data.days);
    } else {
      setCalendar({});
    }
  }

  useEffect(() => {
    loadPickups(dateISO);
  }, [dateISO]);

  useEffect(() => {
    loadCalendar(monthISO);
  }, [monthISO]);

  // Move month
  function prevMonth() {
    const d = dayjs(monthISO + "-01").subtract(1, "month");
    setMonthISO(d.format("YYYY-MM"));
    // also move selected date into that month (keep same day if possible)
    const newDate = d.date(1);
    setDateISO(newDate.format("YYYY-MM-DD"));
  }
  function nextMonth() {
    const d = dayjs(monthISO + "-01").add(1, "month");
    setMonthISO(d.format("YYYY-MM"));
    const newDate = d.date(1);
    setDateISO(newDate.format("YYYY-MM-DD"));
  }

  // Mark collected / reject (uses fallback IDs if booking_id missing)
  async function markPickup(p: Pickup, action: "collected" | "rejected") {
    const fallbackKey = `${p.item_id}-${p.collection_date || "na"}-${p.time_slot || "na"}`;
    setActionBusy(p.booking_id ?? fallbackKey);
    try {
      const res = await axios.post(
        "/api/driver/pickups/mark",
        {
          bookingId: p.booking_id ?? null,
          itemId: p.item_id,
          action,
        },
        { validateStatus: () => true }
      );
      if (res.status === 200) {
        // Reload current date
        await loadPickups(dateISO);
      } else {
        alert(res.data?.error || "Failed to update pickup.");
      }
    } catch {
      alert("Failed to update pickup.");
    } finally {
      setActionBusy(null);
    }
  }

  // Build month grid days
  const daysInMonth = useMemo(() => {
    const start = dayjs(monthISO + "-01");
    const firstDow = start.day(); // 0-6
    const days = start.daysInMonth();
    const arr: Array<{ label: string; iso: string; has: number }> = [];

    // pad from previous month
    for (let i = 0; i < firstDow; i++) {
      arr.push({ label: "", iso: "", has: 0 });
    }
    for (let d = 1; d <= days; d++) {
      const iso = start.date(d).format("YYYY-MM-DD");
      arr.push({
        label: String(d),
        iso,
        has: calendar[iso] || 0,
      });
    }
    // pad to full weeks if desired (optional)
    return arr;
  }, [monthISO, calendar]);

  // Helper key: stable even if booking_id missing
  const rowKey = (p: Pickup) =>
    p.booking_id
      ? `bk-${p.booking_id}`
      : `bk-${p.item_id}-${p.collection_date || "na"}-${p.time_slot || "na"}`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Driver Dashboard</h1>

      {/* Month header */}
      <div className="flex items-center justify-between">
        <button className="px-3 py-1 border rounded" onClick={prevMonth}>
          ← Prev
        </button>
        <div className="text-lg font-medium">{dayjs(monthISO + "-01").format("MMMM YYYY")}</div>
        <button className="px-3 py-1 border rounded" onClick={nextMonth}>
          Next →
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 border rounded p-3">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="text-center text-sm font-medium">{d}</div>
        ))}
        {daysInMonth.map((d, idx) => {
          const isSelected = d.iso === dateISO;
          const has = d.has || 0;
          return (
            <div
              key={d.iso ? `day-${d.iso}` : `pad-${idx}`}
              className={`h-20 border rounded p-2 flex flex-col items-center justify-between cursor-pointer ${
                !d.iso ? "bg-gray-50" :
                has > 0 ? "bg-green-50" :
                "bg-gray-100"
              } ${isSelected ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => d.iso && setDateISO(d.iso)}
            >
              <div className="text-sm">{d.label || ""}</div>
              {d.iso && <div className="text-xs">{has} pickups</div>}
            </div>
          );
        })}
      </div>

      {/* Selected date */}
      <div className="flex items-center gap-3">
        <div className="text-lg font-medium">
          {dayjs(dateISO).format("dddd, D MMMM YYYY")}
        </div>
      </div>

      {/* Pickups list */}
      <section className="bg-white rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Pickups for {dayjs(dateISO).format("D MMM YYYY")}</h2>
        {loading ? (
          <p>Loading…</p>
        ) : pickups.length === 0 ? (
          <p>No pickups for this date.</p>
        ) : (
          <ul className="space-y-3">
            {pickups.map((p) => (
              <li key={rowKey(p)} className="border rounded p-3">
                <div className="flex items-start gap-3">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.item_name}
                      className="w-20 h-20 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.item_name}</div>
                      <span className="text-xs px-2 py-1 rounded border bg-gray-50">
                        {p.booking_status || p.item_status || "scheduled"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {p.category} • {p.condition}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {p.donor_name || "Donor"} — {p.donor_address} {p.donor_postcode || ""}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        disabled={actionBusy === (p.booking_id ?? `${p.item_id}-${p.collection_date || "na"}-${p.time_slot || "na"}`)}
                        onClick={() => markPickup(p, "collected")}
                      >
                        {actionBusy === (p.booking_id ?? `${p.item_id}-${p.collection_date || "na"}-${p.time_slot || "na"}`)
                          ? "…"
                          : "Mark collected"}
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        disabled={actionBusy === (p.booking_id ?? `${p.item_id}-${p.collection_date || "na"}-${p.time_slot || "na"}`)}
                        onClick={() => markPickup(p, "rejected")}
                      >
                        {actionBusy === (p.booking_id ?? `${p.item_id}-${p.collection_date || "na"}-${p.time_slot || "na"}`)
                          ? "…"
                          : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}