"use client";

import { useState } from "react";
import axios from "axios";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/auth/signup", { name, email, password });
      setMessage(res.data.message);
      setName(""); setEmail(""); setPassword("");
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sign Up (Donor)</h1>
      {message && <p className="mb-4 text-blue-600">{message}</p>}
      <form onSubmit={handleSignup} className="space-y-4">
        <input type="text" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full border p-2 rounded" required/>
        <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border p-2 rounded" required/>
        <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full border p-2 rounded" required/>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Sign Up</button>
      </form>
    </div>
  );
}
