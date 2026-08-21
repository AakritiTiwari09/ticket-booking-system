import { Resend } from "resend";
import { generateQrBuffer } from "./qr";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromEmail() {
  return process.env.EMAIL_FROM || "TicketBook <onboarding@resend.dev>";
}

function getAppUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

export async function sendBookingConfirmationEmail(params: {
  to: string;
  name: string;
  reference: string;
  eventTitle: string;
  showTime: Date;
  seats: string[];
  totalAmount: number;
}) {
  const resend = getResend();
  if (!resend) {
    console.log("[Email skipped - no RESEND_API_KEY]", params.reference);
    return;
  }

  const qrBuffer = await generateQrBuffer(params.reference);
  const showTimeStr = params.showTime.toLocaleString();

  await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: `Your ticket — ${params.eventTitle}`,
    html: `
      <h2>Booking Confirmed!</h2>
      <p>Hi ${params.name},</p>
      <p>Your booking <strong>${params.reference}</strong> is confirmed.</p>
      <p><strong>Event:</strong> ${params.eventTitle}</p>
      <p><strong>Time:</strong> ${showTimeStr}</p>
      <p><strong>Seats:</strong> ${params.seats.join(", ")}</p>
      <p><strong>Total:</strong> $${params.totalAmount.toFixed(2)}</p>
      <p>Present the QR code attached at the venue.</p>
    `,
    attachments: [
      {
        filename: `ticket-${params.reference}.png`,
        content: qrBuffer,
      },
    ],
  });
}

export async function sendWaitlistOfferEmail(params: {
  to: string;
  name: string;
  eventTitle: string;
  categoryName: string;
  token: string;
  expiresAt: Date;
}) {
  const resend = getResend();
  const offerUrl = `${getAppUrl()}/offer/${params.token}`;
  const expiresStr = params.expiresAt.toLocaleString();

  if (!resend) {
    console.log("[Email skipped - no RESEND_API_KEY] Waitlist offer:", offerUrl);
    return;
  }

  await resend.emails.send({
    from: getFromEmail(),
    to: params.to,
    subject: `Seat available — ${params.eventTitle}`,
    html: `
      <h2>A seat is available!</h2>
      <p>Hi ${params.name},</p>
      <p>A <strong>${params.categoryName}</strong> seat has opened up for <strong>${params.eventTitle}</strong>.</p>
      <p><a href="${offerUrl}">Complete your booking here</a></p>
      <p>This offer expires at <strong>${expiresStr}</strong>.</p>
    `,
  });
}
