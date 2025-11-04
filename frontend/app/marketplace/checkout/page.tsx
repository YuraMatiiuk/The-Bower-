"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_LIST_URL = "/api/marketplace/items";         // GET, supports ?ids=1,2,3
const API_CHECKOUT_URL = "/api/marketplace/checkout";  // POST
const CART_KEY = "cw_cart";

type Item = {
  id: number;
  name: string;
  category: string;
  condition?: string;
  image_url?: string | null;
  status?: string;
};

type CartLine = { id: number; qty: number };

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveCart(lines: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

export default function MarketplaceCheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [recipient, setRecipient] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    suburb: "",
    postcode: "",
    notes: "",
  });

  const [delivery, setDelivery] = useState({
    date: "",
    time_slot: "9-12",
  });

  // 1) Load cart first
  useEffect(() => {
    const c = loadCart();
    setCart(c);

    (async () => {
      try {
        if (c.length === 0) {
          setCatalog([]);
          return;
        }
        // 2) Fetch ONLY the IDs we need
        const ids = c.map((l) => l.id).join(",");
        const res = await axios.get(`${API_LIST_URL}?ids=${encodeURIComponent(ids)}`, {
          validateStatus: () => true,
        });
        if (res.status === 200) {
          // Some APIs return {items: [...]}, others return directly [...]
          const items: Item[] = Array.isArray(res.data)
            ? res.data
            : (res.data.items || res.data || []);
          setCatalog(items);
        } else if (res.status === 401) {
          setMsg("Please log in to continue.");
        } else {
          setMsg(res.data?.error || "Failed to load items.");
        }
      } catch (e) {
        setMsg("Failed to load items.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Merge cart + catalog
  const fullCart = useMemo(() => {
    const map = new Map<number, Item>();
    for (const it of catalog) map.set(it.id, it);

    return cart.map((line) => {
      const item = map.get(line.id) || null;
      return { ...line, item };
    });
  }, [catalog, cart]);

  const availableCart = fullCart.filter((r) => !!r.item);
  const unavailable = fullCart.filter((r) => !r.item);

  function removeFromCart(id: number) {
    const next = cart.filter((l) => l.id !== id);
    setCart(next);
    saveCart(next);
  }

  function setQty(id: number, qty: number) {
    const next =
      qty <= 0
        ? cart.filter((l) => l.id !== id)
        : cart.map((l) => (l.id === id ? { ...l, qty } : l));
    setCart(next);
    saveCart(next);
  }

  function clearCart() {
    setCart([]);
    saveCart([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (availableCart.length === 0) {
      setMsg("Your cart is empty.");
      return;
    }
    if (!recipient.name || !recipient.phone || !recipient.address || !recipient.suburb || !recipient.postcode) {
      setMsg("Please complete recipient details (name, phone, address, suburb, postcode).");
      return;
    }
    if (!delivery.date) {
      setMsg("Please select a preferred delivery date.");
      return;
    }

    setSubmitting(true);
    try {
      // Be defensive: send both "items" (ids+qty) and "cart" (same) to match backend variants
      const itemsPayload = availableCart.map((l) => ({ id: l.id, qty: l.qty }));
      const payload = {
        items: itemsPayload,
        cart: itemsPayload,
        recipient,
        delivery,
      };

      const res = await axios.post(API_CHECKOUT_URL, payload, { validateStatus: () => true });

      if (res.status === 200 || res.status === 201) {
        clearCart();
        router.push("/marketplace?submitted=1");
      } else if (res.status === 401) {
        setMsg("Please log in to submit the order.");
      } else {
        setMsg(res.data?.error || "Failed to submit order.");
      }
    } catch (err) {
      setMsg("Failed to submit order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <Link href="/marketplace" className="px-3 py-2 rounded border">
          Back to marketplace
        </Link>
      </div>

      {msg && <div className="p-2 rounded border bg-yellow-50 text-sm">{msg}</div>}

      {/* Unavailable notice */}
      {!loading && unavailable.length > 0 && (
        <div className="p-3 rounded border bg-red-50 text-sm text-red-700">
          Some items are no longer available and were removed from your cart:
          <ul className="list-disc ml-5 mt-1">
            {unavailable.map((u) => (
              <li key={`missing-${u.id}`}>
                Item #{u.id} — <button onClick={() => removeFromCart(u.id)} className="underline">remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cart */}
      <section className="bg-white border rounded p-4">
        <h2 className="text-lg font-medium mb-3">Your cart</h2>

        {loading ? (
          <p>Loading…</p>
        ) : availableCart.length === 0 ? (
          <p>No items in cart.</p>
        ) : (
          <div className="space-y-3">
            {availableCart.map((row) => (
              <div key={row.id} className="border rounded p-3 flex items-start gap-3">
                <div className="w-24 h-24 rounded border overflow-hidden flex items-center justify-center bg-gray-50">
                  {row.item?.image_url ? (
                    <img
                      src={row.item.image_url}
                      alt={row.item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">No image</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{row.item?.name || `Item #${row.id}`}</div>
                  <div className="text-sm text-gray-600">
                    {row.item?.category}
                    {row.item?.condition ? ` • ${row.item.condition}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 rounded border" onClick={() => setQty(row.id, row.qty - 1)}>-</button>
                  <div className="px-3 py-1 rounded border bg-gray-50 min-w-10 text-center">
                    {row.qty}
                  </div>
                  <button className="px-3 py-1 rounded border" onClick={() => setQty(row.id, row.qty + 1)}>+</button>
                  <button className="px-3 py-1 rounded border" onClick={() => removeFromCart(row.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recipient + Delivery */}
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border rounded p-4">
        <div className="md:col-span-2">
          <h2 className="text-lg font-medium">Recipient details</h2>
        </div>

        <div>
          <label className="block text-sm mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={recipient.name}
            onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={recipient.phone}
            onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Email (optional)</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={recipient.email}
            onChange={(e) => setRecipient({ ...recipient, email: e.target.value })}
            placeholder="If you want a confirmation email"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Address</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={recipient.address}
            onChange={(e) => setRecipient({ ...recipient, address: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Suburb</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={recipient.suburb}
            onChange={(e) => setRecipient({ ...recipient, suburb: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Postcode</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={recipient.postcode}
            onChange={(e) => setRecipient({ ...recipient, postcode: e.target.value })}
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Notes (optional)</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={3}
            value={recipient.notes}
            onChange={(e) => setRecipient({ ...recipient, notes: e.target.value })}
            placeholder="Access details, stairs, preferred time, etc."
          />
        </div>

        <div className="md:col-span-2 mt-2">
          <h2 className="text-lg font-medium">Preferred delivery</h2>
        </div>
        <div>
          <label className="block text-sm mb-1">Date</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={delivery.date}
            onChange={(e) => setDelivery({ ...delivery, date: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Time slot</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={delivery.time_slot}
            onChange={(e) => setDelivery({ ...delivery, time_slot: e.target.value })}
          >
            <option value="9-12">9–12</option>
            <option value="12-3">12–3</option>
            <option value="3-5">3–5</option>
          </select>
        </div>

        <div className="md:col-span-2 mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || availableCart.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit for approval"}
          </button>
          <Link href="/marketplace" className="px-4 py-2 border rounded">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}