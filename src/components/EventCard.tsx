import Link from "next/link";

interface EventCardProps {
  id: string;
  title: string;
  type: string;
  venueName: string;
  startTime: string;
  minPrice: number;
  soldOut: boolean;
}

export function EventCard({
  id,
  title,
  type,
  venueName,
  startTime,
  minPrice,
  soldOut,
}: EventCardProps) {
  const date = new Date(startTime).toLocaleString();

  return (
    <Link
      href={`/events/${id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs uppercase tracking-wide text-indigo-600 font-medium">
            {type}
          </span>
          <h3 className="text-lg font-semibold mt-1">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{venueName}</p>
          <p className="text-sm text-gray-500">{date}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">From</p>
          <p className="text-lg font-bold">${minPrice.toFixed(2)}</p>
          {soldOut && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
              Sold Out
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
