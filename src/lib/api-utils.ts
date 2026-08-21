import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(error.errors.map((e) => e.message).join(", "), 400);
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return jsonError("Unauthorized", 401);
    if (error.message === "FORBIDDEN") return jsonError("Forbidden", 403);
    if (error.message.startsWith("CONFLICT:")) {
      return jsonError(error.message.replace("CONFLICT:", ""), 409);
    }
    console.error(error);
    return jsonError(error.message, 500);
  }
  console.error(error);
  return jsonError("Internal server error", 500);
}
