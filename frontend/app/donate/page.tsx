"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";

type Me = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
};

const CATEGORIES = [
  "White Goods",
  "Kitchen Appliances",
  "Kitchen Essentials",
  "Bedroom Furniture",
  "Lounge & Living Furniture",
  "Dining Furniture",
  "Household Appliances",
  "Home Office & Study",
  "Children’s Items",
  "Bikes & Scooters",
  "Books & Media",
  "Tools & DIY",
  "Outdoor & Garden",
  "Decor & Bric-a-Brac",
];

type ItemForm = {
  itemName: string;
  category: string;
  condition: "excellent" | "good" | "fair" | "poor";
  width_cm?: string;
  depth_cm?: string;
  height_cm?: string;
  weight_kg?: string;
  file?: File | null;
  preview?: string | null;
};

export default function DonatePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [postcode, setPostcode] = useState("");

  // suburb suggestions for a postcode
  const [suburbList, setSuburbList] = useState<string[]>([]);
  const canFetchSubs = useMemo(() => /^\d{4}$/.test(postcode.trim()), [postcode]);

  // multi items
  const [items, setItems] = useState<ItemForm[]>([
    { itemName: "", category: "", condition: "good", file: null, preview: null },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/auth/me", { validateStatus: () => true });
        if (res.status === 200) {
          const u: Me = res.data.user || res.data;
          setMe(u);
          setAddress(u.address || "");
          setSuburb(u.suburb || "");
          setPostcode(u.postcode || "");
        } else if (res.status === 401) {
          setMsg("Please log in to donate an item.");
        }
      } catch {
        setMsg("Failed to load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // fetch suburbs for postcode
  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const res = await axios.get("/api/service-areas/suburbs", {
          params: { postcode: postcode.trim() },
          validateStatus: () => true,
        });
        if (!alive) return;
        if (res.status === 200) setSuburbList(res.data?.suburbs || []);
        else setSuburbList([]);
      } catch {
        if (!alive) return;
        setSuburbList([]);
      }
    }
    if (canFetchSubs) run();
    else setSuburbList([]);
    return () => { alive = false; };
  }, [canFetchSubs, postcode]);

  function updateItem(idx: number, patch: Partial<ItemForm>) {
    setItems((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function onFile(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    updateItem(idx, { file: f, preview: f ? URL.createObjectURL(f) : null });
  }

  function addItem() {
    setItems((arr) => [
      ...arr,
      { itemName: "", category: "", condition: "good", file: null, preview: null },
    ]);
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!address.trim() || !suburb.trim() || !postcode.trim())
      return setMsg("Please fill your collection address, suburb and postcode.");

    const payload = items.map((it) => ({
      itemName: it.itemName.trim(),
      category: it.category,
      condition: it.condition,
      width_cm: it.width_cm ? Number(it.width_cm) : undefined,
      depth_cm: it.depth_cm ? Number(it.depth_cm) : undefined,
      height_cm: it.height_cm ? Number(it.height_cm) : undefined,
      weight_kg: it.weight_kg ? Number(it.weight_kg) : undefined,
    }));

    if (payload.some((p) => !p.itemName || !p.category)) {
      return setMsg("Please complete item name and category for all items.");
    }

    try {
      const fd = new FormData();
      fd.append("address", address.trim());
      fd.append("suburb", suburb.trim());
      fd.append("postcode", postcode.trim());
      fd.append("items", JSON.stringify(payload));
      // attach images in the same order
      items.forEach((it) => {
        if (it.file) fd.append("images", it.file);
      });

      const res = await axios.post("/api/donations", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        validateStatus: () => true,
      });

      if (res.status === 201) {
        setMsg("Thanks! Your donation was submitted for review ✅");
        // reset items but keep address
        setItems([{ itemName: "", category: "", condition: "good", file: null, preview: null }]);
      } else {
        setMsg(res.data?.message || res.data?.error || "Donation failed.");
      }
    } catch {
      setMsg("Donation failed.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Donate Items</h1>
        <div className="flex gap-2">
          <Link href="/donor" className="px-3 py-2 rounded border">My Dashboard</Link>
          <Link href="/collections" className="px-3 py-2 rounded border">My Collections</Link>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : me ? (
        <p className="text-sm text-gray-400">Logged in as <strong>{me.name}</strong> ({me.email})</p>
      ) : (
        <p className="text-sm text-red-400">Please log in to donate.</p>
      )}

      {msg && (
        <div className="p-2 rounded border bg-yellow-900/30 border-yellow-700 text-yellow-100 text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 gap-6">
        {/* Address block */}
        <section className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded p-4">
          <h2 className="text-lg font-medium mb-3">Collection Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Street address</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                placeholder="Street address"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Postcode</label>
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                placeholder="e.g. 2010"
                maxLength={4}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Suburb {suburbList.length ? "(select from list)" : ""}
              </label>
              <input
                list="suburb-options"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                placeholder={suburbList.length ? "Start typing and pick…" : "Suburb"}
                required
              />
              <datalist id="suburb-options">
                {suburbList.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {canFetchSubs && suburbList.length === 0 && (
                <p className="text-xs text-red-300 mt-1">
                  No suburbs found for this postcode—please check.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Items block */}
        <section className="bg-neutral-900 text-neutral-100 border border-neutral-700 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            >
              + Add another item
            </button>
          </div>

          <div className="space-y-6">
            {items.map((it, idx) => (
              <div key={idx} className="border border-neutral-700 rounded p-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">Item #{idx + 1}</h3>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-red-300 hover:text-red-200 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm mb-1">Item name</label>
                    <input
                      value={it.itemName}
                      onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                      className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                      placeholder="e.g. Two-seater sofa"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Category</label>
                    <select
                      value={it.category}
                      onChange={(e) => updateItem(idx, { category: e.target.value })}
                      className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white"
                      required
                    >
                      <option value="">Select…</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Condition</label>
                    <select
                      value={it.condition}
                      onChange={(e) =>
                        updateItem(idx, { condition: e.target.value as ItemForm["condition"] })
                      }
                      className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white"
                      required
                    >
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>

                  {/* Dimensions (optional) */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm mb-1">Width (cm)</label>
                      <input
                        inputMode="decimal"
                        value={it.width_cm || ""}
                        onChange={(e) => updateItem(idx, { width_cm: e.target.value })}
                        className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                        placeholder="e.g. 180"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Depth (cm)</label>
                      <input
                        inputMode="decimal"
                        value={it.depth_cm || ""}
                        onChange={(e) => updateItem(idx, { depth_cm: e.target.value })}
                        className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                        placeholder="e.g. 85"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Height (cm)</label>
                      <input
                        inputMode="decimal"
                        value={it.height_cm || ""}
                        onChange={(e) => updateItem(idx, { height_cm: e.target.value })}
                        className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                        placeholder="e.g. 75"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Weight (kg)</label>
                    <input
                      inputMode="decimal"
                      value={it.weight_kg || ""}
                      onChange={(e) => updateItem(idx, { weight_kg: e.target.value })}
                      className="w-full border border-neutral-700 rounded px-3 py-2 bg-neutral-800 text-white placeholder-neutral-400"
                      placeholder="e.g. 30"
                    />
                  </div>

                  {/* Image */}
                  <div>
                    <label className="block text-sm mb-1">Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onFile(idx, e)}
                      className="block w-full text-sm text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-neutral-700 file:text-neutral-100 hover:file:bg-neutral-600"
                    />
                    {it.preview && (
                      <div className="mt-2">
                        <img src={it.preview} alt="preview" className="w-40 h-40 object-cover rounded border border-neutral-700" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit donation
          </button>
          <Link href="/donor" className="px-4 py-2 border rounded">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}