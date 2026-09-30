import type {
  BrowserMonitorCallbacks,
  BrowserViolation,
  BrowserViolationType,
  MediaMonitoringOptions,
} from "./types.js";

export class BrowserActivityMonitor {
  private readonly callbacks: BrowserMonitorCallbacks;

  private started = false;
  private mediaStream: MediaStream | undefined;

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.recordViolation("TAB_HIDDEN");
    }
  };

  private readonly handleFullscreenChange = (): void => {
    if (!document.fullscreenElement) {
      this.recordViolation("FULLSCREEN_EXIT");
    }
  };

  private readonly handleCopy = (): void => {
    this.recordViolation("COPY");
  };

  private readonly handlePaste = (): void => {
    this.recordViolation("PASTE");
  };

  private readonly handleVideoTrackEnded = (): void => {
    this.recordViolation("CAMERA_OFF");
  };

  private readonly handleAudioTrackEnded = (): void => {
    this.recordViolation("MIC_OFF");
  };

  constructor(callbacks: BrowserMonitorCallbacks = {}) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.started) {
      return;
    }

    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );

    document.addEventListener(
      "fullscreenchange",
      this.handleFullscreenChange
    );

    document.addEventListener("copy", this.handleCopy);
    document.addEventListener("paste", this.handlePaste);

    this.started = true;
  }

  startMediaMonitoring(options: MediaMonitoringOptions): void {
    if (this.mediaStream) {
      this.stopMediaMonitoring();
    }

    this.mediaStream = options.stream;

    for (const track of this.mediaStream.getVideoTracks()) {
      track.addEventListener("ended", this.handleVideoTrackEnded);
    }

    for (const track of this.mediaStream.getAudioTracks()) {
      track.addEventListener("ended", this.handleAudioTrackEnded);
    }
  }

  checkMediaState(): void {
    if (!this.mediaStream) {
      return;
    }

    for (const track of this.mediaStream.getVideoTracks()) {
      if (!track.enabled) {
        this.recordViolation("CAMERA_OFF");
      }
    }

    for (const track of this.mediaStream.getAudioTracks()) {
      if (!track.enabled) {
        this.recordViolation("MIC_OFF");
      }
    }
  }

  stopMediaMonitoring(): void {
    if (!this.mediaStream) {
      return;
    }

    for (const track of this.mediaStream.getVideoTracks()) {
      track.removeEventListener("ended", this.handleVideoTrackEnded);
    }

    for (const track of this.mediaStream.getAudioTracks()) {
      track.removeEventListener("ended", this.handleAudioTrackEnded);
    }

    this.mediaStream = undefined;
  }

  stop(): void {
    if (!this.started) {
      return;
    }

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );

    document.removeEventListener(
      "fullscreenchange",
      this.handleFullscreenChange
    );

    document.removeEventListener("copy", this.handleCopy);
    document.removeEventListener("paste", this.handlePaste);

    this.stopMediaMonitoring();

    this.started = false;
  }

  private recordViolation(type: BrowserViolationType): void {
    const violation: BrowserViolation = {
      type,
      occurredAt: new Date().toISOString(),
    };

    this.callbacks.onViolation?.(violation);
  }
}
