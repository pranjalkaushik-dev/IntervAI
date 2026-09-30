export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        break;
      }

      const delay = baseDelayMs * 2 ** (attempt - 1);

      console.warn(
        `AI request failed. Retrying in ${delay}ms... ` +
          `(attempt ${attempt}/${maxAttempts})`
      );

      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }

  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("503") ||
    message.includes("429") ||
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("temporarily unavailable") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  );
}