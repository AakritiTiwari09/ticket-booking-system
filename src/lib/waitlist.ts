import { OfferStatus, SeatStatus, WaitlistStatus } from "@prisma/client";
import { prisma } from "./db";
import { WAITLIST_OFFER_TTL_MINUTES } from "./constants";
import { sendWaitlistOfferEmail } from "./email";

export async function joinWaitlist(showId: string, categoryId: string, userId: string) {
  const soldOut = await isCategorySoldOut(showId, categoryId);
  if (!soldOut) {
    throw new Error("CONFLICT:Category is not sold out — book seats directly");
  }

  const existing = await prisma.waitlistEntry.findUnique({
    where: { userId_showId_categoryId: { userId, showId, categoryId } },
  });
  if (existing && existing.status !== WaitlistStatus.EXPIRED) {
    throw new Error("CONFLICT:Already on waitlist for this category");
  }

  const maxPosition = await prisma.waitlistEntry.aggregate({
    where: { showId, categoryId, status: WaitlistStatus.WAITING },
    _max: { position: true },
  });

  const position = (maxPosition._max.position ?? 0) + 1;

  if (existing?.status === WaitlistStatus.EXPIRED) {
    return prisma.waitlistEntry.update({
      where: { id: existing.id },
      data: { status: WaitlistStatus.WAITING, position, createdAt: new Date() },
    });
  }

  return prisma.waitlistEntry.create({
    data: { userId, showId, categoryId, position, status: WaitlistStatus.WAITING },
  });
}

export async function isCategorySoldOut(showId: string, categoryId: string) {
  const seats = await prisma.showSeat.findMany({
    where: { showId, seat: { categoryId } },
  });
  if (seats.length === 0) return false;
  return seats.every((s) => s.status === SeatStatus.BOOKED);
}

export async function getSoldOutCategories(showId: string) {
  const showSeats = await prisma.showSeat.findMany({
    where: { showId },
    include: { seat: { include: { category: true } } },
  });

  const byCategory = new Map<string, { total: number; booked: number; name: string }>();
  for (const ss of showSeats) {
    const catId = ss.seat.categoryId;
    const entry = byCategory.get(catId) || {
      total: 0,
      booked: 0,
      name: ss.seat.category.name,
    };
    entry.total++;
    if (ss.status === SeatStatus.BOOKED) entry.booked++;
    byCategory.set(catId, entry);
  }

  return Array.from(byCategory.entries())
    .filter(([, v]) => v.total > 0 && v.booked === v.total)
    .map(([categoryId, v]) => ({ categoryId, categoryName: v.name }));
}

export async function offerSeatToWaitlist(
  showId: string,
  categoryId: string,
  showSeatId: string
) {
  const entry = await prisma.waitlistEntry.findFirst({
    where: { showId, categoryId, status: WaitlistStatus.WAITING },
    orderBy: { position: "asc" },
    include: {
      user: true,
      show: { include: { event: true } },
      category: true,
    },
  });

  if (!entry) return null;

  const expiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_MINUTES * 60 * 1000);

  const offer = await prisma.$transaction(async (tx) => {
    await tx.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: WaitlistStatus.OFFERED },
    });

    await tx.showSeat.update({
      where: { id: showSeatId },
      data: {
        status: SeatStatus.HELD,
        heldByUserId: entry.userId,
        heldUntil: expiresAt,
      },
    });

    return tx.waitlistOffer.create({
      data: {
        waitlistEntryId: entry.id,
        showSeatId,
        expiresAt,
        status: OfferStatus.PENDING,
      },
    });
  });

  await sendWaitlistOfferEmail({
    to: entry.user.email,
    name: entry.user.name,
    eventTitle: entry.show.event.title,
    categoryName: entry.category.name,
    token: offer.token,
    expiresAt,
  });

  return offer;
}

export async function processReleasedSeats(
  releasedSeats: { showSeatId: string; categoryId: string; showId: string }[]
) {
  for (const seat of releasedSeats) {
    await offerSeatToWaitlist(seat.showId, seat.categoryId, seat.showSeatId);
  }
}

export async function expireOffers() {
  const now = new Date();
  const expiredOffers = await prisma.waitlistOffer.findMany({
    where: { status: OfferStatus.PENDING, expiresAt: { lt: now } },
    include: {
      waitlistEntry: true,
      showSeat: { include: { seat: true } },
    },
  });

  for (const offer of expiredOffers) {
    await expireSingleOffer(offer.id);
  }

  return expiredOffers.length;
}

