import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { cancelBooking } from "@/lib/seat-hold";
import { processReleasedSeats } from "@/lib/waitlist";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth([Role.CUSTOMER]);
    const { releasedSeats } = await cancelBooking(params.id, session.userId);
    await processReleasedSeats(releasedSeats);
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
