"use client";

import { useEffect, useState } from "react";
import axios from "axios";

type Profile = { address: string; postcode: string; phone: string };
type UserInfo = { name: string; email: string; role: string };
type Item = { id: number; name: string; category: string; condition: string; status: string };

export default function DonorDashboard() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<Profile>({ address: "", postcode: "", phone: "" });
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      // Profile (name + donor details)
      const p = await axios.get("/api/donor/profile");
      setUser(p.data.user);
      setProfile(p.data.profile);
      // Items belonging to this donor (by JWT)
      const itemsRes = await axios.get("/api/donor/my-items");
      setItems(itemsRes.data || []);
    } catch (e) {
      console.error(e);
      setMsg("Failed to load dashboard");
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await axios.post("/api/donor/profile", {
        name: user?.name,
        address: profile.address,
        postcode: profile.postcode,
        phone: profile.phone,
      });
      setMsg("Profile saved");
    } catch (e: any) {
      setMsg(e?.response?.data?.error || "Save failed");
    }
    setSaving(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Donor Dashboard</h1>
        <div className="space-x-2">
          <a href="/donate" className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700">
            Donate an Item
          </a>
          <a href="/collections" className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">
            Book Collection
          </a>
        </div>
      </header>

      {msg && <p className="text-blue-600">{msg}</p>}

      {/* Profile card */}
      <section className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-3">My Profile</h2>
        <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full border p-2 rounded"
              value={user?.name || ""}
              onChange={(e) => setUser((u) => (u ? { ...u, name: e.target.value } : u))}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="w-full border p-2 rounded bg-gray-100" value={user?.email || ""} disabled />
          </div>
          <div>
            <label className="block text-sm mb-1">Address</label>
            <input
              className="w-full border p-2 rounded"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="Street address"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Postcode</label>
            <input
              className="w-full border p-2 rounded"
              value={profile.postcode}
              onChange={(e) => setProfile({ ...profile, postcode: e.target.value })}
              placeholder="Postcode"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone</label>
            <input
              className="w-full border p-2 rounded"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="Phone number"
            />
          </div>
          <div className="md:col-span-2">
            <button
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

      {/* My donations */}
      <section className="border rounded p-4">
        <h2 className="text-lg font-semibold mb-3">My Donations</h2>
        {items.length === 0 ? (
          <p>No items yet. Start by donating an item.</p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Item</th>
                <th className="border p-2">Category</th>
                <th className="border p-2">Condition</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="border p-2">{it.name}</td>
                  <td className="border p-2">{it.category}</td>
                  <td className="border p-2">{it.condition}</td>
                  <td className="border p-2">{it.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
