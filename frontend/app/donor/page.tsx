"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";

type Profile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
};

type ItemRow = {
  id: number;
  name: string;
  category: string;
  condition: string;
  status: string; // 'pending' | 'approved' | 'rejected' | 'collected' | 'delivered' | maybe 'scheduled'
  image_url?: string | null;
  collection_date?: string; // ISO or 'YYYY-MM-DD' string
  time_slot?: string;       // '9-12' | '12-3' | '3-5' etc
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "scheduled", label: "Scheduled" }, // approved + has collection_date
  { key: "collected", label: "Collected" },
  { key: "rejected", label: "Rejected" },
];

function Badge({ status }: { status: string }) {
  const color =
    status === "pending"
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : status === "approved"
      ? "bg-blue-100 text-blue-800 border-blue-300"
      : status === "rejected"
      ? "bg-red-100 text-red-800 border-red-300"
      : status === "collected" || status === "delivered"
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-gray-100 text-gray-800 border-gray-300";
  const label =
    status === "pending"
      ? "Pending review"
      : status === "approved"
      ? "Approved"
      : status === "rejected"
      ? "Rejected"
      : status === "collected"
      ? "Collected"
      : status === "delivered"
      ? "Delivered"
      : status;
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded border ${color}`}>
      {label}
    </span>
  );
}

export default function DonorDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    name: "",
    email: "",
    phone: "",
    address: "",
    suburb: "",
    postcode: "",
  });
  const [items, setItems] = useState<ItemRow[]>([]);
  const [msg, setMsg] = useState<string>("");

  // filters
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/donor/summary", { validateStatus: () => true });
        if (res.status === 200) {
          setProfile(res.data.profile);
          setItems(res.data.items || []);
        } else if (res.status === 401) {
          setMsg("Please log in to view your donor dashboard.");
        } else {
          setMsg(res.data?.error || "Failed to load dashboard.");
        }
      } catch {
        setMsg("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
    setMsg("");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await axios.put("/api/donor/profile", profile, { validateStatus: () => true });
      if (res.status === 200) {
        setMsg("Profile saved ✅");
      } else {
        setMsg(res.data?.error || "Failed to save profile");
      }
    } catch {
      setMsg("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  // Upcoming collections: next 7 days (approved + has collection_date)
  const upcoming = useMemo(() => {
    const today = new Date();
    const in7 = new Date();
    in7.setDate(today.getDate() + 7);

    return (items || [])
      .filter((it) => {
        if (!it.collection_date) return false;
        const d = new Date(it.collection_date);
        const scheduled = it.status === "approved" || it.status === "scheduled" || it.status === "pending-collection";
        return scheduled && d >= startOfDay(today) && d <= endOfDay(in7);
      })
      .sort((a, b) => {
        const da = new Date(a.collection_date || 0).getTime();
        const db = new Date(b.collection_date || 0).getTime();
        return da - db;
      });
  }, [items]);

  // Filtered list for history grid
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "scheduled") {
      return items.filter((it) => (it.status === "approved" || it.status === "scheduled" || it.status === "pending-collection") && it.collection_date);
    }
    return items.filter((it) => it.status === activeFilter);
  }, [items, activeFilter]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Donor Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/donate" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            New Donation
          </Link>
          <Link href="/collections" className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700">
            My Collections
          </Link>
        </div>
      </div>

      {/* Upcoming collections */}
      <section className="bg-white rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Upcoming Collections (next 7 days)</h2>
        {loading ? (
          <p>Loading…</p>
        ) : upcoming.length === 0 ? (
          <p>No scheduled collections in the next week.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((it) => (
              <li key={it.id} className="border rounded p-3 flex items-start gap-3">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className="w-16 h-16 object-cover rounded border" />
                ) : (
                  <div className="w-16 h-16 rounded border bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                    No image
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{it.name}</div>
                    <Badge status={it.status} />
                  </div>
                  <div className="text-sm text-gray-700">
                    {fmtDate(it.collection_date)}{it.time_slot ? ` • ${it.time_slot}` : ""}
                  </div>
                  <div className="text-xs text-gray-600">{it.category} • {it.condition}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Profile */}
      <section className="bg-white rounded border p-4">
        <h2 className="text-lg font-medium mb-3">My Details</h2>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                name="name"
                value={profile.name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                name="email"
                value={profile.email}
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                name="phone"
                value={profile.phone || ""}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Street address</label>
              <input
                name="address"
                value={profile.address}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Suburb</label>
              <input
                name="suburb"
                value={profile.suburb}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Postcode</label>
              <input
                name="postcode"
                value={profile.postcode}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
              {msg && <p className="text-sm">{msg}</p>}
            </div>
          </form>
        )}
      </section>

      {/* Filters + Donation history */}
      <section className="bg-white rounded border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">My Donations</h2>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1 rounded border text-sm ${
                  activeFilter === f.key ? "bg-blue-600 text-white border-blue-700" : "bg-black"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : filteredItems.length === 0 ? (
          <p>No matching donations. <Link href="/donate" className="text-blue-700 underline">Donate an item</Link></p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((it) => (
              <div key={it.id} className="border rounded p-3 flex gap-3">
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    className="w-24 h-24 object-cover rounded border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-1000">
                    No image
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{it.name}</div>
                    <Badge status={it.status} />
                  </div>
                  <div className="text-sm text-gray-600">
                    {it.category} • {it.condition}
                  </div>
                  {it.collection_date && (
                    <div className="mt-1 text-sm text-gray-700">
                      Collection: {fmtDate(it.collection_date)}
                      {it.time_slot ? ` • ${it.time_slot}` : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function endOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}
function fmtDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s; // fallback
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}