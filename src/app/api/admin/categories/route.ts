import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAuth([Role.ADMIN, Role.ORGANISER]);
    const categories = await prisma.seatCategory.findMany({ orderBy: { name: "asc" } });
    return jsonOk({ categories });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth([Role.ADMIN]);
    const body = createSchema.parse(await request.json());
    const category = await prisma.seatCategory.create({
      data: { name: body.name, color: body.color || "#6366f1" },
    });
    return jsonOk({ category }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
