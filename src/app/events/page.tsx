"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/EventCard";

interface Show {
  id: string;
  startTime: string;
  event: { title: string; type: string; venue: { name: string } };
  categoryPrices: { price: number }[];
  soldOut: boolean;
}

export default function EventsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (search) params.set("search", search);

    setLoading(true);
    fetch(`/api/events?${params}`)
      .then((r) => r.json())
      .then((d) => setShows(d.shows || []))
      .finally(() => setLoading(false));
  }, [type, search]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Browse Events</h1>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 flex-1 min-w-[200px]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All types</option>
          <option value="MOVIE">Movies</option>
          <option value="CONCERT">Concerts</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading events...</p>
      ) : shows.length === 0 ? (
        <p className="text-gray-500">No events found.</p>
      ) : (
        <div className="grid gap-4">
          {shows.map((show) => (
            <EventCard
              key={show.id}
              id={show.id}
              title={show.event.title}
              type={show.event.type}
              venueName={show.event.venue.name}
              startTime={show.startTime}
              minPrice={Math.min(...show.categoryPrices.map((p) => p.price))}
              soldOut={show.soldOut}
            />
          ))}
        </div>
      )}
    </div>
  );
}
