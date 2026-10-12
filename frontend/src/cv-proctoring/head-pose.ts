export type HeadPoseStatus =
  | "LOOKING_AT_SCREEN"
  | "LOOKING_AWAY";

export interface HeadPoseResult {
  status: HeadPoseStatus;
  yaw: number;
  pitch: number;
  detectedAt: string;
}

export interface HeadPoseOptions {
  yawThreshold?: number;
  pitchThreshold?: number;
}

/**
 * Classifies head orientation using yaw and pitch angles.
 *
 * yaw:
 *   negative → looking left
 *   positive → looking right
 *
 * pitch:
 *   negative → looking up
 *   positive → looking down
 */
export function classifyHeadPose(
  yaw: number,
  pitch: number,
  options: HeadPoseOptions = {},
): HeadPoseStatus {
  const yawThreshold = options.yawThreshold ?? 25;
  const pitchThreshold = options.pitchThreshold ?? 20;

  const lookingAway =
    Math.abs(yaw) > yawThreshold ||
    Math.abs(pitch) > pitchThreshold;

  return lookingAway
    ? "LOOKING_AWAY"
    : "LOOKING_AT_SCREEN";
}