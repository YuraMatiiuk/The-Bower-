"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function DriverPage() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Assume truck capacity is 100 (for example)
  const maxTruckCapacity = 100;
  const [currentCapacity, setCurrentCapacity] = useState(0);

  useEffect(() => {
    fetchPickups();
  }, []);

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/driver/pickups");
      setPickups(res.data);
      setCurrentCapacity(calculateCurrentCapacity(res.data));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const calculateCurrentCapacity = (pickups: any[]) => {
    return pickups.reduce((total, pickup) => total + pickup.item_weight, 0);
  };

  const handleAction = async (itemId: number, action: "approved" | "rejected", notes: string) => {
    try {
      const res = await axios.post("/api/driver/update", { itemId, action, notes });
      setMessage(res.data.message);
      fetchPickups(); // refresh list
    } catch (err) {
      console.error(err);
      setMessage("Error updating pickup");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Truck Driver Dashboard</h1>

      {message && <p className="mb-4 text-blue-600">{message}</p>}

      {loading ? (
        <p>Loading pickups...</p>
      ) : pickups.length === 0 ? (
        <p>No pickups scheduled for today!</p>
      ) : (
        <>
          <p>Truck capacity: {currentCapacity} / {maxTruckCapacity}</p>
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Item</th>
                <th className="border p-2">Donor</th>
                <th className="border p-2">Address</th>
                <th className="border p-2">Notes</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {pickups.map((pickup) => (
                <tr key={pickup.id}>
                  <td className="border p-2">{pickup.item_name}</td>
                  <td className="border p-2">{pickup.donor_name}</td>
                  <td className="border p-2">{pickup.donor_address}</td>
                  <td className="border p-2">📞 {pickup.donor_phone || "No phone"}</td>
                  <td className="border p-2">
                    <textarea
                      value={pickup.notes}
                      onChange={(e) => pickup.notes = e.target.value}
                      className="border p-1"
                    />
                  </td>
                  <td className="border p-2 space-x-2">
                    <button
                      onClick={() => handleAction(pickup.id, "approved", pickup.notes)}
                      className="bg-green-600 text-white px-3 py-1 rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(pickup.id, "rejected", pickup.notes)}
                      className="bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
