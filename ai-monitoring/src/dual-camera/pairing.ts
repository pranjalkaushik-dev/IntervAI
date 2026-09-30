import {
  generateDualCameraQrDataUrl,
} from "./qr.js";

import {
  DualCameraSessionManager,
} from "./session.js";

import type {
  DualCameraCallbacks,
  DualCameraSession,
} from "./types.js";

export interface DualCameraPairingOptions {
  joinBaseUrl: string;
  callbacks?: DualCameraCallbacks;
}

export interface DualCameraPairingResult {
  session: DualCameraSession;
  qrDataUrl: string;
}

export class DualCameraPairingService {
  private readonly sessionManager: DualCameraSessionManager;

  constructor(options: DualCameraPairingOptions) {
    const sessionManagerOptions: {
      joinBaseUrl: string;
      callbacks?: DualCameraCallbacks;
    } = {
      joinBaseUrl: options.joinBaseUrl,
    };

    if (options.callbacks) {
      sessionManagerOptions.callbacks = options.callbacks;
    }

    this.sessionManager =
      new DualCameraSessionManager(
        sessionManagerOptions
      );
  }

  async createPairing(): Promise<DualCameraPairingResult> {
    const session =
      this.sessionManager.createSession();

    const qrDataUrl =
      await generateDualCameraQrDataUrl(
        session.joinUrl
      );

    return {
      session,
      qrDataUrl,
    };
  }

  getSession(): DualCameraSession | undefined {
    return this.sessionManager.getSession();
  }
}
