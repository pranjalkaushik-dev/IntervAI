import type { HeadPoseResult } from "./head-pose.js";

interface Landmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Estimates head orientation from a small set of face landmarks.
 *
 * MediaPipe landmarks are normalized:
 * x → left/right
 * y → up/down
 * z → depth
 */
export function estimateHeadPose(
  landmarks: ReadonlyArray<Landmark>,
): Pick<HeadPoseResult, "yaw" | "pitch"> {
  if (landmarks.length === 0) {
    return {
      yaw: 0,
      pitch: 0,
    };
  }

  // MediaPipe Face Landmarker:
  // 1  = nose
  // 33 = left eye
  // 263 = right eye
  // 61 = left mouth
  // 291 = right mouth

  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];

  if (
    !nose ||
    !leftEye ||
    !rightEye ||
    !leftMouth ||
    !rightMouth
  ) {
    return {
      yaw: 0,
      pitch: 0,
    };
  }

  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;

  const mouthCenterX = (leftMouth.x + rightMouth.x) / 2;
  const mouthCenterY = (leftMouth.y + rightMouth.y) / 2;

  const eyeDistance = Math.abs(rightEye.x - leftEye.x);

  if (eyeDistance < 0.0001) {
    return {
      yaw: 0,
      pitch: 0,
    };
  }

  /*
   * Approximate horizontal rotation.
   *
   * If the nose moves away from the center of the eyes,
   * the candidate is turning left/right.
   */
  const horizontalOffset =
    (nose.x - eyeCenterX) / eyeDistance;

  const yaw = horizontalOffset * 45;

  /*
   * Approximate vertical rotation.
   *
   * Compare nose position with the eye/mouth geometry.
   */
  const faceHeight =
    Math.abs(mouthCenterY - eyeCenterY);

  if (faceHeight < 0.0001) {
    return {
      yaw,
      pitch: 0,
    };
  }

  const noseVerticalPosition =
    (nose.y - eyeCenterY) / faceHeight;

  const expectedNosePosition = 0.5;

  const pitch =
    (noseVerticalPosition - expectedNosePosition) * 40;

  return {
    yaw,
    pitch,
  };
}