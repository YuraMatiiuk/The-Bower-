"use client";

import React, { useEffect, useState } from "react";
import http from "../../../lib/http"; // axios instance with withCredentials
import axios from "axios"; // still okay to keep, but we’ll use http for auth’d calls

type Blackout = { id:number; date:string; time_slot?:string|null };
type Override = { id:number; date:string; time_slot:string; capacity:number };
type BookingRow = {
  booking_id: number;
  item_id: number;
  type: string;              // 'collection' | 'delivery'
  date: string;              // YYYY-MM-DD
  time_slot: string | null;  // '9-12' etc
  booking_status: string;    // pending|confirmed|completed|cancelled
  item_name: string;
  item_status: string;
  image_url?: string | null;
  donor_name: string;
  donor_email: string;
  donor_address?: string;
  donor_postcode?: string;
};

const SLOTS = ["9-12","12-3","3-5"];

export default function CollectionsAdmin(){
  const [blackouts,setBlackouts]=useState<Blackout[]>([]);
  const [overrides,setOverrides]=useState<Override[]>([]);
  const [bookings,setBookings]=useState<BookingRow[]>([]);
  const [date,setDate]=useState("");
  const [slot,setSlot]=useState<string>("");
  const [ovDate,setOvDate]=useState("");
  const [ovSlot,setOvSlot]=useState("9-12");
  const [ovCap,setOvCap]=useState<string>("");
  const [msg,setMsg]=useState<string>("");

  async function loadAll(){
    setMsg("");
    try {
      // these can be public-ish, but use axios default
      const b = await axios.get("/api/admin/collections/blackouts",{validateStatus:()=>true});
      if (b.status===200) setBlackouts(b.data.blackouts||[]);
      const o = await axios.get("/api/admin/collections/capacity",{validateStatus:()=>true});
      if (o.status===200) setOverrides(o.data.overrides||[]);

      // bookings require admin cookie — use http instance
      const r = await http.get("/api/admin/collections",{validateStatus:()=>true});
      if (r.status===200) {
        setBookings(r.data.bookings || []);
      } else if (r.status === 401) {
        setMsg("Your session expired. Please log in again.");
      } else if (r.status === 403) {
        setMsg("Forbidden: admin only.");
      } else {
        setMsg(r.data?.error || "Failed to load bookings.");
      }
    } catch {
      setMsg("Failed to load data.");
    }
  }
  useEffect(()=>{ loadAll(); },[]);

  async function addBlackout(){
    if (!date) return;
    const body:any = { date };
    if (slot) body.time_slot = slot;
    const r = await http.post("/api/admin/collections/blackouts", body, { validateStatus:()=>true });
    if (r.status===201){ setDate(""); setSlot(""); loadAll(); } else alert(r.data?.error || "Failed");
  }
  async function delBlackout(id:number){
    const r = await http.delete("/api/admin/collections/blackouts",{ params:{id}, validateStatus:()=>true });
    if (r.status===200) loadAll();
  }

  async function addOverride(){
    if (!ovDate || !ovSlot || !ovCap) return;
    const r = await http.post("/api/admin/collections/capacity", {
      date: ovDate, time_slot: ovSlot, capacity: Number(ovCap)
    }, { validateStatus:()=>true });
    if (r.status===201){ setOvDate(""); setOvSlot("9-12"); setOvCap(""); loadAll(); } else alert(r.data?.error||"Failed");
  }
  async function delOverride(id:number){
    const r = await http.delete("/api/admin/collections/capacity",{ params:{id}, validateStatus:()=>true });
    if (r.status===200) loadAll();
  }

  async function cancelBooking(id:number){
    const r = await http.post("/api/admin/collections", { action:"cancel", bookingId:id }, { validateStatus:()=>true });
    if (r.status===200) loadAll();
    else alert(r.data?.error || "Cancel failed");
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Collections Settings</h1>

      {msg && <div className="p-2 rounded border bg-yellow-50 text-sm">{msg}</div>}

      {/* Blackouts */}
      <section className="bg-white rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Blackouts (block a day or a specific slot)</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Slot (optional)</label>
            <select value={slot} onChange={(e)=>setSlot(e.target.value)} className="border rounded px-3 py-2">
              <option value="">Whole day</option>
              {SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={addBlackout} className="px-4 py-2 bg-black text-white rounded">Add blackout</button>
        </div>

        <ul className="mt-4 divide-y">
          {blackouts.map(b=>(
            <li key={b.id} className="py-2 flex items-center justify-between">
              <div>{b.date} {b.time_slot ? `• ${b.time_slot}` : "• Whole day"}</div>
              <button onClick={()=>delBlackout(b.id)} className="text-red-600">Remove</button>
            </li>
          ))}
          {blackouts.length===0 && <li className="py-2 text-gray-600">No blackouts</li>}
        </ul>
      </section>

      {/* Overrides */}
      <section className="bg-white rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Capacity overrides (per slot)</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input type="date" value={ovDate} onChange={(e)=>setOvDate(e.target.value)} className="border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Slot</label>
            <select value={ovSlot} onChange={(e)=>setOvSlot(e.target.value)} className="border rounded px-3 py-2">
              {SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Capacity</label>
            <input type="number" min={0} value={ovCap} onChange={(e)=>setOvCap(e.target.value)} className="border rounded px-3 py-2 w-32" />
          </div>
          <button onClick={addOverride} className="px-4 py-2 bg-black text-white rounded">Add override</button>
        </div>

        <ul className="mt-4 divide-y">
          {overrides.map(o=>(
            <li key={o.id} className="py-2 flex items-center justify-between">
              <div>{o.date} • {o.time_slot} • cap {o.capacity}</div>
              <button onClick={()=>delOverride(o.id)} className="text-red-600">Remove</button>
            </li>
          ))}
          {overrides.length===0 && <li className="py-2 text-gray-600">No overrides</li>}
        </ul>
      </section>

      {/* All booked collections */}
      <section className="bg-white rounded border p-4">
        <h2 className="text-lg font-medium mb-3">Booked Collections</h2>

        {bookings.length === 0 ? (
          <p className="text-gray-600">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.booking_id} className="border rounded p-3 flex gap-3">
                {b.image_url ? (
                  <img src={b.image_url} alt={b.item_name} className="w-20 h-20 object-cover rounded border" />
                ) : (
                  <div className="w-20 h-20 rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    No image
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      #{b.booking_id} • {b.item_name}
                    </div>
                    <span className="text-xs px-2 py-1 rounded border bg-gray-50">
                      {b.booking_status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    {b.date} {b.time_slot ? `• ${b.time_slot}` : ""}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {b.donor_name} — {b.donor_email}
                    {b.donor_address ? ` • ${b.donor_address} ${b.donor_postcode ?? ""}` : ""}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => cancelBooking(b.booking_id)}
                      className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}