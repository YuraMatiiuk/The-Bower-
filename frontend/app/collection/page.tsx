"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./collection.css";

/* ---------- Types ---------- */
type Me =
  | { name?: string; email?: string; user?: { name?: string } }
  | Record<string, unknown>;

/* ---------- Helpers ---------- */
function getInitials(name?: string, email?: string) {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0]! + parts[1][0]!).toUpperCase();
    return parts[0][0]!.toUpperCase();
  }
  if (email && email.length) return email[0]!.toUpperCase();
  return "U";
}

export default function CollectionsPage() {
  /* ----- original state (kept) ----- */
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [message, setMessage] = useState("");

  /* ----- added: user + menu for header ----- */
  const router = useRouter();
  const [me, setMe] = useState<Me>({});
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (res.ok) setMe(await res.json());
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const rawName =
    (typeof (me as any)?.name === "string" ? (me as any).name : (me as any)?.user?.name) || "";
  const displayName = (rawName || "").trim() || "User";
  const email = (me as any)?.email as string | undefined;
  const initials = getInitials(displayName, email);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/login");
  }

  /* ----- original effects/handlers (kept) ----- */
  useEffect(() => {
    fetchApprovedItems();
  }, []);

  const fetchApprovedItems = async () => {
    try {
      const res = await axios.get("/api/collections");
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/collections", {
        itemId: selectedItem,
        collectionDate: date,
        timeSlot,
      });
      setMessage(res.data.message);
      setSelectedItem("");
      setDate("");
      setTimeSlot("");
      fetchApprovedItems();
    } catch (err: any) {
      console.error(err);
      setMessage("Error booking collection");
    }
  };

  return (
    <div className="collection-screen min-h-screen">
      {/* -------- Header (matches your /admin design) -------- */}
      <header className="colhdr">
        <div className="colhdr__inner">
          <div className="colhdr__left">
            <ClipboardLogo className="colhdr__mark" />
            <div className="colhdr__title">Collection Dashboard</div>
          </div>

          <div ref={menuRef} className="colhdr__user">
            <button
              onClick={() => setMenuOpen((prev: boolean) => !prev)}
              className="colhdr__userbtn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="colhdr__avatar" aria-hidden>
                {initials}
              </span>
              <span className="colhdr__name">{displayName}</span>
              <svg viewBox="0 0 20 20" className="colhdr__chev" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div role="menu" className="colhdr__menu">
                <button onClick={onLogout} className="colhdr__menuitem" role="menuitem">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
        <hr className="colhdr__rule" />
      </header>

      {/* -------- Main -------- */}
      <main className="px-6 md:px-8 py-8 flex justify-center">
        <div className="w-full max-w-6xl space-y-6">
          {/* Back link */}
          <Link href="/donor" className="backlink">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Two-column layout: form + calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ----- Original form, just styled ----- */}
            <section className="panel">
              <h2 className="panel__title">Book a Collection</h2>

              {message && <p className="banner">{message}</p>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="field">
                  <span className="field__label">Select Approved Item</span>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">-- Select Item --</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category}, {item.condition})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Collection Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="input"
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Preferred Time Slot</span>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">-- Select Time Slot --</option>
                    <option value="9am-12pm">9am – 12pm</option>
                    <option value="12pm-3pm">12pm – 3pm</option>
                    <option value="3pm-5pm">3pm – 5pm</option>
                  </select>
                </label>

                <button type="submit" className="btn btn--success">
                  Book Collection
                </button>
              </form>
            </section>

            {/* ----- Calendar (visual only) ----- */}
            <section className="panel">
              <div className="flex items-center justify-between mb-3">
                <h2 className="panel__title">Collection Calendar</h2>
              </div>

              <div className="calendar">
                <div className="calendar__dow">
                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                    <div key={d} className="calendar__dowcell">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="calendar__grid">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="calendar__cell">
                      <div className="calendar__day">{i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Icons ---------- */
function ArrowLeft({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClipboardLogo({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 2h6v3H9z" />
      <path d="M9 10h6M9 14h3" strokeLinecap="round" />
    </svg>
  );
}