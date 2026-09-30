import { BrowserActivityMonitor } from "../browser-monitoring/monitor.js";

import type { BrowserViolation } from "../browser-monitoring/types.js";

import type {
  ProctoringSessionCallbacks,
  ProctoringSessionOptions,
  ProctoringSessionState,
} from "./types.js";

export class ProctoringSession {
  private readonly monitor: BrowserActivityMonitor;
  private readonly callbacks: ProctoringSessionCallbacks;

  private active = false;
  private violations: BrowserViolation[] = [];

  constructor(options: ProctoringSessionOptions) {
    this.callbacks = options.callbacks ?? {};

    this.monitor = new BrowserActivityMonitor({
      onViolation: (violation) => {
        this.violations.push(violation);
        this.callbacks.onViolation?.(violation);
      },
    });

    this.monitor.startMediaMonitoring({
      stream: options.stream,
    });
  }

  start(): void {
    if (this.active) {
      return;
    }

    this.monitor.start();
    this.active = true;

    this.callbacks.onSessionStarted?.();
  }

  checkMediaState(): void {
    if (!this.active) {
      return;
    }

    this.monitor.checkMediaState();
  }

  stop(): void {
    if (!this.active) {
      return;
    }

    this.monitor.stop();
    this.active = false;

    this.callbacks.onSessionStopped?.();
  }

  getState(): ProctoringSessionState {
    return {
      active: this.active,
      violations: [...this.violations],
    };
  }

  getViolations(): BrowserViolation[] {
    return [...this.violations];
  }
}
