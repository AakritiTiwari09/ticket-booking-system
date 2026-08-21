import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { holdSeats, releaseUserHolds } from "@/lib/seat-hold";
import { jsonOk, handleApiError } from "@/lib/api-utils";

const holdSchema = z.object({
  seatIds: z.array(z.string()).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth([Role.CUSTOMER]);
    const body = holdSchema.parse(await request.json());
    const result = await holdSeats(params.id, body.seatIds, session.userId);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth([Role.CUSTOMER]);
    const body = await request.json().catch(() => ({}));
    const seatIds = body.seatIds as string[] | undefined;
    await releaseUserHolds(params.id, session.userId, seatIds);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
