# Ticket Booking System

A full-stack ticket booking platform for movies and concerts with real-time seat selection, hold TTL, waitlist auto-assignment, and QR code email tickets.

## Live Demo

Deploy to Vercel + Neon and set the URL here after deployment:

```
https://ticket-booking-box29.vercel.app
```

## Features

- **Role-based auth**: Admin, Organiser, Customer
- **Venue management**: Grid-based seat layout with categories (Premium, Standard)
- **Event listings**: Movies and concerts with per-category pricing
- **Visual seat map**: Real-time status via 3-second polling (available / held / booked)
- **Seat holds**: Configurable TTL (default 10 min), auto-release on expiry or checkout abandonment
- **Concurrency-safe booking**: PostgreSQL row-level locking prevents double booking
- **Waitlist**: Join when sold out; auto-assigned seat on cancellation with time-limited offer
- **QR tickets**: Email with QR code encoding booking reference on confirmation

## Tech Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL (Neon) + Prisma ORM
- JWT auth (httpOnly cookies)
- Resend for email delivery
- Vercel Cron for hold/offer expiry

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech) free tier recommended)

### Setup

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Run migrations and seed demo data
npx prisma db push
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Accounts (after seed)

| Role      | Email                      | Password    |
|-----------|----------------------------|-------------|
| Admin     | admin@ticketbook.com       | password123 |
| Organiser | organiser@ticketbook.com   | password123 |
| Customer  | customer@ticketbook.com    | password123 |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `RESEND_API_KEY` | Resend API key for emails |
| `EMAIL_FROM` | Sender address (e.g. `TicketBook <onboarding@resend.dev>`) |
| `APP_URL` | Public app URL (for waitlist offer links) |
| `SEAT_HOLD_TTL_MINUTES` | Seat hold duration (default: 10) |
| `WAITLIST_OFFER_TTL_MINUTES` | Waitlist offer duration (default: 15) |
| `CRON_SECRET` | Bearer token for cron endpoints |

## Database Schema

```
User ──< Event ──< Show ──< ShowSeat >── Seat >── SeatCategory
  │                │           │
  │                │           └──< Booking >── BookingSeat
  │                │
  └──< WaitlistEntry ──< WaitlistOffer

Venue ──< Seat
```

### Key Models

- **ShowSeat**: Per-show seat status (AVAILABLE | HELD | BOOKED), hold expiry, booking link
- **WaitlistEntry**: Queue position per show + category
- **WaitlistOffer**: Time-limited seat offer with unique token

## API Reference

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (CUSTOMER or ORGANISER) |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/admin/venues` | List/create venues |
| GET/PUT/DELETE | `/api/admin/venues/[id]` | Venue CRUD |
| GET/POST | `/api/admin/venues/[id]/seats` | Seat layout |
| GET/POST | `/api/admin/categories` | Seat categories |

### Organiser

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/organiser/events` | Event CRUD |
| GET | `/api/organiser/events/[id]` | Event detail |
| POST | `/api/organiser/shows` | Create show + initialize seats |
| GET | `/api/organiser/shows/[id]/summary` | Revenue & bookings |

### Customer

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | Browse/filter shows |
| GET | `/api/shows/[id]/seats` | Seat map with statuses |
| POST | `/api/shows/[id]/hold` | Hold seats (TTL) |
| POST | `/api/shows/[id]/book` | Confirm booking |
| GET | `/api/bookings` | Booking history |
| POST | `/api/bookings/[id]/cancel` | Cancel + trigger waitlist |
| POST | `/api/waitlist` | Join waitlist |
| GET | `/api/offer/[token]` | View waitlist offer |
| POST | `/api/offer/[token]/confirm` | Accept offer |

### Cron (secured with `Authorization: Bearer CRON_SECRET`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/cron/release-holds` | Release expired seat holds |
| GET/POST | `/api/cron/process-offers` | Expire offers, cascade to next |

## Seat Hold & Waitlist Logic

### Seat Hold TTL

1. Customer selects seats → `POST /api/shows/[id]/hold`
2. Seats set to HELD with `heldUntil = now + SEAT_HOLD_TTL_MINUTES`
3. **Lazy cleanup**: Every seat map fetch releases expired holds
4. **Cron cleanup**: `/api/cron/release-holds` runs every minute on Vercel
5. Frontend polls seat map every 3 seconds

### Concurrency Protection

- All hold/book operations use PostgreSQL transactions with `SELECT ... FOR UPDATE`
- Update only succeeds if seat status is AVAILABLE (or HELD by same user)
- Failed updates return HTTP 409 Conflict

### Waitlist Flow

1. When all seats in a category are BOOKED, customer can join waitlist
2. On booking cancellation, seat offered to first WAITING entry
3. Customer receives email with link to `/offer/[token]` (expires in 15 min)
4. If offer expires, cron cascades to next waitlisted customer

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for detailed architecture.

## Deployment (Vercel + Neon)

1. Create a [Neon](https://neon.tech) PostgreSQL database
2. Push code to GitHub
3. Import project in [Vercel](https://vercel.com)
4. Set all environment variables from `.env.example`
5. Run `npx prisma db push && npm run db:seed` against production DB
6. Cron jobs are configured in `vercel.json`

## Project Structure

```
src/
├── app/
│   ├── admin/venues/       # Admin venue management
│   ├── organiser/          # Event & show management
│   ├── events/             # Browse & book
│   ├── bookings/           # Customer booking history
│   ├── offer/[token]/      # Waitlist offer checkout
│   └── api/                # REST API routes
├── components/             # SeatMap, EventCard, Navbar
└── lib/                    # Auth, seat-hold, waitlist, email, qr
prisma/
├── schema.prisma
└── seed.ts
```

## License

MIT
