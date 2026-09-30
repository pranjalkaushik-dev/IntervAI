import QRCode from "qrcode";

export interface DualCameraQrOptions {
  size?: number;
  margin?: number;
}

export async function generateDualCameraQrDataUrl(
  joinUrl: string,
  options: DualCameraQrOptions = {}
): Promise<string> {
  if (!joinUrl.trim()) {
    throw new Error("Join URL must not be empty");
  }

  return QRCode.toDataURL(joinUrl, {
    width: options.size ?? 320,
    margin: options.margin ?? 2,
    errorCorrectionLevel: "M",
  });
}
