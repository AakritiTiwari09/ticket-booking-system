"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SeatMap, SeatData } from "@/components/SeatMap";

const SEAT_HOLD_TTL_MINUTES = 10;

interface ShowData {
  id: string;
  startTime: string;
  event: { title: string; type: string };
  venue: { rows: number; cols: number; name: string };
  categoryPrices: {
    categoryId: string;
    categoryName: string;
    color: string;
    price: number;
  }[];
}

interface SoldOutCategory {
  categoryId: string;
  categoryName: string;
}

export default function ShowBookingPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params.showId as string;

  const [show, setShow] = useState<ShowData | null>(null);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [soldOutCategories, setSoldOutCategories] = useState<SoldOutCategory[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [heldUntil, setHeldUntil] = useState<Date | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<{ reference: string; totalAmount: number } | null>(null);
  const [countdown, setCountdown] = useState("");

  const fetchSeats = useCallback(async () => {
    const res = await fetch(`/api/shows/${showId}/seats`);
    const data = await res.json();
    if (data.show) {
      setShow(data.show);
      setSeats(data.seats || []);
      setSoldOutCategories(data.soldOutCategories || []);
    }
  }, [showId]);

  useEffect(() => {
    fetchSeats();
    const interval = setInterval(fetchSeats, 3000);
    return () => clearInterval(interval);
  }, [fetchSeats]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setLoggedIn(!!d.user);
        if (d.user?.name) setCustomerName(d.user.name);
      });
  }, []);

  useEffect(() => {
    if (!heldUntil) return;
    const timer = setInterval(() => {
      const diff = heldUntil.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Expired");
        setHeldUntil(null);
        setSelectedSeatIds([]);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [heldUntil]);

  function toggleSeat(seatId: string) {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  }

  async function holdSeats() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    if (selectedSeatIds.length === 0) return;
    setError("");

    const res = await fetch(`/api/shows/${showId}/hold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIds: selectedSeatIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to hold seats");
      await fetchSeats();
      return;
    }
    setHeldUntil(new Date(data.expiresAt));
    await fetchSeats();
  }

  async function confirmBooking() {
    setError("");
    const res = await fetch(`/api/shows/${showId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatIds: selectedSeatIds, customerName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Booking failed");
      return;
    }
    setBooking(data.booking);
    setHeldUntil(null);
    setSelectedSeatIds([]);
  }

  async function joinWaitlist(categoryId: string) {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showId, categoryId }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("Joined waitlist! You'll receive an email if a seat opens up.");
    } else {
      setError(data.error || "Failed to join waitlist");
    }
  }

  const totalPrice = selectedSeatIds.reduce((sum, seatId) => {
    const seat = seats.find((s) => s.seatId === seatId);
    if (!seat) return sum;
    const price = show?.categoryPrices.find((p) => p.categoryId === seat.categoryId);
    return sum + (price?.price || 0);
  }, 0);

  if (!show) return <div className="p-8">Loading show...</div>;

  if (booking) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-green-700 mb-4">Booking Confirmed!</h1>
        <p className="mb-2">Reference: <strong className="font-mono">{booking.reference}</strong></p>
        <p className="text-gray-600 mb-4">Total: ${booking.totalAmount.toFixed(2)}</p>
        <p className="text-sm text-gray-500 mb-6">
          A confirmation email with your QR code ticket has been sent.
        </p>
        <button
          onClick={() => router.push("/bookings")}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg"
        >
          View My Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{show.event.title}</h1>
      <p className="text-gray-500 mb-1">
        {show.event.type} · {show.venue.name}
      </p>
      <p className="text-gray-500 mb-6">{new Date(show.startTime).toLocaleString()}</p>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white border rounded-xl p-6 mb-6">
        <SeatMap
          rows={show.venue.rows}
          cols={show.venue.cols}
          seats={seats}
          selectedSeatIds={selectedSeatIds}
          onToggleSeat={toggleSeat}
        />
      </div>

      {soldOutCategories.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="font-medium mb-2">Sold out categories — join waitlist:</p>
          <div className="flex gap-2 flex-wrap">
            {soldOutCategories.map((cat) => (
              <button
                key={cat.categoryId}
                onClick={() => joinWaitlist(cat.categoryId)}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
              >
                Waitlist — {cat.categoryName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <p>
            Selected: <strong>{selectedSeatIds.length}</strong> seat(s)
            {totalPrice > 0 && <> · ${totalPrice.toFixed(2)}</>}
          </p>
          {heldUntil && (
            <p className="text-sm text-orange-600">
              Hold expires in: <strong>{countdown}</strong>
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={holdSeats}
            disabled={selectedSeatIds.length === 0}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 disabled:opacity-50"
          >
            Hold Seats ({SEAT_HOLD_TTL_MINUTES} min)
          </button>

          {heldUntil && (
            <>
              <input
                type="text"
                placeholder="Your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="border rounded-lg px-3 py-2 flex-1 min-w-[150px]"
              />
              <button
                onClick={confirmBooking}
                disabled={!customerName}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Confirm Booking
              </button>
            </>
          )}
        </div>

        {!loggedIn && (
          <p className="text-sm text-gray-500">
            <a href="/login" className="text-indigo-600 hover:underline">Sign in</a> to hold and book seats.
          </p>
        )}
      </div>
    </div>
  );
}
