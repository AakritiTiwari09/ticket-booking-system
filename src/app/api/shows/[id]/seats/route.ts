import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { releaseExpiredHolds } from "@/lib/seat-hold";
import { getSoldOutCategories } from "@/lib/waitlist";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await releaseExpiredHolds(params.id);

    const show = await prisma.show.findUnique({
      where: { id: params.id },
      include: {
        event: { include: { venue: true } },
        categoryPrices: { include: { category: true } },
      },
    });
    if (!show) return jsonError("Show not found", 404);

    const showSeats = await prisma.showSeat.findMany({
      where: { showId: params.id },
      include: {
        seat: { include: { category: true } },
      },
      orderBy: [{ seat: { row: "asc" } }, { seat: { col: "asc" } }],
    });

    const session = await getSessionSafe();
    const soldOutCategories = await getSoldOutCategories(params.id);

    return jsonOk({
      show: {
        id: show.id,
        startTime: show.startTime,
        event: show.event,
        venue: show.event.venue,
        categoryPrices: show.categoryPrices.map((p) => ({
          categoryId: p.categoryId,
          categoryName: p.category.name,
          color: p.category.color,
          price: Number(p.price),
        })),
      },
      seats: showSeats.map((ss) => ({
        id: ss.id,
        seatId: ss.seatId,
        row: ss.seat.row,
        col: ss.seat.col,
        label: ss.seat.label,
        categoryId: ss.seat.categoryId,
        categoryName: ss.seat.category.name,
        categoryColor: ss.seat.category.color,
        status: ss.status,
        heldByMe: session ? ss.heldByUserId === session.userId : false,
        heldUntil: ss.heldUntil,
      })),
      soldOutCategories,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function getSessionSafe() {
  try {
    return await requireAuth();
  } catch {
    return null;
  }
}
