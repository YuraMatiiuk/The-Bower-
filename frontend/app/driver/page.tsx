"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  collection_id: number;
  item_id: number;
  item_name: string;
  donor_name: string;
  donor_address: string;
  donor_postcode: string;
  donor_phone?: string | null;
  collection_date?: string | null;
  time_slot?: string | null;
  collection_status?: string | null;
  driver_notes?: string | null;
};

const BTN_BLUE = "#0873B9";

export default function DriverPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // header user (optional; won’t break if /api/auth/me absent)
  const [me, setMe] = useState<any>({});
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (r.ok) setMe(await r.json());
      } catch {}
    })();
  }, []);
  const displayName = useMemo(() => {
    const n = (me?.name || me?.user?.name || "").trim();
    if (n) return n;
    const e = (me?.email || me?.user?.email || "").trim();
    return e ? e.split("@")[0] : "User";
  }, [me]);
  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    const head = (s: string) => (s && s[0] ? s[0].toUpperCase() : "");
    return (head(parts[0]) + head(parts[parts.length - 1] || "") || "U").slice(0, 2);
  }, [displayName]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);
  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.push("/login");
  }

  // data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  // notes per collection
  const [driverNotes, setDriverNotes] = useState<Record<number, string>>({});

  async function loadPickups() {
    setLoading(true);
    setMsg("");
    try {
      // expects a GET route returning rows with the fields in Row
      const r = await fetch("/api/driver/pickups", { cache: "no-store", credentials: "include" });
      const data = await r.json().catch(() => []);
      const list: Row[] = Array.isArray(data) ? data : (data?.items ?? []);
      setRows(list);
      // seed notes from server if present
      const seed: Record<number, string> = {};
      list.forEach((x) => {
        if (x.collection_id && x.driver_notes) seed[x.collection_id] = x.driver_notes;
      });
      setDriverNotes(seed);
    } catch (e) {
      console.error(e);
      setRows([]);
      setMsg("Failed to load pickups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPickups();
  }, []);

  async function updatePickup(collectionId: number, action: "approved" | "rejected") {
    setMsg("");
    try {
      const res = await fetch("/api/driver/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId,
          action,
          driverNotes: driverNotes[collectionId] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error || "Failed to update pickup");
        return;
      }
      setMsg(`Updated #${collectionId} → ${data.status}`);
      await loadPickups();
    } catch (e) {
      console.error(e);
      setMsg("Network error updating pickup");
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      {/* HEADER */}
      <header className="px-8 pt-6 pb-4 border-b border-black/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <TruckIcon className="w-7 h-7" />
            Driver Pickups
          </h1>

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-3"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <div className="w-9 h-9 rounded-full bg-black text-white grid place-items-center text-sm font-semibold">
                {initials}
              </div>
              <span className="text-lg font-medium">{displayName}</span>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg z-10">
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
          {msg && <div className="px-4 py-2 rounded border bg-yellow-50 text-sm">{msg}</div>}

          {loading ? (
            <div className="p-4 border rounded-md">Loading pickups…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 border rounded-md">No pickups for today.</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="w-full text-sm">
                <thead style={{ background: BTN_BLUE }} className="text-white">
                  <tr>
                    <Th>Item</Th>
                    <Th>Donor</Th>
                    <Th>Address</Th>
                    <Th>Contact</Th>
                    <Th>When</Th>
                    <Th>Notes</Th>
                    <Th className="text-center">Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.collection_id} className="odd:bg-white even:bg-gray-50">
                      <Td>{r.item_name}</Td>
                      <Td>
                        <div className="font-medium">{r.donor_name}</div>
                      </Td>
                      <Td>
                        <div>{r.donor_address}</div>
                        <div className="text-xs text-gray-600">{r.donor_postcode}</div>
                      </Td>
                      <Td>
                        <div className="inline-flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4" />
                          {r.donor_phone || "No phone"}
                        </div>
                      </Td>
                      <Td>
                        <div>{r.collection_date || "—"}</div>
                        <div className="text-xs text-gray-600">{r.time_slot || ""}</div>
                      </Td>
                      <Td>
                        <textarea
                          className="w-52 max-w-full h-9 rounded-md border border-gray-300 px-2 resize-none outline-none focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20"
                          placeholder="Add driver note (optional)"
                          value={driverNotes[r.collection_id] || ""}
                          onChange={(e) =>
                            setDriverNotes((p) => ({ ...p, [r.collection_id]: e.target.value }))
                          }
                        />
                      </Td>
                      <Td className="text-center">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => updatePickup(r.collection_id, "approved")}
                            className="h-9 px-3 rounded-md text-white"
                            style={{ background: "#16A34A" }}
                          >
                            Completed
                          </button>
                          <button
                            onClick={() => updatePickup(r.collection_id, "rejected")}
                            className="h-9 px-3 rounded-md border border-gray-300"
                          >
                            Not Completed
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={"px-3 py-2 text-left font-semibold " + className}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-3 py-3 align-top " + className}>{children}</td>;
}
function TruckIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h10v8H3zM13 9h5l3 3v2h-8z" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
    </svg>
  );
}
function PhoneIcon({ className = "w-4 h-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.11 5.18 2 2 0 0 1 4.11 3h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.6a2 2 0 0 1-.45 2.11L8.09 10.91a16 16 0 0 0 6 6l1.48-1.2a2 2 0 0 1 2.11-.45c.83.3 1.7.51 2.6.63A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}