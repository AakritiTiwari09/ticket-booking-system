import { expireOffers } from "@/lib/waitlist";
import { verifyCronSecret } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    verifyCronSecret(request);
    const count = await expireOffers();
    return jsonOk({ expired: count });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  return POST(request);
}
