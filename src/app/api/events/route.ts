import { NextRequest } from "next/server";
import { EventType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as EventType | null;
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const shows = await prisma.show.findMany({
      where: {
        ...(type ? { event: { type } } : {}),
        ...(search
          ? {
              event: {
                title: { contains: search, mode: "insensitive" },
              },
            }
          : {}),
        ...(dateFrom || dateTo
          ? {
              startTime: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      },
      include: {
        event: { include: { venue: true } },
        categoryPrices: { include: { category: true } },
        _count: { select: { showSeats: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const showIds = shows.map((s) => s.id);
    const bookedCounts = await prisma.showSeat.groupBy({
      by: ["showId"],
      where: { showId: { in: showIds }, status: "BOOKED" },
      _count: true,
    });
    const bookedMap = new Map(bookedCounts.map((b) => [b.showId, b._count]));

    const result = shows.map((show) => ({
      id: show.id,
      startTime: show.startTime,
      event: show.event,
      categoryPrices: show.categoryPrices.map((p) => ({
        category: p.category.name,
        categoryId: p.categoryId,
        price: Number(p.price),
      })),
      totalSeats: show._count.showSeats,
      bookedSeats: bookedMap.get(show.id) || 0,
      soldOut: (bookedMap.get(show.id) || 0) >= show._count.showSeats,
    }));

    return jsonOk({ shows: result });
  } catch (error) {
    return handleApiError(error);
  }
}
