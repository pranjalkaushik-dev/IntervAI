export interface CameraOptions {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
}

export class CvCamera {
  private stream: MediaStream | undefined;

  async start(
    options: CameraOptions = {}
  ): Promise<MediaStream> {
    if (this.stream) {
      return this.stream;
    }

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          width: options.width ?? 1280,
          height: options.height ?? 720,
          facingMode: options.facingMode ?? "user",
        },
        audio: false,
      });

    this.stream = stream;

    return stream;
  }

  attachToVideo(
    video: HTMLVideoElement
  ): void {
    if (!this.stream) {
      throw new Error(
        "Camera has not been started"
      );
    }

    video.srcObject = this.stream;
    video.playsInline = true;
    video.autoplay = true;
    video.muted = true;
  }

  stop(): void {
    if (!this.stream) {
      return;
    }

    for (const track of this.stream.getTracks()) {
      track.stop();
    }

    this.stream = undefined;
  }

  isActive(): boolean {
    if (!this.stream) {
      return false;
    }

    return this.stream
      .getVideoTracks()
      .some((track) => track.readyState === "live");
  }

  getStream(): MediaStream | undefined {
    return this.stream;
  }
}