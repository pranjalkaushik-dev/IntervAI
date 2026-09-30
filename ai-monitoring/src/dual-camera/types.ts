export type CameraRole = "PRIMARY" | "SECONDARY";

export type DualCameraConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED";

export interface DualCameraSession {
  sessionId: string;
  joinToken: string;
  joinUrl: string;
}

export interface DualCameraDevice {
  role: CameraRole;
  deviceId?: string;
  connectionState: DualCameraConnectionState;
}

export interface DualCameraViolation {
  role: CameraRole;
  type: "CAMERA_OFF";
  occurredAt: string;
}

export interface DualCameraCallbacks {
  onViolation?: (violation: DualCameraViolation) => void;
  onConnectionStateChange?: (
    role: CameraRole,
    state: DualCameraConnectionState
  ) => void;
}

export interface DualCameraState {
  primary: DualCameraDevice;
  secondary: DualCameraDevice;
  bothCamerasConnected: boolean;
}
