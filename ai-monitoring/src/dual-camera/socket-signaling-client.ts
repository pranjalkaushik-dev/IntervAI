import { io, type Socket } from "socket.io-client";

import type {
  AnswerMessage,
  IceCandidateMessage,
  JoinSessionMessage,
  OfferMessage,
} from "./signaling.js";

import type { DualCameraSignalingClient } from "./signaling-client.js";

export interface SocketSignalingClientOptions {
  serverUrl: string;
}

export class SocketDualCameraSignalingClient
  implements DualCameraSignalingClient
{
  private readonly serverUrl: string;

  private socket: Socket | undefined;

  constructor(options: SocketSignalingClientOptions) {
    this.serverUrl = options.serverUrl;
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    const socket = this.socket ?? io(this.serverUrl, {
      autoConnect: false,
      transports: ["websocket"],
    });

    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      const handleConnect = (): void => {
        cleanup();
        resolve();
      };

      const handleError = (error: Error): void => {
        cleanup();
        reject(error);
      };

      const cleanup = (): void => {
        socket.off("connect", handleConnect);
        socket.off("connect_error", handleError);
      };

      socket.once("connect", handleConnect);
      socket.once("connect_error", handleError);

      socket.connect();
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  sendJoinSession(message: JoinSessionMessage): void {
    this.requireSocket().emit("dual-camera:join", message);
  }

  sendOffer(message: OfferMessage): void {
    this.requireSocket().emit("dual-camera:offer", message);
  }

  sendAnswer(message: AnswerMessage): void {
    this.requireSocket().emit("dual-camera:answer", message);
  }

  sendIceCandidate(message: IceCandidateMessage): void {
    this.requireSocket().emit(
      "dual-camera:ice-candidate",
      message
    );
  }

  onOffer(
    handler: (message: OfferMessage) => void
  ): () => void {
    return this.on("dual-camera:offer", handler);
  }

  onAnswer(
    handler: (message: AnswerMessage) => void
  ): () => void {
    return this.on("dual-camera:answer", handler);
  }

  onIceCandidate(
    handler: (message: IceCandidateMessage) => void
  ): () => void {
    return this.on("dual-camera:ice-candidate", handler);
  }

  onSessionJoined(
    handler: (message: JoinSessionMessage) => void
  ): () => void {
    return this.on("dual-camera:joined", handler);
  }

  onLeave(
    handler: (
      message: Extract<
        import("./signaling.js").DualCameraSignalingMessage,
        { type: "LEAVE_SESSION" }
      >
    ) => void
  ): () => void {
    return this.on("dual-camera:leave", handler);
  }

  private on<T>(
    event: string,
    handler: (message: T) => void
  ): () => void {
    const socket = this.requireSocket();

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }

  private requireSocket(): Socket {
    if (!this.socket) {
      throw new Error(
        "Socket signaling client has not been connected"
      );
    }

    return this.socket;
  }
}
