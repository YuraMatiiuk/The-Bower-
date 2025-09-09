"use client";

import { useState } from "react";
import axios from "axios";

export default function ReservationsPage() {
  const [caseworkerName, setCaseworkerName] = useState("");
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchReservations = async () => {
    if (!caseworkerName) {
      setMessage("Please enter your name to view reservations.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get("/api/marketplace/reservations", {
        params: { caseworkerName },
      });
      setReservations(res.data);
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage("Error fetching reservations.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Reservations</h1>

      <div className="mb-6">
        <label className="block mb-1">Caseworker Name</label>
        <input
          type="text"
          value={caseworkerName}
          onChange={(e) => setCaseworkerName(e.target.value)}
          className="w-full border p-2 rounded mb-2"
          placeholder="Enter your name"
        />
        <button
          onClick={fetchReservations}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          View Reservations
        </button>
      </div>

      {message && <p className="mb-4 text-red-600">{message}</p>}

      {loading ? (
        <p>Loading reservations...</p>
      ) : reservations.length === 0 ? (
        <p>No reservations found.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Item</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Condition</th>
              <th className="border p-2">Agency</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Reserved At</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td className="border p-2">{r.item_name}</td>
                <td className="border p-2">{r.category}</td>
                <td className="border p-2">{r.condition}</td>
                <td className="border p-2">{r.agency || "—"}</td>
                <td className="border p-2">{r.status}</td>
                <td className="border p-2">{r.reserved_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
