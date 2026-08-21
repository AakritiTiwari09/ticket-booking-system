import { NextRequest } from "next/server";
import { getOfferByToken } from "@/lib/waitlist";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const offer = await getOfferByToken(params.token);
    if (!offer) return jsonError("Offer not found", 404);
    return jsonOk({ offer });
  } catch (error) {
    return handleApiError(error);
  }
}
