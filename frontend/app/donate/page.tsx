"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import styles from "../../styles/DonatePage.module.css";

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

export default function DonatePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const [form, setForm] = useState({
    itemName: "",
    category: "",
    condition: "good",
    address: "",
    suburb: "",
    postcode: "",
    image: null as File | null,
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [suburbOk, setSuburbOk] = useState<null | boolean>(null);
  const [suburbHelp, setSuburbHelp] = useState<string>("");

  // Prefill from /api/auth/me
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/auth/me", { validateStatus: () => true });
        if (res.status === 200) {
          const u: Me = res.data.user || res.data;
          setMe(u);
          setForm((f) => ({
            ...f,
            address: u.address || "",
            suburb: u.suburb || "",
            postcode: u.postcode || "",
          }));
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

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setMsg("");
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setForm((f) => ({ ...f, image: file }));
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  // Live check of service area when suburb or postcode changes
  const canCheck = useMemo(
    () => form.suburb.trim().length >= 2 && form.postcode.trim().length >= 4,
    [form.suburb, form.postcode]
  );

  useEffect(() => {
    let alive = true;
    async function check() {
      setSuburbHelp("");
      setSuburbOk(null);
      try {
        const res = await axios.get("/api/service-areas/check", {
          params: { postcode: form.postcode.trim(), suburb: form.suburb.trim() },
          validateStatus: () => true,
        });
        if (!alive) return;
        if (res.status === 200 && res.data?.ok) {
          setSuburbOk(true);
        } else {
          setSuburbOk(false);
          const sug: string[] = res.data?.suggestions || [];
          if (sug.length) {
            setSuburbHelp(`Not found for this postcode. Did you mean: ${sug.slice(0, 5).join(", ")}?`);
          } else {
            setSuburbHelp("We currently collect only in approved areas.");
          }
        }
      } catch {
        if (!alive) return;
        setSuburbOk(null);
        setSuburbHelp("");
      }
    }
    if (canCheck) check();
    return () => {
      alive = false;
    };
  }, [canCheck, form.suburb, form.postcode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    // Basic client validation
    if (!form.itemName.trim()) return setMsg("Please enter the item name.");
    if (!form.category) return setMsg("Please choose a category.");
    if (!form.address.trim() || !form.suburb.trim() || !form.postcode.trim())
      return setMsg("Please fill your collection address, suburb and postcode.");
    if (suburbOk === false)
      return setMsg("This suburb/postcode is not in our service area.");

    try {
      const fd = new FormData();
      fd.append("itemName", form.itemName.trim());
      fd.append("category", form.category);
      fd.append("condition", form.condition.toLowerCase());
      fd.append("address", form.address.trim());
      fd.append("suburb", form.suburb.trim());
      fd.append("postcode", form.postcode.trim());
      if (form.image) fd.append("image", form.image);

      const res = await axios.post("/api/donations", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        validateStatus: () => true,
      });

      if (res.status === 201) {
        setMsg("Thanks! Your donation was submitted for review ✅");
        // reset item-specific fields, keep address fields for convenience
        setForm((f) => ({
          ...f,
          itemName: "",
          category: "",
          condition: "good",
          image: null,
        }));
        setPreview(null);
      } else if (res.status === 400 && res.data?.error === "out_of_area") {
        setMsg(res.data?.message || "Out of service area.");
      } else if (res.status === 400 && res.data?.error === "invalid_condition") {
        setMsg(res.data?.message || "Invalid condition selected.");
      } else if (res.status === 401) {
        setMsg("Please log in to donate.");
      } else {
        setMsg(res.data?.error || "Donation failed.");
      }
    } catch {
      setMsg("Donation failed.");
    }
  }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Donate an Item</h1>
        <div className={styles.headerButtons}>
          <Link href="/donor" className={styles.linkBtn}>My Dashboard</Link>
          <Link href="/collections" className={styles.linkBtn}>My Collections</Link>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : me ? (
        <p className={styles.meta}>Logged in as <strong>{me.name}</strong> ({me.email})</p>
      ) : (
        <p className={`${styles.meta} ${styles.metaError}`}>Please log in to donate.</p>
      )}

      {msg && <div className={styles.alert}>{msg}</div>}

      <form onSubmit={submit} className={`${styles.section} ${styles.grid}`}>
        {/* Item name */}
        <div>
          <label className={styles.label}>Item name</label>
          <input
            name="itemName"
            value={form.itemName}
            onChange={onChange}
            className={styles.input}
            placeholder="e.g. Two-seater sofa"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className={styles.label}>Category</label>
          <select
            name="category"
            value={form.category}
            onChange={onChange}
            className={styles.select}
            required
          >
            <option value="">Select a category…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Condition */}
        <div>
          <label className={styles.label}>Condition</label>
          <select
            name="condition"
            value={form.condition}
            onChange={onChange}
            className={styles.select}
            required
          >
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
          <p className={styles.helpText}>
            Please be honest about wear/tear. Items must be clean, complete, and functional.
          </p>
        </div>

        {/* Address */}
        <div className={`${styles.grid2} ${styles.span2}`}>
          <div className={styles.span2}>
            <label className={styles.label}>Collection address</label>
            <input
              name="address"
              value={form.address}
              onChange={onChange}
              className={styles.input}
              placeholder="Street address"
              required
            />
          </div>
          <div>
            <label className={styles.label}>Suburb</label>
            <input
              name="suburb"
              value={form.suburb}
              onChange={onChange}
              className={`${styles.input} ${suburbOk === false ? styles.inputError : ""}`}
              required
            />
            {suburbHelp && (
              <p className={styles.helpText}>{suburbHelp}</p>
            )}
          </div>
          <div>
            <label className={styles.label}>Postcode</label>
            <input
              name="postcode"
              value={form.postcode}
              onChange={onChange}
              className={`${styles.input} ${suburbOk === false ? styles.inputError : ""}`}
              required
            />
          </div>
        </div>

        {/* Image */}
        <div>
          <label className={styles.label}>Photo (optional)</label>
          <input type="file" accept="image/*" onChange={onFile} className={styles.input} />
          {preview && (
            <div>
              <img src={preview} alt="preview" className={styles.preview} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="submit"
            className={styles.primary}
            disabled={suburbOk === false}
          >
            Submit donation
          </button>
          <Link href="/donor" className={styles.secondary}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}