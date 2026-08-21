"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Session {
  email: string;
  role: string;
  name?: string;
}

export function Navbar() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSession(d.user || null))
      .catch(() => setSession(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          TicketBook
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/events" className="hover:text-indigo-600">
            Events
          </Link>
          {session?.role === "CUSTOMER" && (
            <Link href="/bookings" className="hover:text-indigo-600">
              My Bookings
            </Link>
          )}
          {session?.role === "ADMIN" && (
            <Link href="/admin/venues" className="hover:text-indigo-600">
              Admin
            </Link>
          )}
          {session?.role === "ORGANISER" && (
            <Link href="/organiser/events" className="hover:text-indigo-600">
              Organiser
            </Link>
          )}
          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-500">{session.email}</span>
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className="hover:text-indigo-600">
                Login
              </Link>
              <Link
                href="/register"
                className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
