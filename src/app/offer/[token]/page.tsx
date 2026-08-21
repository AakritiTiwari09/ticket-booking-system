"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Offer {
  token: string;
  status: string;
  expiresAt: string;
  expired: boolean;
  eventTitle: string;
  showTime: string;
  categoryName: string;
  seatLabel: string;
  price: number;
}

export default function OfferPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [countdown, setCountdown] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reference, setReference] = useState("");

  useEffect(() => {
    fetch(`/api/offer/${token}`)
      .then((r) => r.json())
      .then((d) => setOffer(d.offer));
  }, [token]);

  useEffect(() => {
    if (!offer) return;
    const timer = setInterval(() => {
      const diff = new Date(offer.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("Expired");
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [offer]);

  async function confirmOffer() {
    setError("");
    const res = await fetch(`/api/offer/${token}/confirm`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to confirm");
      return;
    }
    setConfirmed(true);
    setReference(data.booking.reference);
  }

  if (!offer) return <div className="p-8">Loading offer...</div>;

  if (confirmed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-green-700 mb-4">Booking Confirmed!</h1>
        <p>Reference: <strong className="font-mono">{reference}</strong></p>
        <button
          onClick={() => router.push("/bookings")}
          className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-lg"
        >
          View My Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Waitlist Offer</h1>
      <p className="text-gray-500 mb-6">
        A seat has opened up — complete your booking before the offer expires.
      </p>

      {offer.expired ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-700 font-medium">This offer has expired.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <p><strong>{offer.eventTitle}</strong></p>
          <p className="text-sm text-gray-500">{new Date(offer.showTime).toLocaleString()}</p>
          <p>Category: {offer.categoryName}</p>
          <p>Seat: <strong>{offer.seatLabel}</strong></p>
          <p>Price: <strong>${offer.price.toFixed(2)}</strong></p>
          <p className="text-orange-600">
            Expires in: <strong>{countdown}</strong>
          </p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            onClick={confirmOffer}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
          >
            Confirm Booking
          </button>
        </div>
      )}
    </div>
  );
}
