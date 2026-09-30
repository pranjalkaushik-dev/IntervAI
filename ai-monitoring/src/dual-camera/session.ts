import type {
  CameraRole,
  DualCameraCallbacks,
  DualCameraConnectionState,
  DualCameraDevice,
  DualCameraSession,
  DualCameraState,
} from "./types.js";

function generateId(): string {
  return crypto.randomUUID();
}

function generateJoinToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export interface DualCameraSessionManagerOptions {
  joinBaseUrl: string;
  callbacks?: DualCameraCallbacks;
}

export class DualCameraSessionManager {
  private readonly joinBaseUrl: string;
  private readonly callbacks: DualCameraCallbacks;

  private session: DualCameraSession | undefined;

  private readonly devices: Record<CameraRole, DualCameraDevice> = {
    PRIMARY: {
      role: "PRIMARY",
      connectionState: "DISCONNECTED",
    },
    SECONDARY: {
      role: "SECONDARY",
      connectionState: "DISCONNECTED",
    },
  };

  constructor(options: DualCameraSessionManagerOptions) {
    this.joinBaseUrl = options.joinBaseUrl.replace(/\/$/, "");
    this.callbacks = options.callbacks ?? {};
  }

  createSession(): DualCameraSession {
    const sessionId = generateId();
    const joinToken = generateJoinToken();

    const joinUrl =
      `${this.joinBaseUrl}/dual-camera/join` +
      `?sessionId=${encodeURIComponent(sessionId)}` +
      `&token=${encodeURIComponent(joinToken)}`;

    this.session = {
      sessionId,
      joinToken,
      joinUrl,
    };

    this.setConnectionState("PRIMARY", "CONNECTING");

    return { ...this.session };
  }

  getSession(): DualCameraSession | undefined {
    if (!this.session) {
      return undefined;
    }

    return { ...this.session };
  }

  setPrimaryConnected(deviceId?: string): void {
    this.setDeviceConnected("PRIMARY", deviceId);
  }

  setSecondaryConnected(deviceId?: string): void {
    this.setDeviceConnected("SECONDARY", deviceId);
  }

  setPrimaryDisconnected(): void {
    this.setConnectionState("PRIMARY", "DISCONNECTED");
  }

  setSecondaryDisconnected(): void {
    this.setConnectionState("SECONDARY", "DISCONNECTED");
  }

  getState(): DualCameraState {
    const primary = { ...this.devices.PRIMARY };
    const secondary = { ...this.devices.SECONDARY };

    return {
      primary,
      secondary,
      bothCamerasConnected:
        primary.connectionState === "CONNECTED" &&
        secondary.connectionState === "CONNECTED",
    };
  }

  reset(): void {
    this.session = undefined;

    this.setConnectionState("PRIMARY", "DISCONNECTED");
    this.setConnectionState("SECONDARY", "DISCONNECTED");
  }

  private setDeviceConnected(
    role: CameraRole,
    deviceId?: string
  ): void {
    this.devices[role] = {
      role,
      ...(deviceId !== undefined ? { deviceId } : {}),
      connectionState: "CONNECTED",
    };

    this.callbacks.onConnectionStateChange?.(
      role,
      "CONNECTED"
    );
  }

  private setConnectionState(
    role: CameraRole,
    state: DualCameraConnectionState
  ): void {
    const currentDevice = this.devices[role];

    this.devices[role] = {
      ...currentDevice,
      connectionState: state,
    };

    this.callbacks.onConnectionStateChange?.(role, state);
  }
}
