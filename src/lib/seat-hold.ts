import { SeatStatus } from "@prisma/client";
import { prisma } from "./db";
import { SEAT_HOLD_TTL_MINUTES } from "./constants";

export async function releaseExpiredHolds(showId?: string) {
  const now = new Date();
  const where = {
    status: SeatStatus.HELD,
    heldUntil: { lt: now },
    ...(showId ? { showId } : {}),
  };

  const expired = await prisma.showSeat.findMany({ where, select: { id: true } });
  if (expired.length === 0) return 0;

  await prisma.showSeat.updateMany({
    where: { id: { in: expired.map((s) => s.id) } },
    data: {
      status: SeatStatus.AVAILABLE,
      heldByUserId: null,
      heldUntil: null,
    },
  });

  return expired.length;
}

export async function holdSeats(showId: string, seatIds: string[], userId: string) {
  await releaseExpiredHolds(showId);

  const expiry = new Date(Date.now() + SEAT_HOLD_TTL_MINUTES * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const results: string[] = [];

    for (const seatId of seatIds) {
      const showSeat = await tx.showSeat.findFirst({
        where: { showId, seatId },
      });

      if (!showSeat) {
        throw new Error(`CONFLICT:Seat ${seatId} not found for this show`);
      }

      await tx.$queryRaw`SELECT id FROM "ShowSeat" WHERE id = ${showSeat.id} FOR UPDATE`;

      const current = await tx.showSeat.findUnique({ where: { id: showSeat.id } });
      if (!current) continue;

      if (current.status === SeatStatus.BOOKED) {
        throw new Error(`CONFLICT:Seat ${seatId} is already booked`);
      }

      if (
        current.status === SeatStatus.HELD &&
        current.heldByUserId !== userId &&
        current.heldUntil &&
        current.heldUntil > new Date()
      ) {
        throw new Error(`CONFLICT:Seat ${seatId} is held by another customer`);
      }

      if (current.status === SeatStatus.AVAILABLE || current.heldByUserId === userId) {
        await tx.showSeat.update({
          where: { id: showSeat.id },
          data: {
            status: SeatStatus.HELD,
            heldByUserId: userId,
            heldUntil: expiry,
          },
        });
        results.push(showSeat.id);
      }
    }

    return { heldSeatIds: results, expiresAt: expiry };
  });
}

export async function releaseUserHolds(showId: string, userId: string, seatIds?: string[]) {
  await prisma.showSeat.updateMany({
    where: {
      showId,
      heldByUserId: userId,
      status: SeatStatus.HELD,
      ...(seatIds ? { seatId: { in: seatIds } } : {}),
    },
    data: {
      status: SeatStatus.AVAILABLE,
      heldByUserId: null,
      heldUntil: null,
    },
  });
}

export async function confirmBooking(
  showId: string,
  userId: string,
  seatIds: string[],
  customerName: string
) {
  await releaseExpiredHolds(showId);

  return prisma.$transaction(async (tx) => {
    const show = await tx.show.findUnique({
      where: { id: showId },
      include: {
        event: true,
        categoryPrices: true,
        showSeats: {
          where: { seatId: { in: seatIds } },
          include: { seat: { include: { category: true } } },
        },
      },
    });

    if (!show) throw new Error("Show not found");

    let totalAmount = 0;
    const showSeatRecords = [];

    for (const seatId of seatIds) {
      const showSeat = show.showSeats.find((s) => s.seatId === seatId);
      if (!showSeat) throw new Error(`CONFLICT:Seat ${seatId} not found`);

      await tx.$queryRaw`SELECT id FROM "ShowSeat" WHERE id = ${showSeat.id} FOR UPDATE`;

      const current = await tx.showSeat.findUnique({ where: { id: showSeat.id } });
      if (!current) throw new Error("Seat not found");

      if (current.status === SeatStatus.BOOKED) {
        throw new Error(`CONFLICT:Seat ${showSeat.seat.label} is already booked`);
      }

      if (
        current.status !== SeatStatus.HELD ||
        current.heldByUserId !== userId
      ) {
        throw new Error(`CONFLICT:Seat ${showSeat.seat.label} is not held by you`);
      }

      const price = show.categoryPrices.find(
        (p) => p.categoryId === showSeat.seat.categoryId
      );
      if (!price) throw new Error("Price not configured for seat category");

      totalAmount += Number(price.price);
      showSeatRecords.push(showSeat);
    }

    const booking = await tx.booking.create({
      data: {
        userId,
        showId,
        totalAmount,
        status: "CONFIRMED",
      },
    });

    for (const showSeat of showSeatRecords) {
      await tx.showSeat.update({
        where: { id: showSeat.id },
        data: {
          status: SeatStatus.BOOKED,
          bookingId: booking.id,
          heldByUserId: null,
          heldUntil: null,
        },
      });

      await tx.bookingSeat.create({
        data: {
          bookingId: booking.id,
          showSeatId: showSeat.id,
        },
      });
    }

    return {
      booking,
      eventTitle: show.event.title,
      showTime: show.startTime,
      seats: showSeatRecords.map((s) => s.seat.label),
      totalAmount,
      customerName,
    };
  });
}

export async function cancelBooking(bookingId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        seats: { include: { showSeat: { include: { seat: true } } } },
        show: { include: { event: true } },
      },
    });

    if (!booking) throw new Error("Booking not found");
    if (booking.userId !== userId) throw new Error("FORBIDDEN");
    if (booking.status === "CANCELLED") throw new Error("Booking already cancelled");

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" },
    });

    const releasedSeats: { showSeatId: string; categoryId: string; showId: string }[] = [];

    for (const bs of booking.seats) {
      await tx.showSeat.update({
        where: { id: bs.showSeatId },
        data: {
          status: SeatStatus.AVAILABLE,
          bookingId: null,
          heldByUserId: null,
          heldUntil: null,
        },
      });
      releasedSeats.push({
        showSeatId: bs.showSeatId,
        categoryId: bs.showSeat.seat.categoryId,
        showId: booking.showId,
      });
    }

    return { booking, releasedSeats };
  });
}
