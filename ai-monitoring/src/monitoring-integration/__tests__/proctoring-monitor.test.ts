import { describe, expect, it, vi } from "vitest";
import { ProctoringMonitor } from "../proctoring-monitor.js";

const { mockClient, MockMonitoringSocketClient } = vi.hoisted(() => {
  const client = {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    joinRoom: vi.fn(),
    reportViolation: vi.fn(),
    onViolationAlert: vi.fn(() => vi.fn()),
  };

  const Client = vi.fn(function () {
    return client;
  });

  return {
    mockClient: client,
    MockMonitoringSocketClient: Client,
  };
});

vi.mock("../socket-client.js", () => ({
  MonitoringSocketClient: MockMonitoringSocketClient,
}));

describe("ProctoringMonitor", () => {
  it("connects and joins the interview room", async () => {
    const monitor = new ProctoringMonitor({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
      roomId: "room-123",
      studentId: "student-456",
      userName: "Rishav",
    });

    await monitor.start();

    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.joinRoom).toHaveBeenCalledWith(
      "room-123",
      "Rishav",
    );
  });

  it("reports a CV violation", () => {
    const monitor = new ProctoringMonitor({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
      roomId: "room-123",
      studentId: "student-456",
      userName: "Rishav",
    });

    monitor.reportViolation({
      type: "PROHIBITED_OBJECT",
      occurredAt: "2026-09-06T00:00:00.000Z",
      metadata: {
        objectType: "cell phone",
        confidence: 0.91,
      },
    });

    expect(mockClient.reportViolation).toHaveBeenCalledWith({
      roomId: "room-123",
      studentId: "student-456",
      violationType: "PROHIBITED_OBJECT",
    });
  });

  it("disconnects when stopped", () => {
    const monitor = new ProctoringMonitor({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
      roomId: "room-123",
      studentId: "student-456",
      userName: "Rishav",
    });

    monitor.stop();

    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("forwards violation alerts", () => {
    const monitor = new ProctoringMonitor({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
      roomId: "room-123",
      studentId: "student-456",
      userName: "Rishav",
    });

    const callback = vi.fn();

    monitor.onViolationAlert(callback);

    expect(mockClient.onViolationAlert).toHaveBeenCalledWith(callback);
  });
});