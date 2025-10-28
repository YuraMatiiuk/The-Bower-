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
  status: string;
  image_url?: string | null;
  collection_date?: string;
  time_slot?: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "scheduled", label: "Scheduled" },
  { key: "collected", label: "Collected" },
  { key: "rejected", label: "Rejected" },
];

function Badge({ status }: { status: string }) {
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
    <span className={styles.badge}>
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

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "scheduled") {
      return items.filter((it) => (it.status === "approved" || it.status === "scheduled" || it.status === "pending-collection") && it.collection_date);
    }
    return items.filter((it) => it.status === activeFilter);
  }, [items, activeFilter]);

  return (
    <div className={styles.pageWrap}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>My Donor Dashboard</h1>
        <div className={styles.headerButtons}>
          <Link href="/donate" className={styles.primaryBtn}>
            New Donation
          </Link>
          <Link href="/collections" className={styles.secondaryBtn}>
            My Collections
          </Link>
        </div>
      </div>

      {/* Upcoming collections */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Upcoming Collections (next 7 days)</h2>
        {loading ? (
          <p>Loading…</p>
        ) : upcoming.length === 0 ? (
          <p>No scheduled collections in the next week.</p>
        ) : (
          <ul className={styles.listCol}>
            {upcoming.map((it) => (
              <li key={it.id} className={styles.cardRow}>
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className={styles.thumb} />
                ) : (
                  <div className={styles.thumbEmpty}>No image</div>
                )}
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <div className={styles.cardTitle}>{it.name}</div>
                    <Badge status={it.status} />
                  </div>
                  <div className={styles.cardLine}>
                    {fmtDate(it.collection_date)}{it.time_slot ? ` • ${it.time_slot}` : ""}
                  </div>
                  <div className={styles.cardSub}>{it.category} • {it.condition}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Profile */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>My Details</h2>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <form onSubmit={saveProfile} className={styles.grid2}>
            <div>
              <label className={styles.label}>Name</label>
              <input
                name="name"
                value={profile.name}
                onChange={onChange}
                className={styles.input}
                required
              />
            </div>
            <div>
              <label className={styles.label}>Email</label>
              <input
                name="email"
                value={profile.email}
                disabled
                className={`${styles.input} ${styles.inputDisabled}`}
              />
            </div>
            <div>
              <label className={styles.label}>Phone</label>
              <input
                name="phone"
                value={profile.phone || ""}
                onChange={onChange}
                className={styles.input}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={styles.label}>Street address</label>
              <input
                name="address"
                value={profile.address}
                onChange={onChange}
                className={styles.input}
                required
              />
            </div>
            <div>
              <label className={styles.label}>Suburb</label>
              <input
                name="suburb"
                value={profile.suburb}
                onChange={onChange}
                className={styles.input}
                required
              />
            </div>
            <div>
              <label className={styles.label}>Postcode</label>
              <input
                name="postcode"
                value={profile.postcode}
                onChange={onChange}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.actionsRow}>
              <button
                type="submit"
                disabled={saving}
                className={styles.saveBtn}
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
              {msg && <p className={styles.msg}>{msg}</p>}
            </div>
          </form>
        )}
      </section>

      {/* Filters + Donation history */}
      <section className={styles.section}>
        <div className={styles.listHeader}>
          <h2 className={styles.sectionTitle}>My Donations</h2>
          <div className={styles.filterRow}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={activeFilter === f.key ? styles.filterBtnActive : styles.filterBtn}
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
            <Link href="/donate" className={styles.link}>Donate an item</Link>
          </p>
        ) : (
          <div className={styles.gridCards}>
            {filteredItems.map((it) => (
              <div key={it.id} className={styles.cardRow}>
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    className={styles.thumb}
                  />
                ) : (
                  <div className={styles.thumbEmpty}>No image</div>
                )}
                <div className={styles.cardBody}>
                  <div className={styles.cardTitleRow}>
                    <div className={styles.cardTitle}>{it.name}</div>
                    <Badge status={it.status} />
                  </div>
                  <div className={styles.cardSub}>
                    {it.category} • {it.condition}
                  </div>
                  {it.collection_date && (
                    <div className={styles.cardLine}>
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
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}