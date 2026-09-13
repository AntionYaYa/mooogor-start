import QRCodeStyling from "qr-code-styling";

export async function createPageQrCode(url: string): Promise<Blob> {
  const code = new QRCodeStyling({
    type: "canvas",
    shape: "square",
    width: 300,
    height: 300,
    data: url,
    margin: 0,
    qrOptions: { typeNumber: 0, mode: "Byte", errorCorrectionLevel: "Q" },
    dotsOptions: { type: "rounded", color: "#0d0d0d", roundSize: true },
    backgroundOptions: { round: 0, color: "#ffffff" },
    cornersSquareOptions: { type: "extra-rounded", color: "#0d0d0d" },
    cornersDotOptions: { type: "dot", color: "#0d0d0d" },
  });
  const image = await code.getRawData("png");
  if (!(image instanceof Blob)) throw new Error("QR code did not produce an image");
  return image;
}
