"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Item = {
  id: number;
  name: string;
  category: string;
  condition: string;
  donor_name: string;
  donor_email: string;
  address: string;
  postcode: string;
  phone?: string;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export default function AdminPage() {
  // Pending items
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Create user
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"donor" | "caseworker" | "driver" | "admin">("caseworker");
  const [userMsg, setUserMsg] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchItems();
    fetchUsers();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/items");
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAction = async (itemId: number, action: "approved" | "rejected") => {
    try {
      const res = await axios.post("/api/admin/items", { itemId, action });
      setMessage(res.data.message);
      fetchItems();
    } catch (err) {
      console.error(err);
      setMessage("Error updating item");
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMsg("");
    try {
      const res = await axios.post("/api/admin/users", {
        name, email, password, role,
      });
      setUserMsg(res.data.message || "User created");
      setName(""); setEmail(""); setPassword(""); setRole("caseworker");
      fetchUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to create user";
      setUserMsg(msg);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get("/api/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoadingUsers(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Pending Items */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Pending Donations</h2>
        {message && <p className="mb-3 text-blue-600">{message}</p>}
        {loading ? (
          <p>Loading pending items...</p>
        ) : items.length === 0 ? (
          <p>No pending items 🎉</p>
        ) : (
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Item</th>
                <th className="border p-2">Category</th>
                <th className="border p-2">Condition</th>
                <th className="border p-2">Donor</th>
                <th className="border p-2">Contact</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">{item.category}</td>
                  <td className="border p-2">{item.condition}</td>
                  <td className="border p-2">
                    {item.donor_name} <br /> {item.donor_email}
                  </td>
                  <td className="border p-2">
                    {item.address}, {item.postcode} <br /> {item.phone || "No phone"}
                  </td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => handleAction(item.id, "approved")}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "rejected")}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Create User */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Create User (Admin)</h2>
        {userMsg && <p className="mb-3 text-blue-600">{userMsg}</p>}
        <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Full Name</label>
            <input
              className="w-full border p-2 rounded"
              value={name}
              onChange={(e)=>setName(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border p-2 rounded"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select
              className="w-full border p-2 rounded"
              value={role}
              onChange={(e)=>setRole(e.target.value as any)}
            >
              <option value="caseworker">Caseworker</option>
              <option value="driver">Driver</option>
              <option value="donor">Donor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Temporary Password</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="e.g., Temp123!"
              required
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Create User
            </button>
          </div>
        </form>

        {/* Optional: show latest users */}
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Recent Users</h3>
          {loadingUsers ? (
            <p>Loading users…</p>
          ) : users.length === 0 ? (
            <p>No users yet.</p>
          ) : (
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Name</th>
                  <th className="border p-2">Email</th>
                  <th className="border p-2">Role</th>
                  <th className="border p-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="border p-2">{u.name}</td>
                    <td className="border p-2">{u.email}</td>
                    <td className="border p-2">{u.role}</td>
                    <td className="border p-2">{u.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
