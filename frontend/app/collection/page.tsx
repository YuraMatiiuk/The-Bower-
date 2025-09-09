"use client";
<a href="/donor" className="inline-block mb-4 text-blue-700 hover:underline">← Back to Dashboard</a>
import { useState, useEffect } from "react";
import axios from "axios";


export default function CollectionsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchApprovedItems();
  }, []);

  const fetchApprovedItems = async () => {
    try {
      const res = await axios.get("/api/collections");
      setItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/collections", {
        itemId: selectedItem,
        collectionDate: date,
        timeSlot,
      });
      setMessage(res.data.message);
      setSelectedItem("");
      setDate("");
      setTimeSlot("");
      fetchApprovedItems();
    } catch (err: any) {
      console.error(err);
      setMessage("Error booking collection");
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Book a Collection</h1>

      {message && <p className="mb-4 text-blue-600">{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Select Approved Item</label>
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">-- Select Item --</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.category}, {item.condition})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Collection Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Preferred Time Slot</label>
          <select
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">-- Select Time Slot --</option>
            <option value="9am-12pm">9am – 12pm</option>
            <option value="12pm-3pm">12pm – 3pm</option>
            <option value="3pm-5pm">3pm – 5pm</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Book Collection
        </button>
      </form>
    </div>
  );
}
