"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function AdminPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/items");
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAction = async (itemId: number, action: "approved" | "rejected") => {
    try {
      const res = await axios.post("/api/admin/items", { itemId, action });
      setMessage(res.data.message);
      fetchItems(); // refresh list
    } catch (err) {
      console.error(err);
      setMessage("Error updating item");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {message && <p className="mb-4 text-blue-600">{message}</p>}

      {loading ? (
        <p>Loading pending items...</p>
      ) : items.length === 0 ? (
        <p>No pending items 🎉</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Item</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Condition</th>
              <th className="border p-2">Donor</th>
              <th className="border p-2">Contact</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border p-2">{item.name}</td>
                <td className="border p-2">{item.category}</td>
                <td className="border p-2">{item.condition}</td>
                <td className="border p-2">
                  {item.donor_name} <br /> {item.donor_email}
                </td>
                <td className="border p-2">
                  {item.address}, {item.postcode} <br /> {item.phone}
                </td>
                <td className="border p-2 space-x-2">
                  <button
                    onClick={() => handleAction(item.id, "approved")}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "rejected")}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Reject
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
