"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";

// ====== Adjust these if your API paths differ ======
const API_LIST_URL = "/api/marketplace/items"; // GET ?q=&category=
const CART_KEY = "cw_cart"; // localStorage key shared with checkout
// ===================================================

type Item = {
  id: number;
  name: string;
  category: string;
  condition?: string;
  image_url?: string | null;
  notes?: string | null;
};

type CartLine = { id: number; qty: number };

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((l) => l && typeof l.id === "number");
    return [];
  } catch {
    return [];
  }
}
function saveCart(lines: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

export default function MarketplacePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [msg, setMsg] = useState("");

  // load cart once
  useEffect(() => {
    setCart(loadCart());
  }, []);

  // fetch items
  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await axios.get(API_LIST_URL, {
        params: { q: q || undefined, category: category || undefined },
        validateStatus: () => true,
      });
      if (res.status === 200) {
        setItems(res.data.items || res.data || []);
      } else {
        setMsg(res.data?.error || "Failed to load items.");
      }
    } catch {
      setMsg("Failed to load items.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // derived categories from data
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      const c = it.category || "Uncategorised";
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  function cartQty(id: number) {
    return cart.find((l) => l.id === id)?.qty || 0;
  }
  function addToCart(id: number) {
    const next = [...cart];
    const row = next.find((l) => l.id === id);
    if (row) row.qty += 1;
    else next.push({ id, qty: 1 });
    setCart(next);
    saveCart(next);
  }
  function decFromCart(id: number) {
    const next = cart
      .map((l) => (l.id === id ? { ...l, qty: l.qty - 1 } : l))
      .filter((l) => l.qty > 0);
    setCart(next);
    saveCart(next);
  }
  function clearCart() {
    setCart([]);
    saveCart([]);
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Marketplace</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace/checkout"
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Cart ({cart.reduce((s, l) => s + l.qty, 0)})
          </Link>
          {cart.length > 0 && (
            <button
              className="px-3 py-2 rounded border"
              onClick={clearCart}
              title="Clear cart"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={search} className="bg-white border rounded p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. sofa, table, fridge…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">All categories</option>
            {categories.map(([cat, count]) => (
              <option key={cat} value={cat}>
                {cat} ({count})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded"
          >
            Apply
          </button>
        </div>
      </form>

      {msg && <div className="p-2 rounded border bg-yellow-50 text-sm">{msg}</div>}

      {/* Results */}
      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No items available right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="border rounded p-3 flex flex-col">
              <div className="aspect-video mb-2 bg-gray-50 border rounded flex items-center justify-center overflow-hidden">
                {it.image_url ? (
                  <img
                    src={it.image_url}
                    alt={it.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-gray-500">No image</span>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium">{it.name}</div>
                <div className="text-sm text-gray-600">{it.category}{it.condition ? ` • ${it.condition}` : ""}</div>
                {it.notes && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{it.notes}</div>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {cartQty(it.id) > 0 ? (
                  <>
                    <button className="px-3 py-1 rounded border" onClick={() => decFromCart(it.id)}>-</button>
                    <div className="px-3 py-1 rounded border bg-gray-50">
                      {cartQty(it.id)}
                    </div>
                    <button className="px-3 py-1 rounded border" onClick={() => addToCart(it.id)}>+</button>
                  </>
                ) : (
                  <button
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => addToCart(it.id)}
                  >
                    Add to cart
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}