async function expireSingleOffer(offerId: string) {
  const offer = await prisma.waitlistOffer.findUnique({
    where: { id: offerId },
    include: {
      waitlistEntry: true,
      showSeat: { include: { seat: true } },
    },
  });

  if (!offer || offer.status !== OfferStatus.PENDING) return;

  const { showId } = offer.waitlistEntry;
  const { categoryId } = offer.waitlistEntry;
  const showSeatId = offer.showSeatId;

  await prisma.$transaction(async (tx) => {
    await tx.waitlistOffer.update({
      where: { id: offerId },
      data: { status: OfferStatus.EXPIRED },
    });
    await tx.waitlistEntry.update({
      where: { id: offer.waitlistEntryId },
      data: { status: WaitlistStatus.EXPIRED },
    });
    await tx.showSeat.update({
      where: { id: showSeatId },
      data: {
        status: SeatStatus.AVAILABLE,
        heldByUserId: null,
        heldUntil: null,
      },
    });
  });

  await offerSeatToWaitlist(showId, categoryId, showSeatId);
}

export async function confirmWaitlistOffer(token: string, userId: string) {
  const offer = await prisma.waitlistOffer.findUnique({
    where: { token },
    include: {
      waitlistEntry: {
        include: {
          show: { include: { event: true, categoryPrices: true } },
          category: true,
          user: true,
        },
      },
      showSeat: { include: { seat: { include: { category: true } } } },
    },
  });

  if (!offer) throw new Error("Offer not found");
  if (offer.waitlistEntry.userId !== userId) throw new Error("FORBIDDEN");
  if (offer.status !== OfferStatus.PENDING) throw new Error("Offer is no longer valid");
  if (offer.expiresAt < new Date()) {
    await expireSingleOffer(offer.id);
    throw new Error("CONFLICT:Offer has expired");
  }

  const price = offer.waitlistEntry.show.categoryPrices.find(
    (p) => p.categoryId === offer.waitlistEntry.categoryId
  );
  if (!price) throw new Error("Price not configured");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ShowSeat" WHERE id = ${offer.showSeatId} FOR UPDATE`;

    const showSeat = await tx.showSeat.findUnique({ where: { id: offer.showSeatId } });
    if (!showSeat || showSeat.status !== SeatStatus.HELD || showSeat.heldByUserId !== userId) {
      throw new Error("CONFLICT:Seat is no longer available for this offer");
    }

    const booking = await tx.booking.create({
      data: {
        userId,
        showId: offer.waitlistEntry.showId,
        totalAmount: price.price,
        status: "CONFIRMED",
      },
    });

    await tx.showSeat.update({
      where: { id: offer.showSeatId },
      data: {
        status: SeatStatus.BOOKED,
        bookingId: booking.id,
        heldByUserId: null,
        heldUntil: null,
      },
    });

    await tx.bookingSeat.create({
      data: { bookingId: booking.id, showSeatId: offer.showSeatId },
    });

    await tx.waitlistOffer.update({
      where: { id: offer.id },
      data: { status: OfferStatus.ACCEPTED },
    });

    await tx.waitlistEntry.update({
      where: { id: offer.waitlistEntryId },
      data: { status: WaitlistStatus.FULFILLED },
    });

    return {
      booking,
      eventTitle: offer.waitlistEntry.show.event.title,
      showTime: offer.waitlistEntry.show.startTime,
      seats: [offer.showSeat.seat.label],
      totalAmount: Number(price.price),
      customerName: offer.waitlistEntry.user.name,
    };
  });
}

export async function getOfferByToken(token: string) {
  const offer = await prisma.waitlistOffer.findUnique({
    where: { token },
    include: {
      waitlistEntry: {
        include: {
          show: { include: { event: true, categoryPrices: true } },
          category: true,
          user: true,
        },
      },
      showSeat: { include: { seat: { include: { category: true } } } },
    },
  });

  if (!offer) return null;

  const price = offer.waitlistEntry.show.categoryPrices.find(
    (p) => p.categoryId === offer.waitlistEntry.categoryId
  );

  return {
    token: offer.token,
    status: offer.status,
    expiresAt: offer.expiresAt,
    expired: offer.expiresAt < new Date() || offer.status !== OfferStatus.PENDING,
    eventTitle: offer.waitlistEntry.show.event.title,
    showTime: offer.waitlistEntry.show.startTime,
    categoryName: offer.waitlistEntry.category.name,
    seatLabel: offer.showSeat.seat.label,
    price: price ? Number(price.price) : 0,
    userId: offer.waitlistEntry.userId,
  };
}
