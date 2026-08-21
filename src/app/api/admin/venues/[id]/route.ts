import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([Role.ADMIN]);
    const venue = await prisma.venue.findUnique({
      where: { id: params.id },
      include: {
        seats: { include: { category: true }, orderBy: [{ row: "asc" }, { col: "asc" }] },
      },
    });
    if (!venue) return jsonError("Venue not found", 404);
    return jsonOk({ venue });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  rows: z.number().int().min(1).max(30).optional(),
  cols: z.number().int().min(1).max(30).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([Role.ADMIN]);
    const body = updateSchema.parse(await request.json());
    const venue = await prisma.venue.update({
      where: { id: params.id },
      data: body,
    });
    return jsonOk({ venue });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth([Role.ADMIN]);
    await prisma.venue.delete({ where: { id: params.id } });
    return jsonOk({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
