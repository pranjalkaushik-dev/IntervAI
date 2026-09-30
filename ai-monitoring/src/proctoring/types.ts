import type {
  BrowserMonitorCallbacks,
  BrowserViolation,
  MediaMonitoringOptions,
} from "../browser-monitoring/types.js";

export interface ProctoringSessionCallbacks
  extends BrowserMonitorCallbacks {
  onSessionStarted?: () => void;
  onSessionStopped?: () => void;
}

export interface ProctoringSessionOptions
  extends MediaMonitoringOptions {
  callbacks?: ProctoringSessionCallbacks;
}

export interface ProctoringSessionState {
  active: boolean;
  violations: BrowserViolation[];
}
