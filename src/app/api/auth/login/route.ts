import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { signToken, setAuthCookie, verifyPassword } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-utils";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return jsonError("Invalid email or password", 401);

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return jsonError("Invalid email or password", 401);

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
