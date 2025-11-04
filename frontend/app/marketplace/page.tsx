"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./marketplace.css";

type Me = { name?: string; email?: string; user?: { name?: string; email?: string } };

export default function MarketplacePage() {
  const router = useRouter();

  // ---- Header user state ----
  const [me, setMe] = useState<Me>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (r.ok) setMe(await r.json());
      } catch { /* noop */ }
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
    const firstCh: string = first.charAt(0).toUpperCase();
    const lastCh: string = last.charAt(0).toUpperCase();
    const combo = (firstCh + lastCh).trim() || "U";
    return combo.slice(0, 2);
  }, [displayName]);

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.push("/login");
  }

  // ---- Original marketplace logic kept ----
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [caseworkerName, setCaseworkerName] = useState("");
  const [agency, setAgency] = useState("");

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await axios.get("/api/marketplace/items", { withCredentials: true });
      setItems(res.data || []);
    } catch (err) {
      console.error(err);
      setItems([]);
    }
    setLoading(false);
  }

  async function reserveItem(itemId: number) {
    if (!caseworkerName.trim()) {
      setMessage("Caseworker name is required.");
      return;
    }
    try {
      const res = await axios.post(
        "/api/marketplace/reserve",
        { itemId, caseworkerName, agency },
        { withCredentials: true }
      );
      setMessage(res.data?.message || "Reserved.");
      fetchItems();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.response?.data?.error || "Error reserving item");
    }
  }

  return (
    <div className="mp-root">
      {/* HEADER */}
      <header className="mp-header">
        <div className="mp-header__inner">
          <h1 className="mp-title">
            <StoreIcon className="mp-title__icon" />
            Caseworker Marketplace
          </h1>

          <div ref={menuRef} className="mp-user">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="mp-user__btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="mp-user__avatar" aria-hidden>{initials}</span>
              <span className="mp-user__name">{displayName}</span>
              <svg viewBox="0 0 20 20" className="mp-user__chev" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div role="menu" className="mp-user__menu">
                <button onClick={onLogout} className="mp-user__menuitem" role="menuitem">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mp-main">
        <div className="mp-container">
          {/* quick links */}
          <div className="mp-links">
            <Link href="/marketplace/reservations" className="mp-linkbtn">My Reservations</Link>
            <Link href="/marketplace/deliveries" className="mp-linkbtn">Schedule Deliveries</Link>
          </div>

          {/* caseworker info */}
          <section className="mp-card">
            <h2 className="mp-card__title">Your Details</h2>
            <div className="mp-grid">
              <label className="mp-field">
                <span className="mp-field__label">Caseworker Name</span>
                <input
                  value={caseworkerName}
                  onChange={(e) => setCaseworkerName(e.target.value)}
                  placeholder="Enter your name"
                  className="mp-input"
                />
              </label>
              <label className="mp-field">
                <span className="mp-field__label">Agency (optional)</span>
                <input
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  placeholder="Enter agency"
                  className="mp-input"
                />
              </label>
            </div>
          </section>

          {message && <p className="mp-msg">{message}</p>}

          {/* items */}
          <section className="mp-tablecard">
            <div className="mp-tablecard__head">Available Items</div>
            {loading ? (
              <div className="mp-pad">Loading items…</div>
            ) : items.length === 0 ? (
              <div className="mp-pad">No approved items available right now.</div>
            ) : (
              <div className="mp-tablewrap">
                <table className="mp-table">
                  <thead>
                    <tr className="mp-thead">
                      <th className="mp-th">Item</th>
                      <th className="mp-th">Category</th>
                      <th className="mp-th">Condition</th>
                      <th className="mp-th">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className="mp-row">
                        <td className="mp-td">{item.name}</td>
                        <td className="mp-td">{item.category}</td>
                        <td className="mp-td">{item.condition}</td>
                        <td className="mp-td">
                          <button onClick={() => reserveItem(item.id)} className="mp-btn">
                            Reserve
                          </button>
                        </td>
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

function StoreIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l1-5h16l1 5M4 9h16v11H4zM9 14h6" />
    </svg>
  );
}