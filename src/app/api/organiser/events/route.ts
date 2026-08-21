import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireAuth([Role.ORGANISER]);
    const events = await prisma.event.findMany({
      where: { organiserId: session.userId },
      include: {
        venue: true,
        shows: { orderBy: { startTime: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ events });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["MOVIE", "CONCERT"]),
  description: z.string().optional(),
  venueId: z.string(),
  imageUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth([Role.ORGANISER]);
    const body = createSchema.parse(await request.json());
    const event = await prisma.event.create({
      data: {
        ...body,
        organiserId: session.userId,
      },
      include: { venue: true },
    });
    return jsonOk({ event }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
