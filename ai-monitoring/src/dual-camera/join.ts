export interface DualCameraJoinDetails {
  sessionId: string;
  joinToken: string;
}

export function parseDualCameraJoinUrl(
  url: string
): DualCameraJoinDetails {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid dual-camera join URL");
  }

  const sessionId = parsedUrl.searchParams.get("sessionId");
  const joinToken = parsedUrl.searchParams.get("token");

  if (!sessionId) {
    throw new Error("Missing dual-camera session ID");
  }

  if (!joinToken) {
    throw new Error("Missing dual-camera join token");
  }

  if (sessionId.length < 1) {
    throw new Error("Invalid dual-camera session ID");
  }

  if (joinToken.length < 1) {
    throw new Error("Invalid dual-camera join token");
  }

  return {
    sessionId,
    joinToken,
  };
}
