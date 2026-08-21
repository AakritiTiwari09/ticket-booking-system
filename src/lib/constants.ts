export const SEAT_HOLD_TTL_MINUTES = parseInt(
  process.env.SEAT_HOLD_TTL_MINUTES || "10",
  10
);

export const WAITLIST_OFFER_TTL_MINUTES = parseInt(
  process.env.WAITLIST_OFFER_TTL_MINUTES || "15",
  10
);

export const JWT_COOKIE_NAME = "tbs_token";

export const CATEGORY_COLORS: Record<string, string> = {
  Premium: "#f59e0b",
  Standard: "#6366f1",
};
