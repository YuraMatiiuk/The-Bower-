"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import styles from "../../styles/DonorDashboard.module.css";

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
  status: string; // 'pending' | 'approved' | 'rejected' | 'collected' | 'delivered' | 'scheduled'
  image_url?: string | null;
  collection_date?: string; // ISO string
  time_slot?: string;       // '9-12' | '12-3' | '3-5'
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "scheduled", label: "Scheduled" }, // approved + has collection_date
  { key: "collected", label: "Collected" },
  { key: "rejected", label: "Rejected" },
];

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "pending"
      ? `${styles.badge} ${styles.badgePending}`
      : status === "approved"
      ? `${styles.badge} ${styles.badgeApproved}`
      : status === "rejected"
      ? `${styles.badge} ${styles.badgeRejected}`
      : status === "collected" || status === "delivered"
      ? `${styles.badge} ${styles.badgeCollected}`
      : `${styles.badge} ${styles.badgeDefault}`;
  return <span className={cls}>{status}</span>;
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

  // Approved but not scheduled (for the banner)
  const approvedUnscheduledCount = useMemo(
    () => items.filter((it) => it.status === "approved" && !it.collection_date).length,
    [items]
  );

  // Upcoming collections: next 7 days
  const upcoming = useMemo(() => {
    const today = new Date();
    const in7 = new Date();
    in7.setDate(today.getDate() + 7);

    return (items || [])
      .filter((it) => {
        if (!it.collection_date) return false;
        const d = new Date(it.collection_date);
        const scheduled =
          it.status === "approved" ||
          it.status === "scheduled" ||
          it.status === "pending-collection";
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
      return items.filter(
        (it) =>
          (it.status === "approved" ||
            it.status === "scheduled" ||
            it.status === "pending-collection") &&
          it.collection_date
      );
    }
    return items.filter((it) => it.status === activeFilter);
  }, [items, activeFilter]);

  return (
    <div className={`max-w-5xl mx-auto p-6 space-y-8 ${styles.darkWrap}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={styles.headerBar}>
          <h1 className={styles.title}>My Donor Dashboard</h1>
          <div className={styles.ctaRow}>
            <Link href="/donate" className={`${styles.btn} ${styles.btnPrimary}`}>
              New Donation
            </Link>
            <Link href="/collections/book" className={`${styles.btn} ${styles.btnSecondary}`}>
              Book Collection
            </Link>
          </div>
        </div>
      </div>

      {/* Notice: approved items waiting for booking */}
      {approvedUnscheduledCount > 0 && (
        <div className="rounded border border-blue-700 p-3 bg-blue-950/40 text-sm flex items-center justify-between">
          <span>
            You have <strong>{approvedUnscheduledCount}</strong> approved item
            {approvedUnscheduledCount > 1 ? "s" : ""} waiting to be scheduled for collection.
          </span>
          <Link href="/collections/book" className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
            Book now
          </Link>
        </div>
      )}

      {/* Upcoming collections (read-only) */}
      <section className={styles.panelDark}>
        <h2 className="text-lg font-medium mb-3">Upcoming Collections (next 7 days)</h2>
        {loading ? (
          <p>Loading…</p>
        ) : upcoming.length === 0 ? (
          <p>No scheduled collections in the next week.</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((it) => (
              <li key={it.id} className={`${styles.cardDark} flex items-start gap-3`}>
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    className="w-16 h-16 object-cover rounded border border-gray-700"
                  />
                ) : (
                  <div className={styles.thumbEmpty}>No image</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{it.name}</div>
                    <StatusBadge status={it.status} />
                  </div>
                  <div className="text-sm text-gray-200">
                    {fmtDate(it.collection_date)}
                    {it.time_slot ? ` • ${it.time_slot}` : ""}
                  </div>
                  <div className="text-xs text-gray-300">
                    {it.category} • {it.condition}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Profile */}
      <section className={styles.panelDark}>
        <h2 className="text-lg font-medium mb-3">My Details</h2>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={styles.label}>Name</label>
              <input
                name="name"
                value={profile.name}
                onChange={onChange}
                className={styles.inputDark}
                required
              />
            </div>
            <div>
              <label className={styles.label}>Email</label>
              <input
                name="email"
                value={profile.email}
                disabled
                className={`${styles.inputDark} opacity-70`}
              />
            </div>
            <div>
              <label className={styles.label}>Phone</label>
              <input
                name="phone"
                value={profile.phone || ""}
                onChange={onChange}
                className={styles.inputDark}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={styles.label}>Street address</label>
              <input
                name="address"
                value={profile.address}
                onChange={onChange}
                className={styles.inputDark}
                required
              />
            </div>
            <div>
              <label className={styles.label}>Suburb</label>
              <input
                name="suburb"
                value={profile.suburb}
                onChange={onChange}
                className={styles.inputDark}
                required
              />
            </div>
            <div>
              <label className={styles.label}>Postcode</label>
              <input
                name="postcode"
                value={profile.postcode}
                onChange={onChange}
                className={styles.inputDark}
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
              {msg && <p className={styles.msg}>{msg}</p>}
            </div>
          </form>
        )}
      </section>

      {/* Donations list (read-only for scheduling) */}
      <section className={styles.panelDark}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">My Donations</h2>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`${styles.filterBtn} ${activeFilter === f.key ? styles.filterBtnActive : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : filteredItems.length === 0 ? (
          <p>
            No matching donations.{" "}
            <Link href="/donate" className="underline">Donate an item</Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((it) => (
              <div key={it.id} className={`${styles.cardDark} flex gap-3`}>
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    className="w-24 h-24 object-cover rounded border border-gray-700"
                  />
                ) : (
                  <div className={styles.thumbEmpty}>No image</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{it.name}</div>
                    <StatusBadge status={it.status} />
                  </div>
                  <div className="text-sm text-gray-300">
                    {it.category} • {it.condition}
                  </div>
                  {it.collection_date && (
                    <div className="mt-1 text-sm text-gray-200">
                      Collection: {fmtDate(it.collection_date)}
                      {it.time_slot ? ` • ${it.time_slot}` : ""}
                    </div>
                  )}
                  {/* No booking controls here; booking is on /collections/book */}
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
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}