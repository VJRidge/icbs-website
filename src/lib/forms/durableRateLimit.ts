/** Pure helpers for durable rate-limit windows (DB hit via API). */

export function rateLimitWindowStart(nowMs: number, windowSeconds: number): number {
  const sec = Math.max(30, Math.min(86400, Math.floor(windowSeconds || 900)));
  const epoch = Math.floor(nowMs / 1000);
  return Math.floor(epoch / sec) * sec * 1000;
}

export function rateLimitBucketKey(scope: string, address: string): string {
  return `${scope}:${address}`.slice(0, 200);
}
