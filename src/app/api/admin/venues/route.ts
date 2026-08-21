import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAuth([Role.ADMIN]);
    const venues = await prisma.venue.findMany({
      include: {
        _count: { select: { seats: true, events: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ venues });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  rows: z.number().int().min(1).max(30),
  cols: z.number().int().min(1).max(30),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth([Role.ADMIN]);
    const body = createSchema.parse(await request.json());
    const venue = await prisma.venue.create({ data: body });
    return jsonOk({ venue }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
