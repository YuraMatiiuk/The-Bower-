"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./deliveries.css";

type Me = { name?: string; email?: string; user?: { name?: string; email?: string } };
type Row = {
  reservation_id: number;
  item_id: number;
  item_name: string;
  category: string;
  condition: string;
  reservation_status: string;
};

const BTN_BLUE = "#0873B9";

export default function DeliveriesPage() {
  const router = useRouter();

  // ----- Header user -----
  const [me, setMe] = useState<Me>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (r.ok) setMe(await r.json());
      } catch {}
    })();
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const displayName = useMemo(() => {
    const n = (me?.name || me?.user?.name || "").trim();
    if (n) return n;
    const e = (me?.email || me?.user?.email || "").trim();
    return e ? e.split("@")[0] : "User";
  }, [me]);

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    const first = parts[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    const firstCh = first.charAt(0).toUpperCase();
    const lastCh = last.charAt(0).toUpperCase();
    return (firstCh + lastCh || "U").slice(0, 2);
  }, [displayName]);

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.push("/login");
  }

  // ----- Content (original logic preserved) -----
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // per-reservation inputs
  const [dates, setDates] = useState<Record<number, string>>({});
  const [slots, setSlots] = useState<Record<number, string>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await axios.get("/api/deliveries", { withCredentials: true });
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
      const res = await axios.post(
        "/api/deliveries",
        { reservationId, itemId, deliveryDate, timeSlot },
        { withCredentials: true }
      );
      setMsg(res.data?.message || "Delivery scheduled");
      load();
    } catch (e: any) {
      console.error(e);
      setMsg(e?.response?.data?.error || "Failed to schedule delivery");
    }
  }

  return (
    <div className="dl-root">
      {/* HEADER */}
      <header className="dl-header">
        <div className="dl-header__inner">
          <h1 className="dl-title">
            <TruckIcon className="dl-title__icon" />
            Schedule Deliveries
          </h1>

          <div ref={menuRef} className="dl-user">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="dl-user__btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="dl-user__avatar">{initials}</span>
              <span className="dl-user__name">{displayName}</span>
              <svg viewBox="0 0 20 20" className="dl-user__chev" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="dl-user__menu">
                <button onClick={onLogout} className="dl-user__menuitem">Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="dl-main">
        <div className="dl-container">
          {/* back + link row (match Reservations) */}
          <div className="dl-backrow">
            <Link href="/marketplace" className="dl-backlink">← Back to Marketplace</Link>
            <Link href="/marketplace/reservations" className="dl-linkbtn">My Reservations</Link>
          </div>

          {msg && <p className="dl-msg">{msg}</p>}

          {loading ? (
            <div className="dl-pad">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="dl-pad">No reservations need scheduling right now.</div>
          ) : (
            <section className="dl-tablecard">
              <div className="dl-tablecard__head">Deliveries to Schedule</div>
              <div className="dl-tablewrap">
                <table className="dl-table">
                  <thead>
                    <tr className="dl-thead" style={{ background: BTN_BLUE }}>
                      <th className="dl-th">Item</th>
                      <th className="dl-th">Category</th>
                      <th className="dl-th">Condition</th>
                      <th className="dl-th">Delivery Date</th>
                      <th className="dl-th">Time Slot</th>
                      <th className="dl-th">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.reservation_id} className="dl-row">
                        <td className="dl-td">{r.item_name}</td>
                        <td className="dl-td">{r.category}</td>
                        <td className="dl-td">{r.condition}</td>
                        <td className="dl-td">
                          <input
                            type="date"
                            className="dl-input"
                            value={dates[r.reservation_id] || ""}
                            onChange={(e) =>
                              setDates((d) => ({ ...d, [r.reservation_id]: e.target.value }))
                            }
                          />
                        </td>
                        <td className="dl-td">
                          <select
                            className="dl-select"
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
                        <td className="dl-td">
                          <button
                            onClick={() => schedule(r.reservation_id, r.item_id)}
                            className="dl-btn dl-btn--green"
                          >
                            Schedule
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function TruckIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7h10v7H3zM13 9h5l3 3v2h-8z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  );
}