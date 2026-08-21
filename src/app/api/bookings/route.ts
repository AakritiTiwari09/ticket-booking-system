import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireAuth([Role.CUSTOMER]);
    const bookings = await prisma.booking.findMany({
      where: { userId: session.userId },
      include: {
        show: { include: { event: true } },
        seats: { include: { showSeat: { include: { seat: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({
      bookings: bookings.map((b) => ({
        id: b.id,
        reference: b.reference,
        status: b.status,
        totalAmount: Number(b.totalAmount),
        createdAt: b.createdAt,
        eventTitle: b.show.event.title,
        showTime: b.show.startTime,
        seats: b.seats.map((s) => s.showSeat.seat.label),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
