import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAuth([Role.ORGANISER, Role.ADMIN]);
    const venues = await prisma.venue.findMany({
      include: { _count: { select: { seats: true } } },
      orderBy: { name: "asc" },
    });
    return jsonOk({ venues });
  } catch (error) {
    return handleApiError(error);
  }
}
