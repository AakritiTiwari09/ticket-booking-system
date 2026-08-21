import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { confirmWaitlistOffer } from "@/lib/waitlist";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await requireAuth([Role.CUSTOMER]);
    const result = await confirmWaitlistOffer(params.token, session.userId);

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user) {
      await sendBookingConfirmationEmail({
        to: user.email,
        name: result.customerName,
        reference: result.booking.reference,
        eventTitle: result.eventTitle,
        showTime: result.showTime,
        seats: result.seats,
        totalAmount: result.totalAmount,
      });
    }

    return jsonOk({
      booking: {
        id: result.booking.id,
        reference: result.booking.reference,
        totalAmount: result.totalAmount,
        seats: result.seats,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
