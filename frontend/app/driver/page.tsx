"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BTN_BLUE = "#0873B9";

export default function DriverDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<any>({});
  const [profile, setProfile] = useState<any>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // --- Fetch user data ---
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (r.ok) setMe(await r.json());
      } catch {}
    })();

    (async () => {
      try {
        const r = await fetch("/api/donor/profile", { cache: "no-store", credentials: "include" });
        if (r.ok) setProfile(await r.json());
      } catch {}
    })();
  }, []);

  // --- Resolve name (same logic as other dashboards) ---
  function resolveName(): string {
    if (typeof me?.name === "string" && me.name.trim()) return me.name.trim();
    if (typeof profile?.name === "string" && profile.name.trim()) return profile.name.trim();
    if (typeof me?.user?.name === "string" && me.user.name.trim()) return me.user.name.trim();
    if (typeof me?.profile?.name === "string" && me.profile.name.trim()) return me.profile.name.trim();
    const email =
      (typeof me?.email === "string" && me.email) ||
      (typeof me?.user?.email === "string" && me.user.email) ||
      (typeof profile?.email === "string" && profile.email);
    if (email && typeof email === "string") {
      const pre = email.split("@")[0];
      if (pre) return pre;
    }
    return "User";
  }

  const displayName = useMemo(resolveName, [me, profile]);
  const initials = useMemo(() => {
    const parts = String(displayName).split(" ").filter(Boolean);
    const first = parts[0]?.[0]?.toUpperCase() || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() : "";
    return (first + last) || "U";
  }, [displayName]);

  // --- Menu + logout ---
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      {/* HEADER */}
      <header className="px-8 pt-6 pb-4 border-b border-black/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <TruckIcon className="w-7 h-7" />
            Driver Dashboard
          </h1>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-3"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span
                className="inline-grid place-items-center w-9 h-9 rounded-full text-white text-sm font-semibold"
                style={{ background: "#111827" }}
              >
                {initials}
              </span>
              <span className="text-lg font-medium">{displayName}</span>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg z-10"
              >
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  role="menuitem"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="px-6 md:px-8 py-8 flex justify-center">
        <div className="w-full max-w-6xl space-y-8">
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold mb-3">Today's Schedule</h2>
            <p className="text-sm text-gray-600">
              No deliveries or pickups assigned yet. Once dispatch adds new jobs, they'll appear here
              with address, contact details, and time window.
            </p>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold mb-3">Driver Notes</h2>
            <ul className="text-sm text-gray-700 list-disc ml-5 space-y-2">
              <li>Inspect vehicle and safety gear before each shift.</li>
              <li>Confirm donor address and access notes prior to arrival.</li>
              <li>Report any delays or damage with supporting photos.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ---------- Icons ---------- */
function TruckIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h11v8H3z" />
      <path d="M14 10h4l3 3v1h-7z" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
