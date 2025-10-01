"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    suburb: "",
    postcode: "",
  });
  const [msg, setMsg] = useState("");

  const update = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await axios.post("/api/auth/signup", form);
      setMsg(res.data.message);
      router.push("/login");
    } catch (err: any) {
      setMsg(err?.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      {msg && <p className="mb-2 text-blue-600">{msg}</p>}
      <form onSubmit={submit} className="space-y-3">
        <input name="name" placeholder="Name" value={form.name} onChange={update} className="w-full border p-2 rounded" required />
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={update} className="w-full border p-2 rounded" required />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={update} className="w-full border p-2 rounded" required />
        <input name="phone" placeholder="Phone" value={form.phone} onChange={update} className="w-full border p-2 rounded" required />
        <input name="address" placeholder="Street Address" value={form.address} onChange={update} className="w-full border p-2 rounded" required />
        <input name="suburb" placeholder="Suburb" value={form.suburb} onChange={update} className="w-full border p-2 rounded" required />
        <input name="postcode" placeholder="Postcode" value={form.postcode} onChange={update} className="w-full border p-2 rounded" required />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Sign Up</button>
      </form>
      <p className="mt-4">Already have an account? <a href="/login" className="text-blue-600">Log In</a></p>
    </div>
  );
}