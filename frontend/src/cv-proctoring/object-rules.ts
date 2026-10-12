import type { DetectedObject } from "./object-detector.js";

export type ProhibitedObjectType = "CELL_PHONE";

export interface ProhibitedObject {
  type: ProhibitedObjectType;
  label: string;
  score: number;
}

export function detectProhibitedObjects(
  objects: DetectedObject[],
): ProhibitedObject[] {
  return objects
    .filter((object) => {
      const label = object.label.toLowerCase();

      return (
        label === "cell phone" ||
        label === "mobile phone" ||
        label === "phone"
      );
    })
    .map((object) => ({
      type: "CELL_PHONE" as const,
      label: object.label,
      score: object.score,
    }));
}