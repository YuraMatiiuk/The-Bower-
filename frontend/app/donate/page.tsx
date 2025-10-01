"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

type Category = { id: number; name: string };

type FormState = {
  itemName: string;
  condition: string;
  address: string;
  suburb: string;
  postcode: string;
  imageFile: File | null;
};

const CONDITIONS = ["Excellent", "Good", "Fair", "Needs Repair"];

export default function DonatePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    itemName: "",
    condition: CONDITIONS[0],
    address: "",
    suburb: "",
    postcode: "",
    imageFile: null,
  });

  const [checkingArea, setCheckingArea] = useState(false);
  const [serviceOk, setServiceOk] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<string>("");

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/categories", { validateStatus: () => true });
        if (res.status === 200) {
          setCategories(res.data || []);
          if (res.data?.length) setCategoryId(res.data[0].id);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Prefill from /api/auth/me (if available)
  useEffect(() => {
    (async () => {
      try {
        const me = await axios.get("/api/auth/me", { validateStatus: () => true });
        if (me.status === 200 && me.data) {
          const next = {
            ...form,
            address: me.data.address || "",
            suburb: me.data.suburb || "",
            postcode: me.data.postcode || "",
          };
          setForm(next);
          if (next.postcode && next.suburb) {
            checkServiceArea(next.postcode, next.suburb);
          }
        }
      } catch {
        /* ignore */
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  function onChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    const next = { ...form, [name]: value };
    setForm(next);
    setSubmitError("");
    setSubmitSuccess("");
    if (name === "postcode" || name === "suburb") {
      checkServiceArea(next.postcode, next.suburb);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, imageFile: file }));
    setSubmitError("");
    setSubmitSuccess("");
  }

  async function checkServiceArea(pc: string, sub: string) {
    if (!pc || !sub) {
      setServiceOk(null);
      return;
    }
    setCheckingArea(true);
    try {
      const res = await axios.get("/api/service-areas/check", {
        params: { postcode: pc.trim(), suburb: sub.trim() },
        validateStatus: () => true,
      });
      setServiceOk(res.status === 200 && !!res.data?.ok);
    } catch {
      setServiceOk(null);
    } finally {
      setCheckingArea(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess("");

    if (serviceOk === false) {
      setSubmitError("Sorry, we currently only collect from approved suburbs/postcodes.");
      return;
    }
    if (!categoryId) {
      setSubmitError("Please choose a category.");
      return;
    }

    try {
      const data = new FormData();
      data.append("itemName", form.itemName);
      data.append("category_id", String(categoryId));
      // (Optional) also send text name; backend can ignore or use for legacy:
      // const chosen = categories.find(c => c.id === categoryId)?.name || "";
      // data.append("category", chosen);

      data.append("condition", form.condition);
      data.append("address", form.address);
      data.append("suburb", form.suburb);
      data.append("postcode", form.postcode);
      if (form.imageFile) data.append("image", form.imageFile);

      const res = await axios.post("/api/donations", data, {
        headers: { "Content-Type": "multipart/form-data" },
        validateStatus: () => true,
      });

      if (res.status === 200) {
        setSubmitSuccess("Donation submitted successfully! 🎉");
        // Reset item-specific fields, keep address details in place
        setForm((prev) => ({
          ...prev,
          itemName: "",
          condition: CONDITIONS[0],
          imageFile: null,
        }));
      } else {
        setSubmitError(res.data?.error || "Failed to submit donation.");
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || "Failed to submit donation.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Donate an Item</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Item name */}
        <div>
          <label className="block text-sm font-medium mb-1">Item name</label>
          <input
            name="itemName"
            value={form.itemName}
            onChange={onChange}
            required
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Fridge, Queen Bed Frame"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium mb-1">Condition</label>
          <select
            name="condition"
            value={form.condition}
            onChange={onChange}
            className="w-full border rounded px-3 py-2"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Pickup address */}
        <div>
          <label className="block text-sm font-medium mb-1">Pickup address</label>
          <input
            name="address"
            value={form.address}
            onChange={onChange}
            className="w-full border rounded px-3 py-2"
            placeholder="Street address"
          />
        </div>

        {/* Suburb + Postcode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Suburb</label>
            <input
              name="suburb"
              value={form.suburb}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. SURRY HILLS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Postcode</label>
            <input
              name="postcode"
              value={form.postcode}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g. 2010"
            />
          </div>
        </div>

        {/* Live service area status */}
        <div className="text-sm">
          {checkingArea && <p className="text-gray-600">Checking service area…</p>}
          {serviceOk === true && <p className="text-green-700">We service this area ✅</p>}
          {serviceOk === false && (
            <p className="text-red-700">
              Sorry, we currently only collect from approved suburbs/postcodes. ❌
            </p>
          )}
        </div>

        {/* Image upload (optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">Item photo (optional)</label>
          <input type="file" accept="image/*" onChange={onFileChange} />
        </div>

        {/* Submit + messages */}
        <button
          type="submit"
          disabled={serviceOk === false}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Submit Donation
        </button>

        {submitError && <div className="text-red-700">{submitError}</div>}
        {submitSuccess && <div className="text-green-700">{submitSuccess}</div>}
      </form>
    </div>
  );
}