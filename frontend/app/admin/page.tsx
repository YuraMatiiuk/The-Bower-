"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

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
  // optional profile fields if your API returns them:
  phone?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
};

export default function AdminPage() {
  const [tab, setTab] = useState<"items" | "users">("items");

  // --- items state ---
  const [items, setItems] = useState<Item[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [rejectKeyById, setRejectKeyById] = useState<Record<number, string>>({});
  const [msgItems, setMsgItems] = useState("");

  // --- users state ---
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

  // -------- Items: load/list/approve/reject --------
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

  useEffect(() => {
    if (tab === "items") loadItems();
  }, [tab]);

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

  // -------- Users: load/create --------
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

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab]);

  function onNewUserChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setNewUser((p) => ({ ...p, [name]: value }));
    setMsgUsers("");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMsgUsers("");
    try {
      const res = await axios.post(
        "/api/admin/users",
        newUser,
        { validateStatus: () => true }
      );
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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded border ${tab === "items" ? "bg-blue-600 text-white border-blue-700" : ""}`}
          onClick={() => setTab("items")}
        >
          Items Moderation
        </button>
        <button
          className={`px-3 py-1 rounded border ${tab === "users" ? "bg-blue-600 text-white border-blue-700" : ""}`}
          onClick={() => setTab("users")}
        >
          User Management
        </button>
      </div>

      {/* -------- ITEMS TAB -------- */}
      {tab === "items" && (
        <section className="space-y-4">
          {msgItems && (
            <div className="p-2 rounded border bg-yellow-50 text-sm">{msgItems}</div>
          )}

          {loadingItems ? (
            <p>Loading…</p>
          ) : items.length === 0 ? (
            <p>No items.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((it) => (
                <div key={it.id} className="border rounded p-3 flex gap-3">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="w-24 h-24 object-cover rounded border" />
                  ) : (
                    <div className="w-24 h-24 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">#{it.id} — {it.name}</div>
                      <span className="text-xs px-2 py-1 rounded border bg-gray-50">{it.status}</span>
                    </div>
                    <div className="text-sm text-gray-600">{it.category} • {it.condition}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {it.donor_name} — {it.donor_email}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => approve(it.id)}
                        disabled={busyItemId === it.id}
                        className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {busyItemId === it.id ? "…" : "Approve"}
                      </button>

                      <select
                        className="border rounded px-2 py-1"
                        value={rejectKeyById[it.id] || ""}
                        onChange={(e) =>
                          setRejectKeyById((prev) => ({ ...prev, [it.id]: e.target.value }))
                        }
                      >
                        <option value="">Select reason…</option>
                        {reasons.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => reject(it.id)}
                        disabled={busyItemId === it.id}
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
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

      {/* -------- USERS TAB -------- */}
      {tab === "users" && (
        <section className="space-y-6">
          {msgUsers && (
            <div className="p-2 rounded border bg-yellow-50 text-sm">{msgUsers}</div>
          )}

          {/* Create user */}
          <div className="border rounded p-4">
            <h2 className="text-lg font-medium mb-3">Create New User</h2>
            <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Full name</label>
                <input
                  name="name"
                  value={newUser.name}
                  onChange={onNewUserChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={onNewUserChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={newUser.password}
                  onChange={onNewUserChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={onNewUserChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="donor">Donor</option>
                  <option value="caseworker">Caseworker</option>
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create user"}
                </button>
              </div>
            </form>
          </div>

          {/* Users list */}
          <div className="border rounded p-4">
            <h2 className="text-lg font-medium mb-3">All Users</h2>
            {loadingUsers ? (
              <p>Loading…</p>
            ) : users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="py-2 pr-4">{u.id}</td>
                        <td className="py-2 pr-4">{u.name}</td>
                        <td className="py-2 pr-4">{u.email}</td>
                        <td className="py-2 pr-4">{u.role}</td>
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
  );
}