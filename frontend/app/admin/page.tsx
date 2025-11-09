"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./admin.css";

/* -----------------------------
   Types
----------------------------- */
type Me = { name?: string; email?: string; user?: { name?: string; email?: string } };

type Item = {
  id: number;
  name: string;
  category: string;
  condition: string;
  status: string;
  image_url?: string | null;
  donor_name: string;
  donor_email: string;
};

type Reason = { key: string; label: string };

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "donor" | "caseworker" | "driver" | "admin";
};

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
  const a = (parts[0]?.[0] || "U").toUpperCase();
  const b = (parts[parts.length - 1]?.[0] || "").toUpperCase();
  return (a + b).slice(0, 2);
}

/* -----------------------------
   Page
----------------------------- */
export default function AdminPage() {
  /* Header user */
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

  /* Tabs */
  const [tab, setTab] = useState<"items" | "users">("items");

  /* ================== ITEMS ================== */
  const [items, setItems] = useState<Item[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
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

  // ACTION modal
  const [actionForId, setActionForId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectKeyById, setRejectKeyById] = useState<Record<number, string>>({});

  async function approve(id: number) {
    setBusyId(id);
    setMsgItems("");
    try {
      const res = await axios.post("/api/admin/items", { itemId: id, action: "approved" }, { validateStatus: () => true });
      if (res.status === 200) {
        setMsgItems(`Item #${id} approved.`);
        setActionForId(null);
        await loadItems();
      } else setMsgItems(res.data?.error || "Approve failed");
    } catch { setMsgItems("Approve failed"); }
    finally { setBusyId(null); }
  }
  async function reject(id: number) {
    const reasonKey = rejectKeyById[id];
    if (!reasonKey) { setMsgItems("Please choose a rejection reason."); return; }
    setBusyId(id);
    setMsgItems("");
    try {
      const res = await axios.post("/api/admin/items", { itemId: id, action: "rejected", reasonKey }, { validateStatus: () => true });
      if (res.status === 200) {
        setMsgItems(`Item #${id} rejected & donor notified.`);
        setActionForId(null);
        await loadItems();
      } else setMsgItems(res.data?.error || "Reject failed");
    } catch { setMsgItems("Reject failed"); }
    finally { setBusyId(null); }
  }

  // ATTACHMENTS modal
  const [attsForId, setAttsForId] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attsLoading, setAttsLoading] = useState(false);

  function normaliseUrls(raw: any): string[] {
    const seen = new Set<string>();
    const push = (p?: string | null) => {
      if (!p) return;
      const url = p.startsWith("/") ? p : `/uploads/${p}`;
      seen.add(url);
    };
    if (!raw) return [];
    if (Array.isArray(raw)) raw.forEach((v) => typeof v === "string" && push(v));
    else if (typeof raw === "object") {
      const obj = raw as any;
      for (const key of ["attachments", "images", "files", "image_urls", "urls"]) {
        const v = obj[key];
        if (Array.isArray(v)) v.forEach((s: any) => typeof s === "string" && push(s));
        if (typeof v === "string" && v.includes(",")) v.split(",").map((s: string) => s.trim()).forEach(push);
      }
      for (const key of ["imageUrl", "image_url"]) if (typeof obj[key] === "string") push(obj[key]);
    } else if (typeof raw === "string") push(raw);
    return Array.from(seen);
  }

  async function tryFetchJSON(url: string) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function openAttachments(id: number, fallbackUrl?: string | null) {
    setAttsForId(id);
    setAttachments([]);
    setAttsLoading(true);
    try {
      // 1) Preferred: item-images.js we made earlier
      // Support both ?itemId= and ?id= just in case
      const endpoints = [
        `/api/admin/item-images?itemId=${id}`,
        `/api/admin/item-images?id=${id}`,
        `/api/admin/items/${id}/images`,
        `/api/admin/items/${id}/attachments`,
        `/api/admin/items/${id}` // last-resort to derive single image_url
      ];

      let urls: string[] = [];
      for (const ep of endpoints) {
        try {
          const data = await tryFetchJSON(ep);
          urls = normaliseUrls(data) || normaliseUrls((data as any)?.attachments) || [];
          if (urls.length) break;
          // try common inline keys if present
          const maybe = (data as any)?.image_url || (data as any)?.imageUrl;
          if (!urls.length && typeof maybe === "string") urls = normaliseUrls(maybe);
          if (urls.length) break;
        } catch {
          // keep trying next endpoint
        }
      }

      if (!urls.length && fallbackUrl) {
        urls = normaliseUrls(fallbackUrl);
      }
      setAttachments(urls);
    } catch {
      setAttachments(fallbackUrl ? normaliseUrls(fallbackUrl) : []);
    } finally {
      setAttsLoading(false);
    }
  }

  /* ================== USERS ================== */
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [msgUsers, setMsgUsers] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "donor" as UserRow["role"] });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<UserRow>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [pwForId, setPwForId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

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
      } else setMsgUsers(res.data?.error || "Failed to create user");
    } catch { setMsgUsers("Failed to create user"); }
    finally { setCreating(false); }
  }

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
      const res = await axios.put("/api/admin/users", { id: editingId, name: editDraft.name, email: editDraft.email, role: editDraft.role }, { validateStatus: () => true });
      if (res.status === 200) {
        setMsgUsers("User updated ✅");
        setEditingId(null);
        setEditDraft({});
        await loadUsers();
      } else setMsgUsers(res.data?.error || "Failed to update user");
    } catch { setMsgUsers("Failed to update user"); }
    finally { setSavingId(null); }
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
      } else setMsgUsers(res.data?.error || "Failed to delete user");
    } catch { setMsgUsers("Failed to delete user"); }
    finally { setDeletingId(null); }
  }

  // FIX password update call (explicit headers/id)
  async function updatePassword() {
  const id = Number(pwForId);
  if (!id || !newPassword.trim()) {
    setMsgUsers("Enter a valid password.");
    return;
  }
  setPwBusy(true);
  setMsgUsers("");

  try {
    // 1) Try the dedicated endpoint first
    let res = await fetch("/api/admin/users/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, newPassword: newPassword.trim() }),
    });

    // 2) Back-compat fallback to PUT /api/admin/users
    if (!res.ok) {
      res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, newPassword: newPassword.trim() }),
      });
    }

    if (res.ok) {
      setMsgUsers("Password updated 🔐");
      setPwForId(null);
      setNewPassword("");
    } else {
      const d = await res.json().catch(() => ({}));
      setMsgUsers(d?.error || "Failed to update password");
    }
  } catch {
    setMsgUsers("Failed to update password");
  } finally {
    setPwBusy(false);
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
            <button onClick={() => setMenuOpen((s) => !s)} className="ad-user__btn" aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="ad-user__avatar">{initials}</span>
              <span className="ad-user__name">{name}</span>
              <svg viewBox="0 0 20 20" className="ad-user__chev" fill="currentColor"><path d="M5.5 7.5l4.5 4.5 4.5-4.5" /></svg>
            </button>
            {menuOpen && (
              <div role="menu" className="ad-user__menu">
                <button onClick={onLogout} className="ad-user__menuitem" role="menuitem">Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="ad-tabs">
        <button className={`ad-tab ${tab === "items" ? "is-active" : ""}`} onClick={() => setTab("items")}>Pending Donations</button>
        <button className={`ad-tab ${tab === "users" ? "is-active" : ""}`} onClick={() => setTab("users")}>User Management</button>
      </div>

      {/* Main */}
      <main className="ad-main">
        <div className="ad-container">
          {/* ITEMS */}
          {tab === "items" && (
            <section className="ad-card">
              {msgItems && <div className="ad-alert">{msgItems}</div>}

              <div className="ad-card__header">
                <h2 className="ad-h2">Pending Donations</h2>
              </div>

              {loadingItems ? (
                <div className="ad-pad">Loading…</div>
              ) : items.length === 0 ? (
                <div className="ad-pad">No Pending Donations.</div>
              ) : (
                <div className="ad-tablewrap">
                  <table className="ad-table ad-table--striped">
                    <thead>
                      <tr>
                        <th className="ad-th">ID</th>
                        <th className="ad-th">Item</th>
                        <th className="ad-th">Category</th>
                        <th className="ad-th">Condition</th>
                        <th className="ad-th">Donor</th>
                        <th className="ad-th">Status</th>
                        <th className="ad-th">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} className="ad-row">
                          <td className="ad-td">#{it.id}</td>
                          <td className="ad-td">
                            <div className="ad-itemcell">
                              {it.image_url ? (
                                <img src={it.image_url} alt={it.name} className="ad-thumb" />
                              ) : (
                                <div className="ad-thumb ad-thumb--empty">No image</div>
                              )}
                              <div className="ad-itemcell__text">
                                <div className="ad-itemcell__title">{it.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="ad-td">{it.category}</td>
                          <td className="ad-td">{it.condition}</td>
                          <td className="ad-td">{it.donor_name} — {it.donor_email}</td>
                          <td className="ad-td"><span className="ad-badge">{it.status}</span></td>
                          <td className="ad-td">
                            <div className="ad-actions">
                              {/* SAME SIZE + SIDE BY SIDE */}
                              <button className="ad-btn ad-btn--blue ad-btn--sm" onClick={() => setActionForId(it.id)}>Actions</button>
                              <button className="ad-btn ad-btn--blue ad-btn--sm" onClick={() => openAttachments(it.id, it.image_url)}>Attachments</button>
                            </div>

                            {/* ACTIONS MODAL */}
                            {actionForId === it.id && (
                              <div className="ad-modal" role="dialog" aria-modal="true" aria-label={`Actions for item ${it.id}`}>
                                <div className="ad-modal__backdrop" onClick={() => setActionForId(null)} />
                                <div className="ad-modal__panel ad-modal__panel--sm">
                                  <div className="ad-modal__header">
                                    <h3>Actions — Item #{it.id}</h3>
                                    <button className="ad-modal__close" onClick={() => setActionForId(null)}>×</button>
                                  </div>
                                  <div className="ad-modal__body">
                                    <div className="ad-formgrid" style={{gridTemplateColumns:"1fr"}}>
                                      <div>
                                        <label className="ad-label">Rejection reason</label>
                                        <select
                                          className="ad-input"
                                          value={rejectKeyById[it.id] || ""}
                                          onChange={(e) => setRejectKeyById((prev) => ({ ...prev, [it.id]: e.target.value }))}
                                        >
                                          <option value="">Select a reason…</option>
                                          {reasons.map((r) => (
                                            <option key={r.key} value={r.key}>{r.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ad-modal__footer">
                                    <button className="ad-btn ad-btn--ghost" onClick={() => setActionForId(null)}>Close</button>
                                    <button className="ad-btn ad-btn--green ad-btn--block" disabled={busyId === it.id} onClick={() => approve(it.id)}>
                                      {busyId === it.id ? "…" : "Approve"}
                                    </button>
                                    <button className="ad-btn ad-btn--red ad-btn--block" disabled={busyId === it.id} onClick={() => reject(it.id)}>
                                      {busyId === it.id ? "…" : "Reject & Email"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ATTACHMENTS MODAL */}
              {attsForId !== null && (
                <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Attachments">
                  <div className="ad-modal__backdrop" onClick={() => setAttsForId(null)} />
                  <div className="ad-modal__panel">
                    <div className="ad-modal__header">
                      <h3>Attachments for item #{attsForId}</h3>
                      <button className="ad-modal__close" onClick={() => setAttsForId(null)}>×</button>
                    </div>
                    <div className="ad-modal__body">
                      {attsLoading ? (
                        <div>Loading…</div>
                      ) : attachments.length === 0 ? (
                        <div>No attachments.</div>
                      ) : (
                        <div className="ad-atts">
                          {attachments.map((src, i) => (
                            <a key={i} href={src} target="_blank" rel="noreferrer" className="ad-att">
                              <img src={src} alt={`Attachment ${i + 1}`} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="ad-modal__footer">
                      <button className="ad-btn ad-btn--blue" onClick={() => setAttsForId(null)}>Close</button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* USERS */}
          {tab === "users" && (
            <section className="ad-stack">
              {msgUsers && <div className="ad-alert">{msgUsers}</div>}

              {/* Create user */}
              <div className="ad-card">
                <div className="ad-card__header">
                  <h2 className="ad-h2">Create New User</h2>
                </div>
                <form onSubmit={createUser} className="ad-formgrid">
                  <div>
                    <label className="ad-label">Full name</label>
                    <input name="name" value={newUser.name} onChange={onNewUserChange} className="ad-input" required />
                  </div>
                  <div>
                    <label className="ad-label">Email</label>
                    <input type="email" name="email" value={newUser.email} onChange={onNewUserChange} className="ad-input" required />
                  </div>
                  <div>
                    <label className="ad-label">Password</label>
                    <input type="password" name="password" value={newUser.password} onChange={onNewUserChange} className="ad-input" required />
                  </div>
                  <div>
                    <label className="ad-label">Role</label>
                    <select name="role" value={newUser.role} onChange={onNewUserChange} className="ad-input">
                      <option value="donor">Donor</option>
                      <option value="caseworker">Caseworker</option>
                      <option value="driver">Driver</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="ad-formgrid__actions">
                    <button type="submit" disabled={creating} className="ad-btn ad-btn--blue ad-btn--lg">
                      {creating ? "Creating…" : "Create user"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Users table */}
              <div className="ad-card">
                <div className="ad-card__header">
                  <h2 className="ad-h2">All Users</h2>
                </div>

                {loadingUsers ? (
                  <div className="ad-pad">Loading…</div>
                ) : users.length === 0 ? (
                  <div className="ad-pad">No users found.</div>
                ) : (
                  <div className="ad-tablewrap">
                    <table className="ad-table ad-table--tight">
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
                        {users.map((u) => {
                          const isEditing = editingId === u.id;
                          return (
                            <tr key={u.id} className="ad-row">
                              <td className="ad-td">{u.id}</td>

                              <td className="ad-td">
                                {isEditing ? (
                                  <input className="ad-input ad-input--sm" value={String(editDraft.name ?? "")} onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))} />
                                ) : (
                                  u.name
                                )}
                              </td>

                              <td className="ad-td">
                                {isEditing ? (
                                  <input className="ad-input ad-input--sm" type="email" value={String(editDraft.email ?? "")} onChange={(e) => setEditDraft((p) => ({ ...p, email: e.target.value }))} />
                                ) : (
                                  u.email
                                )}
                              </td>

                              <td className="ad-td">
                                {isEditing ? (
                                  <select className="ad-input ad-input--sm" value={String(editDraft.role ?? "donor")} onChange={(e) => setEditDraft((p) => ({ ...p, role: e.target.value as UserRow["role"] }))}>
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
                                    <button onClick={saveEdit} disabled={savingId === u.id} className="ad-btn ad-btn--blue">{savingId === u.id ? "Saving…" : "Save"}</button>
                                    <button onClick={cancelEdit} className="ad-btn ad-btn--ghost">Cancel</button>
                                  </div>
                                ) : (
                                  <div className="ad-actions">
                                    <button onClick={() => startEdit(u)} className="ad-btn ad-btn--blue ad-btn--sm">Edit</button>
                                    <button onClick={() => setPwForId(u.id)} className="ad-btn ad-btn--ghost">Change Password</button>
                                    <button onClick={() => deleteUser(u.id)} disabled={deletingId === u.id} className="ad-btn ad-btn--red">
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

              {/* Password modal */}
              {pwForId !== null && (
                <div className="ad-modal" role="dialog" aria-modal="true" aria-label="Change password">
                  <div className="ad-modal__backdrop" onClick={() => { setPwForId(null); setNewPassword(""); }} />
                  <div className="ad-modal__panel ad-modal__panel--sm">
                    <div className="ad-modal__header">
                      <h3>Change Password (User #{pwForId})</h3>
                      <button className="ad-modal__close" onClick={() => { setPwForId(null); setNewPassword(""); }}>×</button>
                    </div>
                    <div className="ad-modal__body">
                      <label className="ad-label">New password</label>
                      <input
                        type="password"
                        className="ad-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="ad-modal__footer">
                      <button className="ad-btn ad-btn--ghost" onClick={() => { setPwForId(null); setNewPassword(""); }}>Cancel</button>
                      <button className="ad-btn ad-btn--blue" disabled={pwBusy || !newPassword.trim()} onClick={updatePassword}>
                        {pwBusy ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

/* Icon */
function AdminMark({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12l4-7h8l4 7-4 7H8l-4-7z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}