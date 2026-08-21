import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  signToken,
  setAuthCookie,
  verifyPassword,
} from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["CUSTOMER", "ORGANISER"]).default("CUSTOMER"),
});

export async function POST(request: NextRequest) {
  try {
    const body = registerSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return jsonError("Email already registered", 409);

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        role: body.role as Role,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    setAuthCookie(token);

    return jsonOk({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
