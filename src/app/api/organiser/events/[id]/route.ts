import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth([Role.ORGANISER]);
    const event = await prisma.event.findFirst({
      where: { id: params.id, organiserId: session.userId },
      include: {
        venue: true,
        shows: {
          include: {
            categoryPrices: { include: { category: true } },
            _count: { select: { bookings: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
    });
    if (!event) return jsonError("Event not found", 404);
    return jsonOk({ event });
  } catch (error) {
    return handleApiError(error);
  }
}
