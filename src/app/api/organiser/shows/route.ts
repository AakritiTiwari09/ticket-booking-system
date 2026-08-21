import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

const createSchema = z.object({
  eventId: z.string(),
  startTime: z.string().datetime(),
  prices: z.array(
    z.object({
      categoryId: z.string(),
      price: z.number().positive(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth([Role.ORGANISER]);
    const body = createSchema.parse(await request.json());

    const event = await prisma.event.findFirst({
      where: { id: body.eventId, organiserId: session.userId },
      include: { venue: { include: { seats: true } } },
    });
    if (!event) throw new Error("Event not found");

    const show = await prisma.$transaction(async (tx) => {
      const created = await tx.show.create({
        data: {
          eventId: body.eventId,
          startTime: new Date(body.startTime),
          categoryPrices: {
            create: body.prices.map((p) => ({
              categoryId: p.categoryId,
              price: p.price,
            })),
          },
        },
        include: {
          categoryPrices: { include: { category: true } },
        },
      });

      await tx.showSeat.createMany({
        data: event.venue.seats.map((seat) => ({
          showId: created.id,
          seatId: seat.id,
          status: "AVAILABLE" as const,
        })),
      });

      return created;
    });

    return jsonOk({ show }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
