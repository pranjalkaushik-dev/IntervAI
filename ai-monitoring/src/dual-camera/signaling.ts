export type SignalingMessageType =
  | "JOIN_SESSION"
  | "OFFER"
  | "ANSWER"
  | "ICE_CANDIDATE"
  | "LEAVE_SESSION";

export interface JoinSessionMessage {
  type: "JOIN_SESSION";
  sessionId: string;
  joinToken: string;
}

export interface OfferMessage {
  type: "OFFER";
  sessionId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
  type: "ANSWER";
  sessionId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage {
  type: "ICE_CANDIDATE";
  sessionId: string;
  candidate: RTCIceCandidateInit;
}

export interface LeaveSessionMessage {
  type: "LEAVE_SESSION";
  sessionId: string;
}

export type DualCameraSignalingMessage =
  | JoinSessionMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | LeaveSessionMessage;
