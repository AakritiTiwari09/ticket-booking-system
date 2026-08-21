"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  type: string;
  venue: { name: string };
  shows: { id: string; startTime: string }[];
}

interface Venue {
  id: string;
  name: string;
  _count: { seats: number };
}

export default function OrganiserEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"MOVIE" | "CONCERT">("MOVIE");
  const [description, setDescription] = useState("");
  const [venueId, setVenueId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [evRes, venRes] = await Promise.all([
      fetch("/api/organiser/events"),
      fetch("/api/venues"),
    ]);
    if (evRes.status === 401 || evRes.status === 403) {
      window.location.href = "/login";
      return;
    }
    const evData = await evRes.json();
    const venData = await venRes.json();
    setEvents(evData.events || []);
    setVenues(venData.venues || []);
    if (venData.venues?.length) setVenueId(venData.venues[0].id);
  }

  useEffect(() => {
    load();
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/organiser/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, description, venueId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setTitle("");
    setDescription("");
    setShowForm(false);
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Events</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          {showForm ? "Cancel" : "New Event"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createEvent} className="bg-white border rounded-xl p-5 mb-8 space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            type="text"
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "MOVIE" | "CONCERT")}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="MOVIE">Movie</option>
            <option value="CONCERT">Concert</option>
          </select>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            required
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v._count.seats} seats)
              </option>
            ))}
          </select>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            rows={2}
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
            Create Event
          </button>
        </form>
      )}

      <div className="space-y-3">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white border rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-indigo-600 uppercase">{ev.type}</span>
                <h3 className="font-semibold text-lg">{ev.title}</h3>
                <p className="text-sm text-gray-500">{ev.venue.name}</p>
                <p className="text-sm text-gray-500">{ev.shows.length} show(s)</p>
              </div>
              <Link
                href={`/organiser/events/${ev.id}`}
                className="text-indigo-600 hover:underline text-sm"
              >
                Manage Shows
              </Link>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-gray-500">No events yet. Create one above.</p>
        )}
      </div>
    </div>
  );
}
