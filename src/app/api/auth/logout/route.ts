import { clearAuthCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/api-utils";

export async function POST() {
  clearAuthCookie();
  return jsonOk({ success: true });
}
