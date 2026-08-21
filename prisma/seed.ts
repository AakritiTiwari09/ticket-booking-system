import { PrismaClient, Role, EventType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ticketbook.com" },
    update: {},
    create: {
      email: "admin@ticketbook.com",
      passwordHash,
      name: "Admin User",
      role: Role.ADMIN,
    },
  });

  const organiser = await prisma.user.upsert({
    where: { email: "organiser@ticketbook.com" },
    update: {},
    create: {
      email: "organiser@ticketbook.com",
      passwordHash,
      name: "Event Organiser",
      role: Role.ORGANISER,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@ticketbook.com" },
    update: {},
    create: {
      email: "customer@ticketbook.com",
      passwordHash,
      name: "John Customer",
      role: Role.CUSTOMER,
    },
  });

  const premium = await prisma.seatCategory.upsert({
    where: { name: "Premium" },
    update: { color: "#f59e0b" },
    create: { name: "Premium", color: "#f59e0b" },
  });

  const standard = await prisma.seatCategory.upsert({
    where: { name: "Standard" },
    update: { color: "#6366f1" },
    create: { name: "Standard", color: "#6366f1" },
  });

  let venue = await prisma.venue.findFirst({ where: { name: "Grand Cinema Hall" } });
  if (!venue) {
    venue = await prisma.venue.create({
      data: { name: "Grand Cinema Hall", rows: 6, cols: 8 },
    });

    const seats = [];
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        const rowLabel = String.fromCharCode(65 + row);
        const isPremium = row < 2;
        seats.push({
          venueId: venue.id,
          categoryId: isPremium ? premium.id : standard.id,
          row,
          col,
          label: `${rowLabel}-${col + 1}`,
        });
      }
    }
    await prisma.seat.createMany({ data: seats });
  }

  let concertVenue = await prisma.venue.findFirst({ where: { name: "Star Arena" } });
  if (!concertVenue) {
    concertVenue = await prisma.venue.create({
      data: { name: "Star Arena", rows: 5, cols: 10 },
    });

    const seats = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        const rowLabel = String.fromCharCode(65 + row);
        const isPremium = row < 1;
        seats.push({
          venueId: concertVenue.id,
          categoryId: isPremium ? premium.id : standard.id,
          row,
          col,
          label: `${rowLabel}-${col + 1}`,
        });
      }
    }
    await prisma.seat.createMany({ data: seats });
  }

  const movieEvent = await prisma.event.upsert({
    where: { id: "seed-movie-event" },
    update: {},
    create: {
      id: "seed-movie-event",
      organiserId: organiser.id,
      venueId: venue.id,
      title: "Interstellar — IMAX Re-release",
      type: EventType.MOVIE,
      description: "Experience Christopher Nolan's epic in IMAX.",
    },
  });

  const concertEvent = await prisma.event.upsert({
    where: { id: "seed-concert-event" },
    update: {},
    create: {
      id: "seed-concert-event",
      organiserId: organiser.id,
      venueId: concertVenue.id,
      title: "Neon Pulse Live Tour",
      type: EventType.CONCERT,
      description: "Electronic music night with Neon Pulse.",
    },
  });

  async function createShowIfMissing(
    eventId: string,
    venueId: string,
    startTime: Date,
    premiumPrice: number,
    standardPrice: number
  ) {
    const existing = await prisma.show.findFirst({
      where: { eventId, startTime },
    });
    if (existing) return existing;

    const show = await prisma.show.create({
      data: {
        eventId,
        startTime,
        categoryPrices: {
          create: [
            { categoryId: premium.id, price: premiumPrice },
            { categoryId: standard.id, price: standardPrice },
          ],
        },
      },
    });

    const venueSeats = await prisma.seat.findMany({ where: { venueId } });
    await prisma.showSeat.createMany({
      data: venueSeats.map((s) => ({
        showId: show.id,
        seatId: s.id,
        status: "AVAILABLE" as const,
      })),
    });

    return show;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(20, 0, 0, 0);

  await createShowIfMissing(movieEvent.id, venue.id, tomorrow, 25, 15);
  await createShowIfMissing(concertEvent.id, concertVenue.id, dayAfter, 80, 45);

  console.log("Seed complete:");
  console.log("  Admin:     admin@ticketbook.com / password123");
  console.log("  Organiser: organiser@ticketbook.com / password123");
  console.log("  Customer:  customer@ticketbook.com / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
