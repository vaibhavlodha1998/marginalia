// Minimal server-side error log so silent fallbacks are at least visible.
// Swap for Sentry/structured logging in production.
export function logError(scope: string, err: unknown, meta?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${scope}] ${message}`, meta ?? "");
}
