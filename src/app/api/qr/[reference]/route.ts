import { NextRequest } from "next/server";
import { generateQrBuffer } from "@/lib/qr";

export async function GET(
  _request: NextRequest,
  { params }: { params: { reference: string } }
) {
  const buffer = await generateQrBuffer(params.reference);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
