import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to TicketBook</h1>
      <p className="text-lg text-gray-600 mb-8">
        Book movie and concert tickets with real-time seat selection, waitlists, and instant QR code tickets.
      </p>
      <div className="flex gap-4 justify-center flex-wrap">
        <Link
          href="/events"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
        >
          Browse Events
        </Link>
        <Link
          href="/login"
          className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-50"
        >
          Sign In
        </Link>
      </div>
      <div className="mt-12 text-sm text-gray-500">
        <p>Demo accounts (password: password123):</p>
        <p>Admin: admin@ticketbook.com | Organiser: organiser@ticketbook.com | Customer: customer@ticketbook.com</p>
      </div>
    </div>
  );
}
