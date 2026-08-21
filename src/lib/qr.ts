import QRCode from "qrcode";

export async function generateQrBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    type: "png",
    width: 300,
    margin: 2,
  });
}

export async function generateQrDataUrl(data: string): Promise<string> {
  return QRCode.toDataURL(data, { width: 200, margin: 2 });
}
