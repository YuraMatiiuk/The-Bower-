"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const BTN_BLUE = "#0873B9";

type ItemRow = { name: string; category: string; condition: string };

const CATEGORY_OPTIONS = ["Sofa / Couch","Bed / Mattress","Table","Chairs","Storage","Appliances","Electronics","Other"];
const CONDITION_OPTIONS = ["Excellent","Good","Fair","Poor"];

export default function DonatePage() {
  const router = useRouter();

  // keep these as 'any' so we can support different API shapes
  const [me, setMe] = useState<any>({});
  const [profile, setProfile] = useState<any>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<ItemRow[]>([{ name: "", category: "", condition: "" }]);
  const [street, setStreet] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // --- Fetchers (same pattern as your other pages) ---
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (r.ok) setMe(await r.json());
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/donor/profile", { cache: "no-store", credentials: "include" });
        if (r.ok) setProfile(await r.json());
      } catch {}
    })();
  }, []);

  // --- Name resolution identical in spirit to the dashboards, but more tolerant ---
  function getName(): string {
    // exact field
    if (typeof me?.name === "string" && me.name.trim()) return me.name.trim();
    if (typeof profile?.name === "string" && profile.name.trim()) return profile.name.trim();

    // common nested shapes
    if (typeof me?.user?.name === "string" && me.user.name.trim()) return me.user.name.trim();
    if (typeof me?.profile?.name === "string" && me.profile.name.trim()) return me.profile.name.trim();

    // fall back to email prefix (me or profile)
    const email =
      (typeof me?.email === "string" && me.email) ||
      (typeof me?.user?.email === "string" && me.user.email) ||
      (typeof profile?.email === "string" && profile.email);
    if (email && typeof email === "string") {
      const prefix = email.split("@")[0];
      if (prefix) return prefix;
    }
    return "User";
  }

  const displayName = useMemo(getName, [me, profile]);
  const initials = useMemo(() => {
    const parts = String(displayName).split(" ").filter(Boolean);
    const take = (s: string) => (s && s[0] ? s[0].toUpperCase() : "");
    return (take(parts[0]) + take(parts[parts.length - 1])).slice(0, 2) || "U";
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

  // --- Form helpers ---
  function updateItem(i: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addItem() { setItems((p) => [...p, { name: "", category: "", condition: "" }]); }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files; if (!list?.length) return;
    const next = [...files]; for (let i = 0; i < list.length; i++) next.push(list[i]);
    setFiles(next); if (fileInputRef.current) fileInputRef.current.value = "";
  }
  function removeFile(i: number) { setFiles((p) => p.filter((_, idx) => idx !== i)); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const first = items[0] || { name: "", category: "", condition: "" };
    if (!first.name.trim() || !first.condition || !suburb.trim() || !postcode.trim()) {
      setErr("Please complete all required fields."); return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("itemName", first.name);
      fd.append("category", first.category);
      fd.append("condition", first.condition);
      fd.append("address", street);
      fd.append("suburb", suburb);
      fd.append("postcode", postcode);
      files.forEach((f) => fd.append("photos", f, f.name));
      const res = await fetch("/api/donations", { method: "POST", body: fd, credentials: "include" });
      if (res.ok) {
        setMsg("Thanks! Your donation was submitted.");
        setItems([{ name: "", category: "", condition: "" }]);
        setStreet(""); setSuburb(""); setPostcode(""); setFiles([]);
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error || "Failed to save donation");
      }
    } catch { setErr("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E] flex flex-col">
      {/* HEADER */}
      <header className="px-8 pt-6 pb-4 border-b border-black/20">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <AwardIcon className="w-7 h-7" />
            <h1 className="text-2xl font-semibold">Donor Dashboard</h1>
          </div>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
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
      <main className="flex-1 px-8 py-8 flex justify-center">
        <div className="w-full max-w-4xl">
          <Link href="/donor" className="inline-flex items-center gap-2 mb-6 text-sm text-[#0873B9] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <form onSubmit={onSubmit} className="space-y-10">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Field label="Item Name">
                  <Input value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} placeholder="Item Name" required />
                </Field>

                <Field label="Category">
                  <Select value={it.category} onChange={(e) => updateItem(i, { category: e.target.value })} placeholder="Category" options={CATEGORY_OPTIONS} />
                </Field>

                <Field label="Pickup Address">
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street Address" />
                </Field>

                <Field label="Condition">
                  <Select value={it.condition} onChange={(e) => updateItem(i, { condition: e.target.value })} placeholder="Select" options={CONDITION_OPTIONS} required />
                </Field>

                <Field label="Suburb">
                  <Input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Suburb" required />
                </Field>

                <Field label="Postcode">
                  <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" required />
                </Field>

                <div className="md:col-span-2">
                  <label className="text-sm block mb-2">Upload Photos</label>
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="h-11 px-4 rounded-md border border-gray-300">+</button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onPickFiles} className="hidden" />
                    <span className="text-sm text-gray-600">{files.length ? `${files.length} file(s) selected` : "No file chosen"}</span>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end">
                  {i === 0 ? (
                    <button type="button" onClick={addItem} className="h-11 px-5 rounded-md text-white font-semibold" style={{ background: BTN_BLUE }}>
                      Add Another Item
                    </button>
                  ) : (
                    <button type="button" onClick={() => removeItem(i)} className="h-11 px-5 rounded-md border border-gray-300">Remove</button>
                  )}
                </div>
              </div>
            ))}

            {err && <p className="text-red-600 text-sm">{err}</p>}
            {msg && <p className="text-green-700 text-sm">{msg}</p>}

            <button type="submit" disabled={submitting} className="w-full h-11 rounded-md text-white font-semibold" style={{ background: BTN_BLUE, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Submitting…" : "Submit Donation"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="grid gap-2 text-sm"><span>{label}</span>{children}</label>);
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
function Select({ value, onChange, placeholder, options, required }: { value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; placeholder: string; options: string[]; required?: boolean; }) {
  return (
    <select value={value} onChange={onChange} required={required} className="h-11 rounded-md border border-gray-300 bg-white px-3 outline-none focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20">
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
    </select>
  );
}
function ArrowLeft({ className = "w-4 h-4" }) {
  return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}
function AwardIcon({ className = "w-6 h-6" }) {
  return (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M8 12l-2 10 6-3 6 3-2-10" /></svg>);
}
