"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BTN_BLUE = "#0873B9";

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

type Me = { name?: string; email?: string; role?: string } | { user?: { name?: string } };

export default function AdminPage() {
  const router = useRouter();

  // ---------- USER (same approach as Donate/Donor pages) ----------
  const [me, setMe] = useState<Me>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store", credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMe(data);
        }
      } catch {
        /* ignore */
      }
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

  // EXACT same name derivation style as Donate: prefer top-level name; fallback to user.name
  const rawName =
    (typeof (me as any)?.name === "string" ? (me as any).name : (me as any)?.user?.name) || "";
  const displayName = (rawName || "").trim() || "User";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "U";

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/login");
  }

  // ---------- Pending items ----------
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function fetchItems() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/items", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setItems([]);
      setMessage("Failed to load items");
    }
    setLoading(false);
  }

  async function handleAction(itemId: number, action: "approved" | "rejected") {
    try {
      const res = await fetch("/api/admin/items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Error updating item");
      setMessage(data?.message || "Updated");
      // Optimistic remove
      setItems((prev) => prev.filter((it) => it.id !== itemId));
    } catch (err) {
      console.error(err);
      setMessage("Error updating item");
    }
  }

  // ---------- Create user ----------
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"donor" | "caseworker" | "driver" | "admin">("caseworker");
  const [userMsg, setUserMsg] = useState("");

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setUserMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create user");
      setUserMsg(data?.message || "User created");
      setName(""); setEmail(""); setPassword(""); setRole("caseworker");
      fetchUsers();
    } catch (err: any) {
      setUserMsg(err?.message || "Failed to create user");
    }
  }

  // ---------- Recent users ----------
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    }
    setLoadingUsers(false);
  }

  useEffect(() => {
    fetchItems();
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      {/* HEADER (matches other modules) */}
      <header className="px-8 pt-6 pb-4 border-b border-black/20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <AdminMark className="w-7 h-7" />
            Admin Dashboard
          </h1>

          {/* user + initials + menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((s) => !s)}
              className="flex items-center gap-3"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span
                className="inline-grid place-items-center w-9 h-9 rounded-full text-white text-sm font-semibold"
                style={{ background: "#111827" }}
                aria-hidden
              >
                {initials}
              </span>
              <span className="text-lg font-medium">{displayName}</span>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
                <path d="M5.5 7.5l4.5 4.5 4.5-4.5" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg z-10"
              >
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  role="menuitem"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN — same sections, refreshed style */}
      <main className="p-6 max-w-6xl mx-auto space-y-10">
        {/* Pending Items */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Pending Donations</h2>
            <button
              onClick={fetchItems}
              className="h-9 px-3 rounded-md text-white"
              style={{ background: BTN_BLUE }}
              title="Refresh"
            >
              Refresh
            </button>
          </div>

          {message && <p className="mb-3 text-[#1e40af]">{message}</p>}

          {loading ? (
            <div className="p-4 border border-gray-200 rounded-md">Loading pending items…</div>
          ) : items.length === 0 ? (
            <div className="p-4 border border-gray-200 rounded-md">No pending items 🎉</div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-[#2D6AA3] text-white">
                  <tr>
                    <Th>Item</Th>
                    <Th>Category</Th>
                    <Th>Condition</Th>
                    <Th>Donor</Th>
                    <Th>Contact</Th>
                    <Th className="text-center">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="odd:bg-white even:bg-gray-50">
                      <Td>{item.name}</Td>
                      <Td>{item.category}</Td>
                      <Td>{item.condition}</Td>
                      <Td>
                        <div className="font-medium">{item.donor_name}</div>
                        <div className="text-xs text-gray-600">{item.donor_email}</div>
                      </Td>
                      <Td>
                        <div>{item.address}</div>
                        <div className="text-xs text-gray-600">
                          {item.postcode} {item.phone ? `• ${item.phone}` : ""}
                        </div>
                      </Td>
                      <Td className="text-center">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleAction(item.id, "approved")}
                            className="h-9 px-3 rounded-md text-white"
                            style={{ background: BTN_BLUE }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(item.id, "rejected")}
                            className="h-9 px-3 rounded-md border border-gray-300"
                          >
                            Reject
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Create User */}
        <section>
          <h2 className="text-xl font-semibold mb-3">Create User (Admin)</h2>
          {userMsg && <p className="mb-3 text-[#1e40af]">{userMsg}</p>}

          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full Name"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full h-11 rounded-md border border-gray-300 px-3 outline-none focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="caseworker">Caseworker</option>
                <option value="driver">Driver</option>
                <option value="donor">Donor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Temporary Password</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g., Temp123!"
                required
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="h-11 px-4 rounded-md text-white"
                style={{ background: BTN_BLUE }}
              >
                Create User
              </button>
            </div>
          </form>

          {/* Recent Users */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Recent Users</h3>
            {loadingUsers ? (
              <div className="p-4 border border-gray-200 rounded-md">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="p-4 border border-gray-200 rounded-md">No users yet.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Role</Th>
                      <Th>Created</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="odd:bg-white even:bg-gray-50">
                        <Td>{u.name}</Td>
                        <Td>{u.email}</Td>
                        <Td>{u.role}</Td>
                        <Td>{u.created_at}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={"px-3 py-2 text-left font-semibold " + className}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-3 py-3 align-top " + className}>{children}</td>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm mb-1">{children}</label>;
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "w-full h-11 rounded-md border border-gray-300 bg-white px-3 outline-none " +
        "focus:border-[#0873B9] focus:ring-4 focus:ring-[#0873B9]/20 " +
        (props.className || "")
      }
    />
  );
}
function AdminMark({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12l4-7h8l4 7-4 7H8l-4-7z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
