"use client";

import { useEffect, useState } from "react";

interface Booking {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  eventTitle: string;
  showTime: string;
  seats: string[];
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/bookings");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setBookings(data.bookings || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
    if (res.ok) await load();
    else {
      const data = await res.json();
      alert(data.error || "Cancel failed");
    }
  }

  if (loading) return <div className="p-8">Loading bookings...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-gray-500">No bookings yet.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white border rounded-xl p-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-semibold">{b.eventTitle}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(b.showTime).toLocaleString()}
                  </p>
                  <p className="text-sm mt-1">
                    Seats: {b.seats.join(", ")}
                  </p>
                  <p className="text-sm">
                    Ref: <span className="font-mono">{b.reference}</span>
                  </p>
                  <p className="text-sm font-medium mt-1">
                    ${b.totalAmount.toFixed(2)} ·{" "}
                    <span
                      className={
                        b.status === "CONFIRMED" ? "text-green-600" : "text-gray-500"
                      }
                    >
                      {b.status}
                    </span>
                  </p>
                </div>
                {b.status === "CONFIRMED" && (
                  <img
                    src={`/api/qr/${b.reference}`}
                    alt={`QR ${b.reference}`}
                    className="w-24 h-24 border rounded"
                  />
                )}
              </div>
              {b.status === "CONFIRMED" && (
                <button
                  onClick={() => cancelBooking(b.id)}
                  className="mt-3 text-sm text-red-600 hover:underline"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
