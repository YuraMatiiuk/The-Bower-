"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BTN_BLUE = "#0873B9";

type Me = { name?: string; email?: string; user?: { name?: string; email?: string } };
type Profile = {
  name: string; email: string; phone?: string;
  address?: string; suburb?: string; postcode?: string;
};

export default function DonorDashboard() {
  const router = useRouter();

  // user menu
  const [me, setMe] = useState<Me>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // profile
  const [profile, setProfile] = useState<Profile>({
    name: "", email: "", phone: "", address: "", suburb: "", postcode: ""
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // donations (right panel list)
  type Donation = {
    id: number | string;
    name: string;
    status: "pending" | "approved" | "scheduled" | "collected" | "rejected";
    category?: string; condition?: string; created_at?: string;
  };
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationErr, setDonationErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Donation["status"]>("all");
  const STATUS_ORDER: Donation["status"][] = ["pending","approved","scheduled","collected","rejected"];

  // fetch auth/user
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (r.ok) setMe(await r.json());
      } catch {}
    })();
  }, []);

  // fetch profile + donations
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/donor/profile", { cache: "no-store", credentials: "include" });
        if (r.ok) {
          const p = await r.json();
          setProfile({
            name: p?.name ?? "", email: p?.email ?? "", phone: p?.phone ?? "",
            address: p?.address ?? "", suburb: p?.suburb ?? "", postcode: p?.postcode ?? ""
          });
        }
      } catch {}
    })();

    (async () => {
      try {
        const r = await fetch("/api/donor/donations", { cache: "no-store", credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          const list: Donation[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
          setDonations(list);
        } else setDonations([]);
      } catch { setDonationErr("Could not load your donations."); }
    })();
  }, []);

  // close menu on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // name + initials (same logic used elsewhere)
  const displayName = useMemo(() => {
    const name = (me?.name || me?.user?.name || "").trim();
    if (name) return name;
    const email = (me?.email || me?.user?.email || "").trim();
    return email ? email.split("@")[0] : "User";
  }, [me]);
  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    const t = (s: string) => (s && s[0] ? s[0].toUpperCase() : "");
    return (t(parts[0]) + t(parts[parts.length - 1] || "") || "U").slice(0, 2);
  }, [displayName]);

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.push("/login");
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveErr(null); setSaveMsg(null);
    try {
      const r = await fetch("/api/donor/profile", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (r.ok) setSaveMsg("Profile saved.");
      else {
        const d = await r.json().catch(() => ({}));
        setSaveErr(d?.error || "Failed to save profile.");
      }
    } catch { setSaveErr("Network error. Please try again."); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(null), 2000); }
  }

  const visibleDonations =
    filter === "all" ? donations : donations.filter(d => d.status === filter);

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      {/* HEADER */}
      <header className="px-8 pt-6 pb-4 border-b border-black/20">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <AwardIcon className="w-7 h-7" />
            Donor Dashboard
          </h1>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(s => !s)}
              className="flex items-center gap-3"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-semibold">
                {initials}
              </div>
              <span className="text-lg font-medium">{displayName}</span>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg z-10">
                <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" role="menuitem">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="px-6 md:px-8 py-8 flex justify-center">
        <div className="w-full max-w-6xl space-y-8">
          {/* TOP ROW: Upcoming + Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <section className="rounded-xl border border-gray-200 bg-white p-4 md:flex-1">
              <h2 className="text-base font-semibold mb-1">Upcoming Collections (next 7 days)</h2>
              <p className="text-sm text-gray-600">No scheduled collections in the next week.</p>
            </section>

            <div className="flex gap-3 md:w-auto">
              <button
                onClick={() => router.push("/donate")}
                className="h-10 px-4 rounded-md text-white font-medium"
                style={{ background: BTN_BLUE }}
              >
                New Donation
              </button>
              <button
                onClick={() => router.push("/collection")}
                className="h-10 px-4 rounded-md border border-gray-300"
              >
                My Collections
              </button>
            </div>
          </div>

          {/* PROFILE + DONATIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile */}
            <section className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-semibold mb-4">My Details</h2>

              <form onSubmit={onSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name">
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={profile.phone || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="Phone"
                  />
                </Field>
                <Field label="Street address">
                  <Input
                    value={profile.address || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Street address"
                  />
                </Field>
                <Field label="Suburb">
                  <Input
                    value={profile.suburb || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, suburb: e.target.value }))}
                    placeholder="Suburb"
                  />
                </Field>
                <Field label="Postcode">
                  <Input
                    value={profile.postcode || ""}
                    onChange={(e) => setProfile((p) => ({ ...p, postcode: e.target.value }))}
                    placeholder="Postcode"
                  />
                </Field>

                <div className="md:col-span-2 flex items-center gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-4 rounded-md text-white font-medium"
                    style={{ background: "#16A34A", opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? "Saving…" : "Save profile"}
                  </button>
                  {saveMsg && <span className="text-green-700 text-sm">{saveMsg}</span>}
                  {saveErr && <span className="text-red-600 text-sm">{saveErr}</span>}
                </div>
              </form>
            </section>

            {/* Donations */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">My Donations</h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="All" />
                {STATUS_ORDER.map((s) => (
                  <FilterPill
                    key={s}
                    active={filter === s}
                    onClick={() => setFilter(s)}
                    label={s[0].toUpperCase() + s.slice(1)}
                  />
                ))}
              </div>

              {donationErr && <p className="text-sm text-red-600 mb-2">{donationErr}</p>}

              {visibleDonations.length === 0 ? (
                <div className="text-sm text-gray-600">No matching donations.</div>
              ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                  {visibleDonations.map((d) => (
                    <li key={d.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{d.name}</div>
                        <div className="text-xs text-gray-500">
                          {[
                            d.category && `Category: ${d.category}`,
                            d.condition && `Condition: ${d.condition}`,
                            d.created_at && new Date(d.created_at).toLocaleDateString(),
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md ${statusClass(d.status)}`}>
                        {d.status[0].toUpperCase() + d.status.slice(1)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- small UI helpers ---------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "h-11 rounded-md border border-gray-300 bg-white px-3 outline-none " +
        "focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20 " +
        (props.className || "")
      }
    />
  );
}
function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "h-8 px-3 rounded-md text-sm border " +
        (active ? "bg-[#0873B9] text-white border-[#0873B9]" : "bg-black/5 border-gray-300")
      }
    >
      {label}
    </button>
  );
}
function statusClass(s: "pending"|"approved"|"scheduled"|"collected"|"rejected") {
  switch (s) {
    case "pending":   return "bg-yellow-100 text-yellow-800";
    case "approved":  return "bg-blue-100 text-blue-800";
    case "scheduled": return "bg-purple-100 text-purple-800";
    case "collected": return "bg-green-100 text-green-800";
    case "rejected":  return "bg-red-100 text-red-800";
    default:          return "bg-gray-100 text-gray-800";
  }
}
function UserIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function AwardIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M8 12l-2 10 6-3 6 3-2-10" />
    </svg>
  );
}
