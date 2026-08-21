import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { joinWaitlist } from "@/lib/waitlist";
import { jsonOk, handleApiError } from "@/lib/api-utils";

const schema = z.object({
  showId: z.string(),
  categoryId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth([Role.CUSTOMER]);
    const body = schema.parse(await request.json());
    const entry = await joinWaitlist(body.showId, body.categoryId, session.userId);
    return jsonOk({ entry }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
