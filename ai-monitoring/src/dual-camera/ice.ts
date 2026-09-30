export interface DualCameraIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface DualCameraRtcConfig {
  iceServers: DualCameraIceServer[];
}

export const defaultDualCameraRtcConfig: DualCameraRtcConfig = {
  iceServers: [],
};
