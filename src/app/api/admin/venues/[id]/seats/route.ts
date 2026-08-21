import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

const seatSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
  categoryId: z.string(),
  label: z.string().min(1),
});

const layoutSchema = z.object({
  seats: z.array(seatSchema),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([Role.ADMIN]);
    const body = layoutSchema.parse(await request.json());
    const venueId = params.id;

    await prisma.$transaction(async (tx) => {
      await tx.seat.deleteMany({ where: { venueId } });
      if (body.seats.length > 0) {
        await tx.seat.createMany({
          data: body.seats.map((s) => ({ ...s, venueId })),
        });
      }
    });

    const seats = await prisma.seat.findMany({
      where: { venueId },
      include: { category: true },
      orderBy: [{ row: "asc" }, { col: "asc" }],
    });

    return jsonOk({ seats });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([Role.ADMIN]);
    const seats = await prisma.seat.findMany({
      where: { venueId: params.id },
      include: { category: true },
      orderBy: [{ row: "asc" }, { col: "asc" }],
    });
    return jsonOk({ seats });
  } catch (error) {
    return handleApiError(error);
  }
}
