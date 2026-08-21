"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Seat {
  row: number;
  col: number;
  categoryId: string;
  label: string;
}

interface Venue {
  id: string;
  name: string;
  rows: number;
  cols: number;
  seats: { row: number; col: number; categoryId: string; label: string; category: Category }[];
}

export default function VenueEditorPage() {
  const params = useParams();
  const venueId = params.id as string;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [grid, setGrid] = useState<(string | null)[][]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const initGrid = useCallback((v: Venue, cats: Category[]) => {
    const g: (string | null)[][] = Array.from({ length: v.rows }, () =>
      Array(v.cols).fill(null)
    );
    for (const seat of v.seats) {
      g[seat.row][seat.col] = seat.categoryId;
    }
    setGrid(g);
    if (cats.length > 0) setSelectedCategory(cats[0].id);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/venues/${venueId}`).then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([venueData, catData]) => {
      if (venueData.venue) {
        setVenue(venueData.venue);
        const cats = catData.categories || [];
        setCategories(cats);
        initGrid(venueData.venue, cats);
      }
    });
  }, [venueId, initGrid]);

  function toggleCell(row: number, col: number) {
    if (!selectedCategory) return;
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = next[row][col] === selectedCategory ? null : selectedCategory;
      return next;
    });
  }

  function fillAll(categoryId: string) {
    setGrid((prev) => prev.map((row) => row.map(() => categoryId)));
  }

  async function saveLayout() {
    if (!venue) return;
    setSaving(true);
    setMessage("");

    const seats: Seat[] = [];
    grid.forEach((row, ri) => {
      row.forEach((catId, ci) => {
        if (catId) {
          const rowLabel = String.fromCharCode(65 + ri);
          seats.push({
            row: ri,
            col: ci,
            categoryId: catId,
            label: `${rowLabel}-${ci + 1}`,
          });
        }
      });
    });

    const res = await fetch(`/api/admin/venues/${venueId}/seats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seats }),
    });

    if (res.ok) {
      setMessage(`Saved ${seats.length} seats.`);
    } else {
      const data = await res.json();
      setMessage(data.error || "Save failed");
    }
    setSaving(false);
  }

  if (!venue) return <div className="p-8">Loading venue...</div>;

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{venue.name} — Seat Layout</h1>
      <p className="text-gray-500 mb-6">
        Click cells to assign categories. Empty cells have no seat.
      </p>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <label className="text-sm font-medium">Brush category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => fillAll(c.id)}
            className="text-xs px-2 py-1 rounded border"
            style={{ borderColor: c.color, color: c.color }}
          >
            Fill all {c.name}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto mb-6">
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `repeat(${venue.cols}, 2.5rem)` }}
        >
          {grid.flatMap((row, ri) =>
            row.map((catId, ci) => (
              <button
                key={`${ri}-${ci}`}
                type="button"
                onClick={() => toggleCell(ri, ci)}
                className="w-10 h-10 rounded text-xs border"
                style={{
                  backgroundColor: catId ? catMap[catId]?.color : "#f3f4f6",
                  color: catId ? "#fff" : "#9ca3af",
                }}
              >
                {catId ? String.fromCharCode(65 + ri) + (ci + 1) : "·"}
              </button>
            ))
          )}
        </div>
      </div>

      <button
        onClick={saveLayout}
        disabled={saving}
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Layout"}
      </button>
      {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
    </div>
  );
}
