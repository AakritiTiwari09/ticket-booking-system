import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { JWT_COOKIE_NAME } from "./constants";

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

export async function getSession(): Promise<JwtPayload | null> {
  const token = cookies().get(JWT_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(roles?: Role[]): Promise<JwtPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (roles && !roles.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}

export function setAuthCookie(token: string) {
  cookies().set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie() {
  cookies().set(JWT_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function verifyCronSecret(request: Request) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    throw new Error("UNAUTHORIZED");
  }
}
