import { describe, expect, it, vi } from "vitest";
import { MonitoringSocketClient } from "../socket-client.js";

const { mockSocket } = vi.hoisted(() => ({
  mockSocket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
  },
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

describe("MonitoringSocketClient", () => {
  it("connects to the Socket.IO server", async () => {
    const client = new MonitoringSocketClient({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
    });

    const connection = client.connect();

    const connectHandler = mockSocket.once.mock.calls.find(
      ([event]) => event === "connect",
    )?.[1] as (() => void) | undefined;

    expect(connectHandler).toBeDefined();

    connectHandler?.();

    await expect(connection).resolves.toBeUndefined();
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it("disconnects from the server", () => {
    const client = new MonitoringSocketClient({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
    });

    client.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("joins an interview room", () => {
    const client = new MonitoringSocketClient({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
    });

    client.joinRoom("interview-123", "Rishav");

    expect(mockSocket.emit).toHaveBeenCalledWith("join-room", {
      roomId: "interview-123",
      userName: "Rishav",
    });
  });

  it("reports a monitoring violation", () => {
    const client = new MonitoringSocketClient({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
    });

    client.reportViolation({
      roomId: "interview-123",
      studentId: "student-456",
      violationType: "PROHIBITED_OBJECT",
    });

    expect(mockSocket.emit).toHaveBeenCalledWith("monitoring:violation", {
      roomId: "interview-123",
      studentId: "student-456",
      violationType: "PROHIBITED_OBJECT",
    });
  });

  it("subscribes to violation alerts and returns cleanup", () => {
    const client = new MonitoringSocketClient({
      serverUrl: "http://localhost:5001",
      token: "test-jwt-token",
    });

    const callback = vi.fn();

    const cleanup = client.onViolationAlert(callback);

    expect(mockSocket.on).toHaveBeenCalledWith(
      "violation-alert",
      callback,
    );

    cleanup();

    expect(mockSocket.off).toHaveBeenCalledWith(
      "violation-alert",
      callback,
    );
  });
});