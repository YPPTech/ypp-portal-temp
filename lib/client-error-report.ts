export function reportClientError(
  boundary: string,
  error: Error & { digest?: string },
  extra: Record<string, unknown> = {}
) {
  console.error(`[${boundary}]`, {
    message: error.message,
    digest: error.digest,
    stack: error.stack,
    ...extra,
  });
}
