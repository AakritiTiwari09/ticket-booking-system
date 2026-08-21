"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string;
  reference: string;
  customer: { name: string; email: string };
  seats: string[];
  totalAmount: number;
  createdAt: string;
}

interface Summary {
  bookingCount: number;
  totalRevenue: number;
  seatStats: { total: number; booked: number; held: number; available: number };
}

export default function ShowSummaryPage() {
  const params = useParams();
  const showId = params.id as string;

  const [summary, setSummary] = useState<Summary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showInfo, setShowInfo] = useState<{ event: { title: string }; startTime: string } | null>(null);

  useEffect(() => {
    fetch(`/api/organiser/shows/${showId}/summary`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary);
        setBookings(d.bookings || []);
        setShowInfo(d.show);
      });
  }, [showId]);

  if (!summary || !showInfo) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/organiser/events" className="text-indigo-600 text-sm hover:underline">
        ← Back to events
      </Link>
      <h1 className="text-2xl font-bold mt-2">{showInfo.event.title}</h1>
      <p className="text-gray-500 mb-6">{new Date(showInfo.startTime).toLocaleString()}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{summary.bookingCount}</p>
          <p className="text-sm text-gray-500">Bookings</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">${summary.totalRevenue.toFixed(2)}</p>
          <p className="text-sm text-gray-500">Revenue</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{summary.seatStats.booked}</p>
          <p className="text-sm text-gray-500">Seats Booked</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{summary.seatStats.available}</p>
          <p className="text-sm text-gray-500">Available</p>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Bookings</h2>
      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white border rounded-xl">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3">Reference</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Seats</th>
                <th className="text-right p-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="p-3 font-mono text-xs">{b.reference.slice(0, 8)}…</td>
                  <td className="p-3">{b.customer.name}</td>
                  <td className="p-3">{b.seats.join(", ")}</td>
                  <td className="p-3 text-right">${b.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
