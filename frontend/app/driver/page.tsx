"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import "./driver.css";

export default function DriverPage() {
  const router = useRouter();

  // -------------------- USER / MENU --------------------
  const [me, setMe] = useState<any>({});
  const [profile, setProfile] = useState<any>({});
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const displayName = useMemo(() => {
    if (typeof me?.name === "string" && me.name.trim()) return me.name.trim();
    if (typeof profile?.name === "string" && profile.name.trim()) return profile.name.trim();
    if (typeof me?.user?.name === "string" && me.user.name.trim()) return me.user.name.trim();
    if (typeof me?.profile?.name === "string" && me.profile.name.trim()) return me.profile.name.trim();
    const email =
      me?.email || me?.user?.email || profile?.email;
    return email ? String(email).split("@")[0] : "User";
  }, [me, profile]);

  const initials = useMemo(() => {
    const parts = String(displayName).split(" ").filter(Boolean);
    const first = parts[0]?.[0]?.toUpperCase() || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() : "";
    return (first + last) || "U";
  }, [displayName]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/login");
  }

  // -------------------- PICKUPS LOGIC --------------------
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const maxTruckCapacity = 100;
  const [currentCapacity, setCurrentCapacity] = useState(0);

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/driver/pickups");
      setPickups(res.data);
      setCurrentCapacity(calculateCurrentCapacity(res.data));
    } catch (err) {
      console.error("Error loading pickups:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const calculateCurrentCapacity = (pickups: any[]) => {
    return pickups.reduce((total, pickup) => total + (pickup.item_weight || 0), 0);
  };

  const handleAction = async (itemId: number, action: "approved" | "rejected", notes: string) => {
    try {
      const res = await axios.post("/api/driver/update", { itemId, action, notes });
      setMessage(res.data.message);
      fetchPickups();
    } catch (err) {
      console.error(err);
      setMessage("Error updating pickup");
    }
  };

  // -------------------- RENDER --------------------
  return (
    <div className="driver-page">
      {/* HEADER */}
      <header className="driver-header">
        <div className="driver-header-inner">
          <h1 className="driver-title">
            <TruckIcon className="w-7 h-7" />
            Driver Dashboard
          </h1>

          <div ref={menuRef} className="driver-user">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="driver-user-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="driver-avatar">{initials}</span>
              <span className="driver-username">{displayName}</span>
              <svg viewBox="0 0 20 20" className="driver-chevron" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div className="driver-menu" role="menu">
                <button onClick={onLogout} role="menuitem">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="driver-main">
        <div className="driver-container">
          {message && <p className="driver-msg">{message}</p>}

          {loading ? (
            <p>Loading pickups...</p>
          ) : pickups.length === 0 ? (
            <section className="driver-section">
              <h2 className="driver-section-title">Today's Schedule</h2>
              <p className="driver-section-desc">
                No pickups scheduled for today. Once dispatch adds new jobs, they'll appear here with
                address, contact details, and time window.
              </p>
            </section>
          ) : (
            <>
              <section className="driver-section">
                <h2 className="driver-section-title">Today's Pickups</h2>
                <p className="driver-section-desc">
                  Truck capacity: {currentCapacity} / {maxTruckCapacity}
                </p>
                <div className="driver-table-wrapper">
                  <table className="driver-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Donor</th>
                        <th>Address</th>
                        <th>Notes</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickups.map((pickup) => (
                        <tr key={pickup.id}>
                          <td>{pickup.item_name}</td>
                          <td>{pickup.donor_name}</td>
                          <td>{pickup.donor_address}</td>
                          <td>📞 {pickup.donor_phone || "No phone"}</td>
                          <td>
                            <textarea
                              defaultValue={pickup.notes || ""}
                              onChange={(e) => (pickup.notes = e.target.value)}
                              className="driver-notes"
                            />
                          </td>
                          <td>
                            <div className="driver-btns">
                              <button
                                onClick={() => handleAction(pickup.id, "approved", pickup.notes)}
                                className="btn-approve"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(pickup.id, "rejected", pickup.notes)}
                                className="btn-reject"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
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
