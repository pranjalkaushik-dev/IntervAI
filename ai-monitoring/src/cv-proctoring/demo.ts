import {
  CvProctoringController,
} from "./proctoring-controller.js";

import type {
  CvViolation,
} from "./types.js";

import type {
  HeadPoseResult,
} from "./head-pose.js";

const video =
  document.querySelector<HTMLVideoElement>(
    "#camera",
  );

const statusElement =
  document.querySelector<HTMLElement>(
    "#status",
  );

const faceCountElement =
  document.querySelector<HTMLElement>(
    "#face-count",
  );

const headPoseElement =
  document.querySelector<HTMLElement>(
    "#head-pose",
  );

const headAnglesElement =
  document.querySelector<HTMLElement>(
    "#head-angles",
  );

const startButton =
  document.querySelector<HTMLButtonElement>(
    "#start",
  );

const stopButton =
  document.querySelector<HTMLButtonElement>(
    "#stop",
  );

const violationsElement =
  document.querySelector<HTMLElement>(
    "#violations",
  );

if (
  !video ||
  !statusElement ||
  !faceCountElement ||
  !headPoseElement ||
  !headAnglesElement ||
  !startButton ||
  !stopButton ||
  !violationsElement
) {
  throw new Error(
    "Required demo elements are missing",
  );
}

function formatViolationType(
  type: CvViolation["type"],
): string {
  switch (type) {
    case "CANDIDATE_ABSENT":
      return "Candidate absent";

    case "MULTIPLE_PEOPLE":
      return "Multiple people detected";

    case "PROHIBITED_OBJECT":
      return "Prohibited object detected";

    case "LOOKING_AWAY":
      return "Looking away";

    default:
      return type;
  }
}

function addViolation(
  violation: CvViolation,
): void {
  if (!violationsElement) {
    return;
  }

  const emptyMessage =
    violationsElement.querySelector(
      ".empty",
    );

  emptyMessage?.remove();

  const element =
    document.createElement("div");

  element.className =
    "violation";

  const typeElement =
    document.createElement("div");

  typeElement.className =
    "violation-type";

  typeElement.textContent =
    `⚠ ${formatViolationType(
      violation.type,
    )}`;

  const detailsElement =
    document.createElement("div");

  detailsElement.className =
    "violation-details";

  if (
    violation.metadata?.objectType
  ) {
    detailsElement.textContent =
      `Object: ${violation.metadata.objectType}`;
  } else if (
    violation.metadata?.faceCount !==
    undefined
  ) {
    detailsElement.textContent =
      `Faces detected: ${violation.metadata.faceCount}`;
  } else if (
    violation.metadata?.yaw !==
      undefined ||
    violation.metadata?.pitch !==
      undefined
  ) {
    const yaw =
      violation.metadata.yaw !==
      undefined
        ? violation.metadata.yaw.toFixed(
            1,
          )
        : "--";

    const pitch =
      violation.metadata.pitch !==
      undefined
        ? violation.metadata.pitch.toFixed(
            1,
          )
        : "--";

    detailsElement.textContent =
      `Yaw: ${yaw}° | Pitch: ${pitch}°`;
  }

  const timeElement =
    document.createElement("div");

  timeElement.className =
    "violation-time";

  timeElement.textContent =
    new Date(
      violation.occurredAt,
    ).toLocaleTimeString();

  element.appendChild(
    typeElement,
  );

  if (detailsElement.textContent) {
    element.appendChild(
      detailsElement,
    );
  }

  element.appendChild(
    timeElement,
  );

  violationsElement.prepend(
    element,
  );
}

function updateHeadPose(
  result: HeadPoseResult,
): void {
  if (
    !headPoseElement ||
    !headAnglesElement
  ) {
    return;
  }

  headPoseElement.textContent =
    result.status;

  headAnglesElement.textContent =
    `Yaw: ${result.yaw.toFixed(1)}° | ` +
    `Pitch: ${result.pitch.toFixed(1)}°`;
}

const controller =
  new CvProctoringController({
    detectionIntervalMs: 500,

    minDetectionConfidence: 0.5,

    objectDetectionConfidence: 0.5,

    maxObjectResults: 5,

    violationPersistenceMs: 2000,

    onHeadPoseDetection: (
      result: HeadPoseResult,
    ) => {
      updateHeadPose(result);
    },

    callbacks: {
      onDetection: (
        result,
      ) => {
        statusElement.textContent =
          result.status;

        faceCountElement.textContent =
          `Faces detected: ${result.faceCount}`;
      },

      onViolation: (
        violation,
      ) => {
        console.warn(
          "CV VIOLATION:",
          violation,
        );

        addViolation(
          violation,
        );
      },
    },
  });

startButton.addEventListener(
  "click",
  async () => {
    if (controller.isRunning()) {
      return;
    }

    try {
      statusElement.textContent =
        "STARTING";

      faceCountElement.textContent =
        "Faces detected: 0";

      headPoseElement.textContent =
        "--";

      headAnglesElement.textContent =
        "Yaw: -- | Pitch: --";

      await controller.start(
        video,
      );

      statusElement.textContent =
        "WAITING_FOR_FACE";

      startButton.disabled = true;

      stopButton.disabled = false;
    } catch (error) {
      console.error(
        "Failed to start CV proctoring:",
        error,
      );

      statusElement.textContent =
        "CAMERA_ERROR";

      faceCountElement.textContent =
        "Faces detected: 0";

      headPoseElement.textContent =
        "--";

      headAnglesElement.textContent =
        "Yaw: -- | Pitch: --";
    }
  },
);

stopButton.addEventListener(
  "click",
  () => {
    controller.stop();

    statusElement.textContent =
      "STOPPED";

    faceCountElement.textContent =
      "Faces detected: 0";

    headPoseElement.textContent =
      "--";

    headAnglesElement.textContent =
      "Yaw: -- | Pitch: --";

    startButton.disabled = false;

    stopButton.disabled = true;
  },
);