import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api-utils";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonOk({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return jsonOk({ user });
}
