export type BrowserViolationType =
  | "TAB_HIDDEN"
  | "FULLSCREEN_EXIT"
  | "COPY"
  | "PASTE"
  | "CAMERA_OFF"
  | "MIC_OFF"
  | "OTHER";

export interface BrowserViolation {
  type: BrowserViolationType;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface BrowserMonitorCallbacks {
  onViolation?: (violation: BrowserViolation) => void;
}

export interface MediaMonitoringOptions {
  stream: MediaStream;
}
