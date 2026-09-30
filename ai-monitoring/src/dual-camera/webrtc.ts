import type {
  CameraRole,
  DualCameraCallbacks,
  DualCameraConnectionState,
} from "./types.js";

export interface WebRtcPeerOptions {
  role: CameraRole;
  callbacks?: DualCameraCallbacks;
}

export class DualCameraWebRtcPeer {
  private readonly role: CameraRole;
  private readonly callbacks: DualCameraCallbacks;

  private peerConnection: RTCPeerConnection | undefined;

  constructor(options: WebRtcPeerOptions) {
    this.role = options.role;
    this.callbacks = options.callbacks ?? {};
  }

  createPeerConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      return this.peerConnection;
    }

    const peerConnection = new RTCPeerConnection();

    peerConnection.onconnectionstatechange = () => {
      const state = this.mapConnectionState(
        peerConnection.connectionState
      );

      this.callbacks.onConnectionStateChange?.(
        this.role,
        state
      );
    };

    this.peerConnection = peerConnection;

    this.callbacks.onConnectionStateChange?.(
      this.role,
      "CONNECTING"
    );

    return peerConnection;
  }

  getPeerConnection(): RTCPeerConnection | undefined {
    return this.peerConnection;
  }

  close(): void {
    if (!this.peerConnection) {
      return;
    }

    this.peerConnection.close();
    this.peerConnection = undefined;

    this.callbacks.onConnectionStateChange?.(
      this.role,
      "DISCONNECTED"
    );
  }

  private mapConnectionState(
    state: RTCPeerConnectionState
  ): DualCameraConnectionState {
    switch (state) {
      case "connected":
        return "CONNECTED";

      case "connecting":
        return "CONNECTING";

      case "new":
        return "CONNECTING";

      case "disconnected":
      case "failed":
      case "closed":
        return "DISCONNECTED";
    }
  }
}
