// app/collections/book/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";

type ApprovedItem = {
  id: number;
  name: string;
  category: string;
  condition: string;
  status: string;
  image_url?: string | null;
};

const SLOTS = ["9-12", "12-3", "3-5"];

export default function BookCollectionsPage() {
  const [approved, setApproved] = useState<ApprovedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");

  const allSelected = useMemo(
    () => approved.length > 0 && selected.size === approved.length,
    [approved, selected]
  );

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      // Reuse donor collections GET to fetch "approvedItems"
      const res = await axios.get("/api/collections", { validateStatus: () => true });
      if (res.status === 200) {
        setApproved(res.data.approvedItems || []);
      } else if (res.status === 401) {
        setMsg("Please log in.");
      } else {
        setMsg(res.data?.error || "Failed to load.");
      }
    } catch {
      setMsg("Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggleOne(id: number, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(approved.map(a => a.id));
    });
  }

  async function submit() {
    setMsg("");
    if (selected.size === 0) {
      setMsg("Please select at least one item.");
      return;
    }
    if (!date || !slot) {
      setMsg("Please choose a date and time slot.");
      return;
    }
    setBusy(true);
    try {
      const res = await axios.post(
        "/api/collections/bulk",
        { itemIds: Array.from(selected), date, time_slot: slot },
        { validateStatus: () => true }
      );
      if (res.status === 201) {
        const okCount = (res.data?.results || []).filter((r: any) => r.ok).length;
        const failCount = (res.data?.results || []).length - okCount;
        setMsg(`Booked ${okCount} item(s). ${failCount ? `${failCount} failed.` : ""}`);
        // refresh list to remove newly-booked items
        setSelected(new Set());
        await load();
      } else if (res.status === 401) {
        setMsg("Please log in.");
      } else {
        setMsg(res.data?.error || "Booking failed");
      }
    } catch {
      setMsg("Booking failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Book Collections</h1>
        <div className="flex gap-2">
          <Link href="/donor" className="px-3 py-2 rounded border">My Dashboard</Link>
          <Link href="/collections" className="px-3 py-2 rounded border">My Bookings</Link>
          <Link href="/donate" className="px-3 py-2 rounded border">Donate</Link>
        </div>
      </div>

      {msg && <div className="p-2 rounded border bg-yellow-50 text-sm">{msg}</div>}

      {/* Bulk controls */}
      <section className="border rounded p-4">
        <h2 className="text-lg font-medium mb-3">Choose pickup date & time</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Time slot</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              <option value="">Select…</option>
              {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={submit}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 w-full"
            >
              {busy ? "Booking…" : "Book selected items"}
            </button>
          </div>
        </div>
      </section>

      {/* Items picker */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Approved Items (not yet booked)</h2>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            Select all
          </label>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : approved.length === 0 ? (
          <p>No approved items awaiting booking.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approved.map(it => {
              const checked = selected.has(it.id);
              return (
                <label
                  key={it.id}
                  className={`border rounded p-3 flex gap-3 cursor-pointer ${checked ? "ring-2 ring-blue-500" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={(e) => toggleOne(it.id, e.target.checked)}
                  />
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="w-20 h-20 object-cover rounded border" />
                  ) : (
                    <div className="w-20 h-20 rounded border bg-gray-100 text-xs text-gray-500 flex items-center justify-center">No image</div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">#{it.id} — {it.name}</div>
                    <div className="text-sm text-gray-600">{it.category} • {it.condition}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}