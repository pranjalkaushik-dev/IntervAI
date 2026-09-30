import { describe, expect, it, vi } from "vitest";
import { withRetry } from "../retry.js";

describe("Retry Utility", () => {
  it("returns the result when the operation succeeds", async () => {
    const operation = vi.fn().mockResolvedValue("success");

    const result = await withRetry(operation, 3, 1);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries when a retryable error occurs", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("503 Service Unavailable")
      )
      .mockResolvedValueOnce("success");

    const result = await withRetry(operation, 3, 1);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("retries multiple times for retryable errors", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("429 Too Many Requests")
      )
      .mockRejectedValueOnce(
        new Error("503 Service Unavailable")
      )
      .mockResolvedValueOnce("success");

    const result = await withRetry(operation, 3, 1);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("throws immediately for a non-retryable error", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(new Error("Invalid request"));

    await expect(
      withRetry(operation, 3, 1)
    ).rejects.toThrow("Invalid request");

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("throws the final error after maximum retryable attempts", async () => {
    const operation = vi
      .fn()
      .mockRejectedValue(
        new Error("503 Service Unavailable")
      );

    await expect(
      withRetry(operation, 3, 1)
    ).rejects.toThrow("503 Service Unavailable");

    expect(operation).toHaveBeenCalledTimes(3);
  });
});