"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Venue {
  id: string;
  name: string;
  rows: number;
  cols: number;
  _count: { seats: number; events: number };
}

export default function AdminVenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [name, setName] = useState("");
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(8);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadVenues() {
    const res = await fetch("/api/admin/venues");
    if (res.status === 401 || res.status === 403) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setVenues(data.venues || []);
    setLoading(false);
  }

  useEffect(() => {
    loadVenues();
  }, []);

  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rows, cols }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create venue");
      return;
    }
    setName("");
    await loadVenues();
  }

  async function deleteVenue(id: string) {
    if (!confirm("Delete this venue?")) return;
    await fetch(`/api/admin/venues/${id}`, { method: "DELETE" });
    await loadVenues();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Venues</h1>

      <form onSubmit={createVenue} className="bg-white border rounded-xl p-5 mb-8 space-y-3">
        <h2 className="font-semibold">Create Venue</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Venue name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded-lg px-3 py-2"
            required
          />
          <input
            type="number"
            min={1}
            max={30}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
            className="border rounded-lg px-3 py-2"
            placeholder="Rows"
          />
          <input
            type="number"
            min={1}
            max={30}
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            className="border rounded-lg px-3 py-2"
            placeholder="Cols"
          />
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          Create Venue
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {venues.map((v) => (
            <div key={v.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{v.name}</h3>
                <p className="text-sm text-gray-500">
                  {v.rows}×{v.cols} grid · {v._count.seats} seats · {v._count.events} events
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/venues/${v.id}`}
                  className="text-indigo-600 hover:underline text-sm"
                >
                  Edit Layout
                </Link>
                <button
                  onClick={() => deleteVenue(v.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
