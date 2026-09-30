import type {
  AnswerMessage,
  DualCameraSignalingMessage,
  IceCandidateMessage,
  JoinSessionMessage,
  OfferMessage,
} from "./signaling.js";

export interface DualCameraSignalingClient {
  connect(): Promise<void>;
  disconnect(): void;

  sendJoinSession(message: JoinSessionMessage): void;
  sendOffer(message: OfferMessage): void;
  sendAnswer(message: AnswerMessage): void;
  sendIceCandidate(message: IceCandidateMessage): void;

  onOffer(
    handler: (message: OfferMessage) => void
  ): () => void;

  onAnswer(
    handler: (message: AnswerMessage) => void
  ): () => void;

  onIceCandidate(
    handler: (message: IceCandidateMessage) => void
  ): () => void;

  onSessionJoined(
    handler: (message: JoinSessionMessage) => void
  ): () => void;

  onLeave(
    handler: (message: Extract<
      DualCameraSignalingMessage,
      { type: "LEAVE_SESSION" }
    >) => void
  ): () => void;
}
