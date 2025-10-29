"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/* ----------------------------
   Types & constants
---------------------------- */
type AnyObj = Record<string, any>;
type Me = { name?: string; email?: string; full_name?: string; fullName?: string; first_name?: string; last_name?: string; username?: string; user?: AnyObj; profile?: AnyObj; payload?: AnyObj };
type Profile = { name?: string; email?: string };
type ApprovedItem = { id: number | string; name: string };

const BTN_BLUE = "#0873B9";
const TIME_SLOTS = ["08:00 — 10:00", "10:00 — 12:00", "12:00 — 14:00", "14:00 — 16:00"];

/* Robust display name + avatar helpers */
function getIn(obj: AnyObj | undefined, path: string): any {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
}
function resolveName(source: AnyObj | undefined): string {
  if (!source) return "";
  const parts: string[] = [];
  parts.push(
    source.name, source.full_name, source.fullName,
    [source.first_name, source.last_name].filter(Boolean).join(" "),
    source.username
  );
  ["user.name","user.full_name","user.fullName","user.username","profile.name","profile.full_name","profile.fullName","payload.name"]
    .forEach(p => parts.push(getIn(source, p)));
  if (source.email) parts.push(String(source.email).split("@")[0]);
  ["user.email","profile.email","payload.email"].forEach(p => {
    const em = getIn(source, p); if (em) parts.push(String(em).split("@")[0]);
  });
  const cleaned = parts.map(v => String(v ?? "").trim()).filter(Boolean);
  return cleaned[0] || "";
}
function UserAvatar({ name, email }: { name?: string; email?: string }) {
  const text = (() => {
    if (name && name.trim()) {
      const p = name.trim().split(/\s+/);
      if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
      return name[0]?.toUpperCase() || "?";
    }
    if (email) return email[0]?.toUpperCase() || "?";
    return "?";
  })();
  return (
    <div className="w-8 h-8 rounded-full bg-[#0873B9] text-white flex items-center justify-center text-sm font-semibold">
      {text}
    </div>
  );
}

/* ----------------------------
   Page
---------------------------- */
export default function CollectionDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me>({});
  const [profile, setProfile] = useState<Profile>({});
  const displayName = useMemo(() => resolveName(me) || resolveName(profile) || "User", [me, profile]);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // approved items list
  const [items, setItems] = useState<ApprovedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // form state
  const [itemId, setItemId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [slot, setSlot] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (meRes.ok) setMe(await meRes.json());
      } catch {}
    })();

    (async () => {
      try {
        const pRes = await fetch("/api/donor/profile", { cache: "no-store", credentials: "include" });
        if (pRes.ok) setProfile(await pRes.json());
      } catch {}
    })();

    (async () => {
      try {
        const res = await fetch("/api/donor/approved-items", { cache: "no-store", credentials: "include" });
        if (res.ok) {
          const arr = await res.json();
          const list: ApprovedItem[] = Array.isArray(arr) ? arr : (arr?.items ?? []);
          setItems(list);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoadingItems(false);
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!itemId || !date || !slot) {
      setErr("Please choose an item, date, and time slot.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, date, time_slot: slot }),
      });

      if (res.ok) {
        setMsg("Collection booked!");
        setItemId(""); setDate(""); setSlot("");
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error || "Failed to book collection.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E] flex flex-col">
      {/* HEADER */}
      <header className="px-8 pt-6 pb-4 border-b border-black/20">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left: Black logo + Title */}
          <div className="flex items-center gap-3 text-black">
            <ClipboardLogo className="w-8 h-8" />
            <h1 className="text-2xl font-semibold">Collection Dashboard</h1>
          </div>

          {/* Right: User menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-3 text-lg text-gray-800"
            >
              <UserAvatar name={displayName} email={me?.email || profile?.email} />
              <span className="font-medium">{displayName}</span>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="px-6 md:px-8 py-8 flex justify-center">
        <div className="w-full max-w-6xl space-y-6">
          {/* Back link */}
          <Link href="/donor" className="inline-flex items-center gap-2 text-[#0873B9] hover:underline">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {/* Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Booking form */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold mb-4">Book a Collection</h2>

              <form onSubmit={onSubmit} className="space-y-4">
                <label className="grid gap-2 text-sm">
                  <span>Select Approved Item</span>
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className="h-11 rounded-md border border-gray-300 bg-white px-3 outline-none focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20"
                    disabled={loadingItems}
                  >
                    <option value="">{loadingItems ? "Loading…" : "-- Select Item --"}</option>
                    {items.map((it) => (
                      <option key={String(it.id)} value={String(it.id)}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  <span>Collection Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11 rounded-md border border-gray-300 bg-white px-3 outline-none focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span>Preferred Time Slot</span>
                  <select
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    className="h-11 rounded-md border border-gray-300 bg-white px-3 outline-none focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20"
                  >
                    <option value="">-- Select Time Slot --</option>
                    {TIME_SLOTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>

                {err && <p className="text-sm text-red-600">{err}</p>}
                {msg && <p className="text-sm text-green-700">{msg}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 px-4 rounded-md text-white font-medium w-full sm:w-auto"
                  style={{ background: "#16A34A", opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "Booking…" : "Book Collection"}
                </button>
              </form>
            </section>

            {/* Calendar */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Collection Calendar</h2>
              </div>

              <div className="grid grid-cols-7 text-xs text-gray-600 mb-2">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                  <div key={d} className="py-1 text-center font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden text-sm">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="bg-white h-20 p-2">
                    <div className="text-gray-500">{i + 1}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ----------------------------
   Icons
---------------------------- */
function ArrowLeft({ className = "w-4 h-4" }) {
  return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
function ClipboardLogo({ className = "w-6 h-6" }) {
  return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M9 2h6v3H9z" /><path d="M9 10h6M9 14h3" strokeLinecap="round" /></svg>);
}
