"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

type BookingRow = {
  booking_id: number;
  item_id: number;
  date: string;
  time_slot: string | null;
  booking_status: string;

  item_name: string;
  item_category: string;
  item_condition?: string | null;
  image_url?: string | null;
  item_status: string;

  donor_name?: string | null;
  donor_email?: string | null;
  donor_address?: string | null;
  donor_postcode?: string | null;
};

export default function CollectionsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setMsg("");
      setLoading(true);
      try {
        const res = await axios.get("/api/collections", { validateStatus: () => true });
        if (res.status === 200) {
          // IMPORTANT: expect { ok, bookings }
          const list: BookingRow[] = res.data?.bookings ?? [];
          setBookings(list);
        } else if (res.status === 401) {
          setMsg("Please log in to view your collections.");
        } else {
          setMsg(res.data?.error || "Failed to load.");
        }
      } catch {
        setMsg("Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Booked Collections</h1>
        <div className="flex gap-2">
          <Link href="/donor" className="px-3 py-2 rounded border">Back to dashboard</Link>
          <Link href="/collections/book" className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
            Book more
          </Link>
        </div>
      </div>

      {msg && <div className="p-2 rounded border bg-yellow-50 text-sm">{msg}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : bookings.length === 0 ? (
        <p>No booked collections yet. <Link href="/collections/book" className="text-blue-700 underline">Book one</Link>.</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.booking_id} className="border rounded p-3 flex items-start gap-3">
              {b.image_url ? (
                <img src={b.image_url} alt={b.item_name} className="w-20 h-20 object-cover rounded border" />
              ) : (
                <div className="w-20 h-20 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  No image
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{b.item_name}</div>
                  <span className="text-xs px-2 py-1 rounded border bg-gray-50">
                    {b.booking_status || "pending"}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {b.item_category}{b.item_condition ? ` • ${b.item_condition}` : ""}
                </div>
                <div className="text-sm text-gray-800 mt-1">
                  {fmtDate(b.date)}{b.time_slot ? ` • ${b.time_slot}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}