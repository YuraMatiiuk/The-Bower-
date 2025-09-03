"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function MarketplacePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [caseworkerName, setCaseworkerName] = useState("");
  const [agency, setAgency] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/marketplace/items");
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const reserveItem = async (itemId: number) => {
    if (!caseworkerName) {
      setMessage("Caseworker name is required.");
      return;
    }

    try {
      const res = await axios.post("/api/marketplace/reserve", {
        itemId,
        caseworkerName,
        agency,
      });
      setMessage(res.data.message);
      fetchItems(); // refresh list
    } catch (err) {
      console.error(err);
      setMessage("Error reserving item");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Caseworker Marketplace</h1>

      {message && <p className="mb-4 text-blue-600">{message}</p>}

      <div className="mb-6">
        <label className="block mb-1">Caseworker Name</label>
        <input
          type="text"
          value={caseworkerName}
          onChange={(e) => setCaseworkerName(e.target.value)}
          className="w-full border p-2 rounded mb-2"
          placeholder="Enter your name"
          required
        />

        <label className="block mb-1">Agency (optional)</label>
        <input
          type="text"
          value={agency}
          onChange={(e) => setAgency(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="Enter agency name"
        />
      </div>

      {loading ? (
        <p>Loading items...</p>
      ) : items.length === 0 ? (
        <p>No approved items available right now.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Item</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Condition</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.name}</td>
                <td className="border p-2">{item.category}</td>
                <td className="border p-2">{item.condition}</td>
                <td className="border p-2">
                  <button
                    onClick={() => reserveItem(item.id)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Reserve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
