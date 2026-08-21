"use client";

export interface SeatData {
  id: string;
  seatId: string;
  row: number;
  col: number;
  label: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  heldByMe?: boolean;
}

interface SeatMapProps {
  rows: number;
  cols: number;
  seats: SeatData[];
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
  disabled?: boolean;
}

function seatColor(seat: SeatData, selected: boolean) {
  if (selected) return "ring-2 ring-indigo-600 bg-indigo-500 text-white";
  if (seat.status === "BOOKED") return "bg-red-400 text-white cursor-not-allowed";
  if (seat.status === "HELD") {
    if (seat.heldByMe) return "bg-yellow-400 text-gray-900";
    return "bg-orange-300 text-gray-700 cursor-not-allowed";
  }
  return "bg-green-500 text-white hover:bg-green-600 cursor-pointer";
}

export function SeatMap({
  rows,
  cols,
  seats,
  selectedSeatIds,
  onToggleSeat,
  disabled,
}: SeatMapProps) {
  const grid: (SeatData | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );
  for (const seat of seats) {
    if (seat.row < rows && seat.col < cols) {
      grid[seat.row][seat.col] = seat;
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="text-center mb-4 text-sm text-gray-500 font-medium">
        — SCREEN / STAGE —
      </div>
      <div
        className="inline-grid gap-1.5 mx-auto"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(2rem, 1fr))` }}
      >
        {grid.flatMap((row, ri) =>
          row.map((seat, ci) => {
            if (!seat) {
              return (
                <div
                  key={`empty-${ri}-${ci}`}
                  className="w-9 h-9 rounded"
                />
              );
            }
            const selected = selectedSeatIds.includes(seat.seatId);
            const isClickable =
              !disabled &&
              (seat.status === "AVAILABLE" ||
                (seat.status === "HELD" && seat.heldByMe));

            return (
              <button
                key={seat.id}
                type="button"
                title={`${seat.label} (${seat.categoryName}) — ${seat.status}`}
                disabled={!isClickable}
                onClick={() => isClickable && onToggleSeat(seat.seatId)}
                className={`w-9 h-9 rounded text-xs font-medium transition ${seatColor(seat, selected)}`}
              >
                {seat.label.split("-")[1] || seat.label}
              </button>
            );
          })
        )}
      </div>
      <div className="flex gap-4 mt-4 text-xs flex-wrap justify-center">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-400" /> Your hold
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-300" /> Held
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-400" /> Booked
        </span>
      </div>
    </div>
  );
}
