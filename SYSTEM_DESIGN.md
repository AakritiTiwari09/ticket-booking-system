# System Design — Ticket Booking System

## Overview

This document describes the core architectural decisions for seat hold management, concurrency control, waitlist auto-assignment, and time-limited offer handling in the Ticket Booking System.

## 1. Seat Hold and TTL Mechanism

When a customer selects seats on the visual map, the system places a temporary hold rather than immediately confirming the booking. Each held seat transitions from `AVAILABLE` to `HELD` with a `heldUntil` timestamp set to the current time plus a configurable TTL (default 10 minutes via `SEAT_HOLD_TTL_MINUTES`).

The hold serves two purposes: it reserves seats during checkout so other customers cannot book them, and it automatically releases seats if the customer abandons the process. Release happens through two complementary mechanisms:

**Lazy cleanup** runs on every seat map fetch (`GET /api/shows/[id]/seats`) and before every hold attempt. A query finds all seats where `status = HELD AND heldUntil < now()` and resets them to `AVAILABLE`, clearing `heldByUserId` and `heldUntil`. This ensures the UI reflects accurate availability even without background jobs.

**Scheduled cleanup** via Vercel Cron calls `/api/cron/release-holds` every minute, secured by a `CRON_SECRET` bearer token. This global sweep catches holds that no customer is actively polling, preventing seats from staying locked indefinitely after a browser tab is closed.

The frontend polls the seat map every 3 seconds, so released seats appear available to other customers within a few seconds. A countdown timer on the checkout page shows the customer their remaining hold time.

## 2. Concurrency Prevention

High-demand events create race conditions where multiple customers attempt to hold or book the same seat simultaneously. The system prevents double booking using PostgreSQL pessimistic locking within transactions.

For a hold request, the flow is: begin transaction, execute `SELECT ... FOR UPDATE` on the target `ShowSeat` row (acquiring an exclusive row lock), verify the seat is `AVAILABLE` or already `HELD` by the requesting user, then update to `HELD` with the new expiry. If the seat is held by another active user or already booked, the transaction rolls back and the API returns HTTP 409 Conflict.

Booking confirmation follows the same pattern: lock each seat row, verify it is `HELD` by the requesting user (not expired), atomically transition to `BOOKED`, create the `Booking` and `BookingSeat` records, and commit. The unique constraint on `(showId, seatId)` in the `ShowSeat` table provides a database-level safety net against any application-level race that might slip through.

This approach was chosen over optimistic locking because seat contention is expected to be high during popular events, and the cost of a failed retry (409 response) is acceptable compared to the complexity of conflict resolution after a failed optimistic update.

## 3. Waitlist Auto-Assignment Flow

When all seats in a category are `BOOKED`, the frontend displays a "Join Waitlist" button. Joining creates a `WaitlistEntry` with an incrementing `position` per `(showId, categoryId)` pair, ordered by `createdAt`.

When a confirmed booking is cancelled, the system: marks the booking as `CANCELLED`, resets each associated `ShowSeat` to `AVAILABLE`, then calls `offerSeatToWaitlist()` for each released seat. This function finds the oldest `WAITING` entry for that show and category, creates a `WaitlistOffer` with a unique token and `expiresAt` timestamp, holds the seat for that user, and sends an email with a link to `/offer/[token]`.

The waitlisted customer visits the offer page, sees the pre-assigned seat and price, and confirms within the offer TTL (default 15 minutes). Confirmation atomically creates the booking, marks the seat as `BOOKED`, sets the offer to `ACCEPTED`, and the waitlist entry to `FULFILLED`.

## 4. Time-Limited Offer Handling

If a waitlisted customer does not complete booking within the offer window, the cron job at `/api/cron/process-offers` handles expiry. It finds all `PENDING` offers where `expiresAt < now()`, marks each offer as `EXPIRED` and the waitlist entry as `EXPIRED`, releases the held seat back to `AVAILABLE`, and recursively offers the seat to the next `WAITING` customer in queue.

This cascade continues until either a customer accepts the offer or the waitlist is exhausted. The email notification for each new offer includes the expiry time and a direct link, minimizing friction for the customer while ensuring seats do not remain blocked by unresponsive waitlist members.

Together, these four mechanisms — hold TTL with dual cleanup, transactional locking, FIFO waitlist assignment, and cascading offer expiry — ensure fair seat allocation under high concurrency while minimizing wasted inventory from abandoned checkouts or expired waitlist offers.
