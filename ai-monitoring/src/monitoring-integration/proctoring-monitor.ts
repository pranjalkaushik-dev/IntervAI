import type { CvViolation } from "../cv-proctoring/types.js";
import { MonitoringSocketClient } from "./socket-client.js";

export interface ProctoringMonitorOptions {
  serverUrl: string;
  token: string;
  roomId: string;
  studentId: string;
  userName: string;
}

export class ProctoringMonitor {
  private readonly client: MonitoringSocketClient;
  private readonly roomId: string;
  private readonly studentId: string;
  private readonly userName: string;

  constructor(options: ProctoringMonitorOptions) {
    this.client = new MonitoringSocketClient({
      serverUrl: options.serverUrl,
      token: options.token,
    });

    this.roomId = options.roomId;
    this.studentId = options.studentId;
    this.userName = options.userName;
  }

  async start(): Promise<void> {
    await this.client.connect();

    this.client.joinRoom(this.roomId, this.userName);
  }

  stop(): void {
    this.client.disconnect();
  }

  reportViolation(violation: CvViolation): void {
    this.client.reportViolation({
      roomId: this.roomId,
      studentId: this.studentId,
      violationType: violation.type,
    });
  }

  onViolationAlert(
    callback: (alert: {
      studentId: string;
      violationType: string;
      timestamp: number;
    }) => void,
  ): () => void {
    return this.client.onViolationAlert(callback);
  }
}