import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { confirmBooking } from "@/lib/seat-hold";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

const bookSchema = z.object({
  seatIds: z.array(z.string()).min(1),
  customerName: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth([Role.CUSTOMER]);
    const body = bookSchema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    const customerName = body.customerName || user?.name || "Customer";

    const result = await confirmBooking(
      params.id,
      session.userId,
      body.seatIds,
      customerName
    );

    if (user) {
      await sendBookingConfirmationEmail({
        to: user.email,
        name: customerName,
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
