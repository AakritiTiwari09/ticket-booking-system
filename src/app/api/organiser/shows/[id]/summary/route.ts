import { NextRequest } from "next/server";
import { Role, BookingStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth([Role.ORGANISER]);

    const show = await prisma.show.findUnique({
      where: { id: params.id },
      include: {
        event: true,
        categoryPrices: { include: { category: true } },
        bookings: {
          where: { status: BookingStatus.CONFIRMED },
          include: {
            user: { select: { name: true, email: true } },
            seats: { include: { showSeat: { include: { seat: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
        showSeats: true,
      },
    });

    if (!show || show.event.organiserId !== session.userId) {
      return jsonError("Show not found", 404);
    }

    const confirmedBookings = show.bookings.filter((b) => b.status === "CONFIRMED");
    const totalRevenue = confirmedBookings.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0
    );

    const seatStats = {
      total: show.showSeats.length,
      booked: show.showSeats.filter((s) => s.status === "BOOKED").length,
      held: show.showSeats.filter((s) => s.status === "HELD").length,
      available: show.showSeats.filter((s) => s.status === "AVAILABLE").length,
    };

    return jsonOk({
      show: {
        id: show.id,
        startTime: show.startTime,
        event: show.event,
        categoryPrices: show.categoryPrices,
      },
      summary: {
        bookingCount: confirmedBookings.length,
        totalRevenue,
        seatStats,
      },
      bookings: confirmedBookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        customer: b.user,
        seats: b.seats.map((s) => s.showSeat.seat.label),
        totalAmount: Number(b.totalAmount),
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
