"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./admin.css";

/* ---------- Types ---------- */
type Item = {
  id: number;
  name: string;
  category: string;
  category_id?: number;
  condition: string;
  status: string;
  image_url?: string | null;
  donor_name: string;
  donor_email: string;
  donor_address?: string;
  donor_postcode?: string;
};

type Reason = { key: string; label: string };

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "donor" | "caseworker" | "driver" | "admin";
  phone?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
};

type Me = { name?: string; email?: string; role?: string } | { user?: { name?: string } };
type NewUserState = { name: string; email: string; password: string; role: UserRow["role"] };

export default function AdminPage() {
  /* ---------- HEADER: user, initials, logout ---------- */
  const [me, setMe] = useState<Me>({});
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (res.ok) setMe(await res.json());
      } catch { /* ignore */ }
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
  const initials =
    displayName
  .split(" ")
  .filter(Boolean)
  .map((s: string) => s[0]?.toUpperCase() ?? "")
  .slice(0, 2)
  .join("") || "U";

    "U";

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    window.location.href = "/login";
  }

  /* ---------- Tabs ---------- */
  const [tab, setTab] = useState<"items" | "users">("items");

  /* ---------- ITEMS ---------- */
  const [items, setItems] = useState<Item[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loadingItems, setLoadingItems] = useState<boolean>(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [rejectKeyById, setRejectKeyById] = useState<Record<number, string>>({});
  const [msgItems, setMsgItems] = useState<string>("");

  async function loadItems() {
    setLoadingItems(true);
    try {
      const res = await axios.get("/api/admin/items", { validateStatus: () => true });
      if (res.status === 200) {
        setItems(res.data.items || []);
        setReasons(res.data.reasons || []);
        setMsgItems("");
      } else {
        setMsgItems(res.data?.error || "Failed to load items.");
      }
    } catch {
      setMsgItems("Failed to load items.");
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => { if (tab === "items") loadItems(); }, [tab]);

  async function approve(id: number) {
    setBusyItemId(id);
    setMsgItems("");
    try {
      const res = await axios.post(
        "/api/admin/items",
        { itemId: id, action: "approved" },
        { validateStatus: () => true }
      );
      if (res.status === 200) {
        setMsgItems(`Item #${id} approved`);
        await loadItems();
      } else setMsgItems(res.data?.error || "Approve failed");
    } catch { setMsgItems("Approve failed"); }
    finally { setBusyItemId(null); }
  }

  async function reject(id: number) {
    const reasonKey = rejectKeyById[id];
    if (!reasonKey) { setMsgItems("Please choose a rejection reason first."); return; }
    setBusyItemId(id);
    setMsgItems("");
    try {
      const res = await axios.post(
        "/api/admin/items",
        { itemId: id, action: "rejected", reasonKey },
        { validateStatus: () => true }
      );
      if (res.status === 200) {
        setMsgItems(`Item #${id} rejected and donor notified`);
        await loadItems();
      } else setMsgItems(res.data?.error || "Reject failed");
    } catch { setMsgItems("Reject failed"); }
    finally { setBusyItemId(null); }
  }

  /* ---------- USERS ---------- */
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [msgUsers, setMsgUsers] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [newUser, setNewUser] = useState<NewUserState>({
    name: "",
    email: "",
    password: "",
    role: "donor",
  });

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await axios.get("/api/admin/users", { validateStatus: () => true });
      if (res.status === 200) {
        setUsers(res.data.users || res.data || []);
        setMsgUsers("");
      } else setMsgUsers(res.data?.error || "Failed to load users.");
    } catch { setMsgUsers("Failed to load users."); }
    finally { setLoadingUsers(false); }
  }

  useEffect(() => { if (tab === "users") loadUsers(); }, [tab]);

  function onNewUserChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setNewUser((prev: NewUserState) => ({ ...prev, [name]: value }));
    setMsgUsers("");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsgUsers("");
    try {
      const res = await axios.post("/api/admin/users", newUser, { validateStatus: () => true });
      if (res.status === 200 || res.status === 201) {
        setMsgUsers("User created ✅");
        setNewUser({ name: "", email: "", password: "", role: "donor" });
        await loadUsers();
      } else setMsgUsers(res.data?.error || "Failed to create user");
    } catch { setMsgUsers("Failed to create user"); }
    finally { setCreating(false); }
  }

  return (
    <div className="admin-screen min-h-screen">
      {/* Header (bigger title, no subtitle) */}
      <header className="adminhdr">
        <div className="adminhdr__inner">
          <div className="adminhdr__left">
            <svg viewBox="0 0 24 24" className="adminhdr__mark" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12l4-7h8l4 7-4 7H8l-4-7z" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <div className="adminhdr__title">Admin Dashboard</div>
          </div>

          <div ref={menuRef} className="adminhdr__user">
            <button
              onClick={() => setMenuOpen((prev: boolean) => !prev)}
              className="adminhdr__userbtn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="adminhdr__avatar" aria-hidden>{initials}</span>
              <span className="adminhdr__name">{displayName}</span>
              <svg viewBox="0 0 20 20" className="adminhdr__chev" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div role="menu" className="adminhdr__menu">
                <button onClick={onLogout} className="adminhdr__menuitem" role="menuitem">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
        <hr className="adminhdr__rule" />
      </header>

      {/* Tabs + Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="tabs">
          <button className={`tab ${tab === "items" ? "tab--active" : ""}`} onClick={() => setTab("items")}>
            Items Moderation
          </button>
          <button className={`tab ${tab === "users" ? "tab--active" : ""}`} onClick={() => setTab("users")}>
            User Management
          </button>
        </div>

        {/* -------- ITEMS TAB -------- */}
        {tab === "items" && (
          <section className="items">
            {msgItems && <div className="banner">{msgItems}</div>}

            {loadingItems ? (
              <p className="muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="muted">No items.</p>
            ) : (
              <div className="cards">
                {items.map((it) => (
                  <div key={it.id} className="card">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.name} className="card__img" />
                    ) : (
                      <div className="card__img card__img--empty">No image</div>
                    )}
                    <div className="card__body">
                      <div className="card__top">
                        <div className="card__title">#{it.id} — {it.name}</div>
                        <span className="chip">{it.status}</span>
                      </div>
                      <div className="muted">{it.category} • {it.condition}</div>
                      <div className="muted tiny mt-1">{it.donor_name} — {it.donor_email}</div>

                      <div className="actions">
                        <button onClick={() => approve(it.id)} disabled={busyItemId === it.id} className="btn btn--primary">
                          {busyItemId === it.id ? "…" : "Approve"}
                        </button>

                        <select
                          className="select"
                          value={rejectKeyById[it.id] || ""}
                          onChange={(e) =>
                            setRejectKeyById((prev: Record<number, string>) => ({ ...prev, [it.id]: e.target.value }))
                          }
                        >
                          <option value="">Select reason…</option>
                          {reasons.map((r) => (
                            <option key={r.key} value={r.key}>{r.label}</option>
                          ))}
                        </select>

                        <button onClick={() => reject(it.id)} disabled={busyItemId === it.id} className="btn btn--ghost">
                          {busyItemId === it.id ? "…" : "Reject & Email"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* -------- USERS TAB -------- */}
        {tab === "users" && (
          <section className="users">
            {msgUsers && <div className="banner">{msgUsers}</div>}

            <div className="panel">
              <h2 className="panel__title">Create New User</h2>

              {/* Side-by-side, longer fields */}
              <form onSubmit={createUser} className="userform userform--wide">
                <div className="formcol">
                  <label className="label">Full name</label>
                  <input
                    name="name"
                    value={newUser.name}
                    onChange={onNewUserChange}
                    className="input"
                    required
                  />
                </div>
                <div className="formcol">
                  <label className="label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={newUser.email}
                    onChange={onNewUserChange}
                    className="input"
                    required
                  />
                </div>
                <div className="formcol">
                  <label className="label">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={newUser.password}
                    onChange={onNewUserChange}
                    className="input"
                    required
                  />
                </div>
                <div className="formcol">
                  <label className="label">Role</label>
                  <select
                    name="role"
                    value={newUser.role}
                    onChange={onNewUserChange}
                    className="input"
                  >
                    <option value="donor">Donor</option>
                    <option value="caseworker">Caseworker</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="formactions">
                  <button type="submit" disabled={creating} className="btn btn--primary">
                    {creating ? "Creating…" : "Create user"}
                  </button>
                </div>
              </form>
            </div>

            <div className="panel">
              <h2 className="panel__title">All Users</h2>
              {loadingUsers ? (
                <p className="muted">Loading…</p>
              ) : users.length === 0 ? (
                <p className="muted">No users found.</p>
              ) : (
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
