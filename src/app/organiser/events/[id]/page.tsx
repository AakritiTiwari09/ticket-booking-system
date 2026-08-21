"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CategoryPrice {
  categoryId: string;
  category: { name: string };
  price: string;
}

interface Show {
  id: string;
  startTime: string;
  categoryPrices: CategoryPrice[];
}

interface Event {
  id: string;
  title: string;
  type: string;
  venue: { name: string };
  shows: Show[];
}

interface Category {
  id: string;
  name: string;
}

export default function OrganiserEventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [startTime, setStartTime] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  async function load() {
    const [evRes, catRes] = await Promise.all([
      fetch(`/api/organiser/events/${eventId}`),
      fetch("/api/admin/categories"),
    ]);
    const evData = await evRes.json();
    const catData = await catRes.json();
    if (evData.event) setEvent(evData.event);
    const cats = catData.categories || [];
    setCategories(cats);
    const defaultPrices: Record<string, number> = {};
    cats.forEach((c: Category) => {
      defaultPrices[c.id] = c.name === "Premium" ? 25 : 15;
    });
    setPrices(defaultPrices);
  }

  useEffect(() => {
    load();
  }, [eventId]);

  async function createShow(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/organiser/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        startTime: new Date(startTime).toISOString(),
        prices: categories.map((c) => ({
          categoryId: c.id,
          price: prices[c.id] || 10,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create show");
      return;
    }
    setStartTime("");
    await load();
  }

  if (!event) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/organiser/events" className="text-indigo-600 text-sm hover:underline">
        ← Back to events
      </Link>
      <h1 className="text-2xl font-bold mt-2">{event.title}</h1>
      <p className="text-gray-500 mb-6">{event.type} · {event.venue.name}</p>

      <form onSubmit={createShow} className="bg-white border rounded-xl p-5 mb-8 space-y-3">
        <h2 className="font-semibold">Schedule New Show</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="border rounded-lg px-3 py-2"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => (
            <div key={c.id}>
              <label className="text-sm">{c.name} price ($)</label>
              <input
                type="number"
                min={1}
                step={0.01}
                value={prices[c.id] || 10}
                onChange={(e) =>
                  setPrices((p) => ({ ...p, [c.id]: Number(e.target.value) }))
                }
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          ))}
        </div>
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">
          Create Show
        </button>
      </form>

      <h2 className="font-semibold mb-3">Scheduled Shows</h2>
      <div className="space-y-3">
        {event.shows.map((show) => (
          <div key={show.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{new Date(show.startTime).toLocaleString()}</p>
              <p className="text-sm text-gray-500">
                {show.categoryPrices.map((p) =>
                  `${p.category.name}: $${Number(p.price).toFixed(2)}`
                ).join(" · ")}
              </p>
            </div>
            <Link
              href={`/organiser/shows/${show.id}`}
              className="text-indigo-600 hover:underline text-sm"
            >
              View Summary
            </Link>
          </div>
        ))}
        {event.shows.length === 0 && (
          <p className="text-gray-500">No shows scheduled yet.</p>
        )}
      </div>
    </div>
  );
}
