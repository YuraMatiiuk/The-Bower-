"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./admin.css";

/* -----------------------------
   Types
----------------------------- */
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

type Me = { name?: string; email?: string; user?: { name?: string; email?: string } };

/* -----------------------------
   Helpers
----------------------------- */
function displayNameFrom(me: Me | undefined): string {
  const n = (me?.name || me?.user?.name || "").trim();
  if (n) return n;
  const e = (me?.email || me?.user?.email || "").trim();
  return e ? e.split("@")[0] : "User";
}
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const a = first.charAt(0).toUpperCase();
  const b = last.charAt(0).toUpperCase();
  return (a + b || "U").slice(0, 2);
}

/* -----------------------------
   Page
----------------------------- */
export default function AdminPage() {
  const [me, setMe] = useState<Me>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const name = useMemo(() => displayNameFrom(me), [me]);
  const initials = useMemo(() => initialsFromName(name), [name]);

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

  async function onLogout() {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    window.location.href = "/login";
  }

  // ---------------- Tabs ----------------
  const [tab, setTab] = useState<"items" | "users">("items");

  // ---------------- Items state/actions ----------------
  const [items, setItems] = useState<Item[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [rejectKeyById, setRejectKeyById] = useState<Record<number, string>>({});
  const [msgItems, setMsgItems] = useState("");

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
      } else {
        setMsgItems(res.data?.error || "Approve failed");
      }
    } catch {
      setMsgItems("Approve failed");
    } finally {
      setBusyItemId(null);
    }
  }

  async function reject(id: number) {
    const reasonKey = rejectKeyById[id];
    if (!reasonKey) {
      setMsgItems("Please choose a rejection reason first.");
      return;
    }
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
      } else {
        setMsgItems(res.data?.error || "Reject failed");
      }
    } catch {
      setMsgItems("Reject failed");
    } finally {
      setBusyItemId(null);
    }
  }

  // ---------------- Users state/actions ----------------
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [msgUsers, setMsgUsers] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor" as UserRow["role"],
  });

  // edit/delete
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<UserRow>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await axios.get("/api/admin/users", { validateStatus: () => true });
      if (res.status === 200) {
        setUsers(res.data.users || res.data || []);
        setMsgUsers("");
      } else {
        setMsgUsers(res.data?.error || "Failed to load users.");
      }
    } catch {
      setMsgUsers("Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }
  useEffect(() => { if (tab === "users") loadUsers(); }, [tab]);

  function onNewUserChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setNewUser((p) => ({ ...p, [name]: value }));
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
      } else {
        setMsgUsers(res.data?.error || "Failed to create user");
      }
    } catch {
      setMsgUsers("Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  // edit/delete helpers
  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditDraft({ id: u.id, name: u.name, email: u.email, role: u.role });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }
  async function saveEdit() {
    if (!editingId) return;
    setSavingId(editingId);
    setMsgUsers("");
    try {
      const res = await axios.put(
        "/api/admin/users",
        { id: editingId, name: editDraft.name, email: editDraft.email, role: editDraft.role },
        { validateStatus: () => true }
      );
      if (res.status === 200) {
        setMsgUsers("User updated ✅");
        setEditingId(null);
        setEditDraft({});
        await loadUsers();
      } else {
        setMsgUsers(res.data?.error || "Failed to update user");
      }
    } catch {
      setMsgUsers("Failed to update user");
    } finally {
      setSavingId(null);
    }
  }
  async function deleteUser(id: number) {
    if (!confirm(`Delete user #${id}? This cannot be undone.`)) return;
    setDeletingId(id);
    setMsgUsers("");
    try {
      const res = await axios.delete("/api/admin/users", { data: { id }, validateStatus: () => true });
      if (res.status === 200) {
        setMsgUsers("User deleted 🗑️");
        await loadUsers();
      } else {
        setMsgUsers(res.data?.error || "Failed to delete user");
      }
    } catch {
      setMsgUsers("Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ad-root">
      {/* Header */}
      <header className="ad-header">
        <div className="ad-header__inner">
          <h1 className="ad-title">
            <AdminMark className="ad-title__icon" />
            Admin Dashboard
          </h1>

          <div ref={menuRef} className="ad-user">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="ad-user__btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="ad-user__avatar">{initials}</span>
              <span className="ad-user__name">{name}</span>
              <svg viewBox="0 0 20 20" className="ad-user__chev" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div role="menu" className="ad-user__menu">
                <button onClick={onLogout} className="ad-user__menuitem" role="menuitem">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="ad-tabs">
        <button
          className={`ad-tab ${tab === "items" ? "is-active" : ""}`}
          onClick={() => setTab("items")}
        >
          Items Moderation
        </button>
        <button
          className={`ad-tab ${tab === "users" ? "is-active" : ""}`}
          onClick={() => setTab("users")}
        >
          User Management
        </button>
      </div>

      {/* Main */}
      <main className="ad-main">
        <div className="ad-container">
          {/* ---------------- ITEMS TAB ---------------- */}
          {tab === "items" && (
            <section className="ad-card">
              {msgItems && <div className="ad-alert">{msgItems}</div>}

              {loadingItems ? (
                <div className="ad-pad">Loading…</div>
              ) : items.length === 0 ? (
                <div className="ad-pad">No items.</div>
              ) : (
                <div className="ad-grid">
                  {items.map((it) => (
                    <div key={it.id} className="ad-item">
                      {it.image_url ? (
                        <img
                          src={it.image_url}
                          alt={it.name}
                          className="ad-item__img"
                        />
                      ) : (
                        <div className="ad-item__noimg">No image</div>
                      )}

                      <div className="ad-item__body">
                        <div className="ad-item__row">
                          <div className="ad-item__title">#{it.id} — {it.name}</div>
                          <span className="ad-badge">{it.status}</span>
                        </div>
                        <div className="ad-item__meta">{it.category} • {it.condition}</div>
                        <div className="ad-item__meta ad-item__meta--muted">
                          {it.donor_name} — {it.donor_email}
                        </div>

                        <div className="ad-item__actions">
                          <button
                            onClick={() => approve(it.id)}
                            disabled={busyItemId === it.id}
                            className="ad-btn ad-btn--green"
                          >
                            {busyItemId === it.id ? "…" : "Approve"}
                          </button>

                          <select
                            className="ad-select"
                            value={rejectKeyById[it.id] || ""}
                            onChange={(e) =>
                              setRejectKeyById((prev) => ({ ...prev, [it.id]: e.target.value }))
                            }
                          >
                            <option value="">Select reason…</option>
                            {reasons.map((r: Reason) => (
                              <option key={r.key} value={r.key}>
                                {r.label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => reject(it.id)}
                            disabled={busyItemId === it.id}
                            className="ad-btn ad-btn--red"
                          >
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

          {/* ---------------- USERS TAB ---------------- */}
          {tab === "users" && (
            <section className="ad-stack">
              {msgUsers && <div className="ad-alert">{msgUsers}</div>}

              {/* Create user */}
              <div className="ad-card">
                <h2 className="ad-h2">Create New User</h2>
                <form onSubmit={createUser} className="ad-formgrid">
                  <div>
                    <label className="ad-label">Full name</label>
                    <input
                      name="name"
                      value={newUser.name}
                      onChange={onNewUserChange}
                      className="ad-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="ad-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={newUser.email}
                      onChange={onNewUserChange}
                      className="ad-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="ad-label">Password</label>
                    <input
                      type="password"
                      name="password"
                      value={newUser.password}
                      onChange={onNewUserChange}
                      className="ad-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="ad-label">Role</label>
                    <select
                      name="role"
                      value={newUser.role}
                      onChange={onNewUserChange}
                      className="ad-input"
                    >
                      <option value="donor">Donor</option>
                      <option value="caseworker">Caseworker</option>
                      <option value="driver">Driver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="ad-formgrid__actions">
                    <button
                      type="submit"
                      disabled={creating}
                      className="ad-btn ad-btn--blue ad-btn--lg"
                    >
                      {creating ? "Creating…" : "Create user"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Users table */}
              <div className="ad-card">
                <h2 className="ad-h2">All Users</h2>
                {loadingUsers ? (
                  <div className="ad-pad">Loading…</div>
                ) : users.length === 0 ? (
                  <div className="ad-pad">No users found.</div>
                ) : (
                  <div className="ad-tablewrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th className="ad-th">ID</th>
                          <th className="ad-th">Name</th>
                          <th className="ad-th">Email</th>
                          <th className="ad-th">Role</th>
                          <th className="ad-th">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u: UserRow) => {
                          const isEditing = editingId === u.id;
                          return (
                            <tr key={u.id} className="ad-row">
                              <td className="ad-td">{u.id}</td>

                              <td className="ad-td">
                                {isEditing ? (
                                  <input
                                    className="ad-input ad-input--sm"
                                    value={String(editDraft.name ?? "")}
                                    onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                                  />
                                ) : (
                                  u.name
                                )}
                              </td>

                              <td className="ad-td">
                                {isEditing ? (
                                  <input
                                    className="ad-input ad-input--sm"
                                    type="email"
                                    value={String(editDraft.email ?? "")}
                                    onChange={(e) => setEditDraft((p) => ({ ...p, email: e.target.value }))}
                                  />
                                ) : (
                                  u.email
                                )}
                              </td>

                              <td className="ad-td">
                                {isEditing ? (
                                  <select
                                    className="ad-input ad-input--sm"
                                    value={String(editDraft.role ?? "donor")}
                                    onChange={(e) => setEditDraft((p) => ({ ...p, role: e.target.value as UserRow["role"] }))}
                                  >
                                    <option value="donor">Donor</option>
                                    <option value="caseworker">Caseworker</option>
                                    <option value="driver">Driver</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                ) : (
                                  u.role
                                )}
                              </td>

                              <td className="ad-td">
                                {isEditing ? (
                                  <div className="ad-actions">
                                    <button
                                      onClick={saveEdit}
                                      disabled={savingId === u.id}
                                      className="ad-btn ad-btn--blue"
                                    >
                                      {savingId === u.id ? "Saving…" : "Save"}
                                    </button>
                                    <button onClick={cancelEdit} className="ad-btn ad-btn--ghost">
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="ad-actions">
                                    <button onClick={() => startEdit(u)} className="ad-btn ad-btn--ghost">Edit</button>
                                    <button
                                      onClick={() => deleteUser(u.id)}
                                      disabled={deletingId === u.id}
                                      className="ad-btn ad-btn--red"
                                    >
                                      {deletingId === u.id ? "Deleting…" : "Delete"}
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/* -----------------------------
   Icon
----------------------------- */
function AdminMark({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12l4-7h8l4 7-4 7H8l-4-7z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}