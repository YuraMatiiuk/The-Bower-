"use client";

import { useState } from "react";
import axios from "axios";
<a href="/donor" className="inline-block mb-4 text-blue-700 hover:underline">← Back to Dashboard</a>

export default function DonatePage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    postcode: "",
    phone: "",
    itemName: "",
    category: "",
    description: "",
    condition: "good",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/donations", formData);
      setMessage(res.data.message);
    } catch (err) {
      console.error(err);
      setMessage("Error submitting donation");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Donate an Item</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full border p-2" type="text" name="name" placeholder="Your Name" onChange={handleChange} />
        <input className="w-full border p-2" type="email" name="email" placeholder="Your Email" onChange={handleChange} />
        <input className="w-full border p-2" type="text" name="address" placeholder="Address" onChange={handleChange} />
        <input className="w-full border p-2" type="text" name="postcode" placeholder="Postcode" onChange={handleChange} />
        <input className="w-full border p-2" type="text" name="phone" placeholder="Phone" onChange={handleChange} />
        <input className="w-full border p-2" type="text" name="itemName" placeholder="Item Name" onChange={handleChange} />
        <input className="w-full border p-2" type="text" name="category" placeholder="Category" onChange={handleChange} />
        <textarea className="w-full border p-2" name="description" placeholder="Description" onChange={handleChange}></textarea>

        <select className="w-full border p-2" name="condition" onChange={handleChange}>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>

        <button className="bg-green-600 text-white px-4 py-2 rounded" type="submit">
          Submit Donation
        </button>
      </form>

      {message && <p className="mt-4 text-blue-600">{message}</p>}
    </div>
  );
}
