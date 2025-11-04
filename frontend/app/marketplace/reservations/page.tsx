"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./reservations.css";

type Me = { name?: string; email?: string; user?: { name?: string; email?: string } };
const BTN_BLUE = "#0873B9";

export default function ReservationsPage() {
  const router = useRouter();

  // ----- HEADER USER -----
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

  // ----- CONTENT -----
  const [caseworkerName, setCaseworkerName] = useState("");
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchReservations() {
    if (!caseworkerName.trim()) {
      setMessage("Please enter your name to view reservations.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get("/api/marketplace/reservations", {
        params: { caseworkerName },
        withCredentials: true,
      });
      setReservations(res.data || []);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("Error fetching reservations.");
      setReservations([]);
    }
    setLoading(false);
  }

  return (
    <div className="rs-root">
      {/* HEADER */}
      <header className="rs-header">
        <div className="rs-header__inner">
          <h1 className="rs-title">
            <ClipboardIcon className="rs-title__icon" />
            My Reservations
          </h1>

          <div ref={menuRef} className="rs-user">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="rs-user__btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="rs-user__avatar">{initials}</span>
              <span className="rs-user__name">{displayName}</span>
              <svg viewBox="0 0 20 20" className="rs-user__chev" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="rs-user__menu">
                <button onClick={onLogout} className="rs-user__menuitem">Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="rs-main">
        <div className="rs-container">
          <div className="rs-back">
            <Link href="/marketplace" className="rs-backlink">← Back to Marketplace</Link>
          </div>

          <section className="rs-card">
            <h2 className="rs-card__title">Find Reservations</h2>
            <div className="rs-search">
              <input
                value={caseworkerName}
                onChange={(e) => setCaseworkerName(e.target.value)}
                placeholder="Enter your name"
                className="rs-input"
              />
              <button
                onClick={fetchReservations}
                className="rs-btn"
                style={{ background: BTN_BLUE }}
              >
                View Reservations
              </button>
            </div>
          </section>

          {message && <p className="rs-msg">{message}</p>}

          <section className="rs-tablecard">
            <div className="rs-tablehead">Results</div>
            {loading ? (
              <div className="rs-pad">Loading reservations…</div>
            ) : reservations.length === 0 ? (
              <div className="rs-pad">No reservations found.</div>
            ) : (
              <div className="rs-tablewrap">
                <table className="rs-table">
                  <thead>
                    <tr className="rs-thead">
                      <th className="rs-th">Item</th>
                      <th className="rs-th">Category</th>
                      <th className="rs-th">Condition</th>
                      <th className="rs-th">Agency</th>
                      <th className="rs-th">Status</th>
                      <th className="rs-th">Reserved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r: any) => (
                      <tr key={r.id} className="rs-row">
                        <td className="rs-td">{r.item_name}</td>
                        <td className="rs-td">{r.category}</td>
                        <td className="rs-td">{r.condition}</td>
                        <td className="rs-td">{r.agency || "—"}</td>
                        <td className="rs-td">{r.status}</td>
                        <td className="rs-td">{r.reserved_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ClipboardIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4h6v3H9z" />
    </svg>
  );
}