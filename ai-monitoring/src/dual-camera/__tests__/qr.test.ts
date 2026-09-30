import { describe, expect, it } from "vitest";

import { generateDualCameraQrDataUrl } from "../qr.js";

describe("Dual-camera QR generation", () => {
  const joinUrl =
    "https://example.com/dual-camera/join" +
    "?sessionId=session-123&token=token-456";

  it("generates a QR code data URL", async () => {
    const result =
      await generateDualCameraQrDataUrl(joinUrl);

    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("generates a QR code containing the supplied join URL", async () => {
    const result =
      await generateDualCameraQrDataUrl(joinUrl);

    expect(result.length).toBeGreaterThan(100);
  });

  it("accepts custom QR options", async () => {
    const result =
      await generateDualCameraQrDataUrl(joinUrl, {
        size: 500,
        margin: 4,
      });

    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects an empty join URL", async () => {
    await expect(
      generateDualCameraQrDataUrl("")
    ).rejects.toThrow(
      "Join URL must not be empty"
    );
  });

  it("rejects whitespace-only join URLs", async () => {
    await expect(
      generateDualCameraQrDataUrl("   ")
    ).rejects.toThrow(
      "Join URL must not be empty"
    );
  });
});
