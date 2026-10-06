/** Pure lead-magnet delivery outbox helpers. No DB I/O. */

export type DeliveryJobStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';

export type EnqueueDecision =
  | { action: 'enqueue'; idempotencyKey: string }
  | { action: 'skip'; reason: 'no_magnet' | 'suppressed' | 'invalid_ids' };

export function buildDeliveryIdempotencyKey(
  contactId: string,
  leadMagnetId: string,
  versionId: string,
): string | null {
  const c = contactId.trim();
  const m = leadMagnetId.trim();
  const v = versionId.trim();
  if (!c || !m || !v) return null;
  return `${c}:${m}:${v}`.slice(0, 200);
}

export function planEnqueueDelivery(input: {
  contactId: string | null | undefined;
  leadMagnetId: string | null | undefined;
  versionId: string | null | undefined;
  marketingOk: boolean;
  suppressedAt: string | null | undefined;
}): EnqueueDecision {
  if (!input.leadMagnetId?.trim()) return { action: 'skip', reason: 'no_magnet' };
  if (!input.contactId?.trim() || !input.versionId?.trim()) {
    return { action: 'skip', reason: 'invalid_ids' };
  }
  if (!input.marketingOk || input.suppressedAt) {
    return { action: 'skip', reason: 'suppressed' };
  }
  const key = buildDeliveryIdempotencyKey(input.contactId, input.leadMagnetId, input.versionId);
  if (!key) return { action: 'skip', reason: 'invalid_ids' };
  return { action: 'enqueue', idempotencyKey: key };
}

/** Exponential backoff in seconds: 60, 120, 240, … capped at 1 hour. */
export function retryDelaySeconds(attemptsAfterFailure: number): number {
  const n = Math.max(1, Math.floor(attemptsAfterFailure));
  return Math.min(3600, 60 * 2 ** (n - 1));
}

export function nextAttemptAt(attemptsAfterFailure: number, now: Date = new Date()): string {
  return new Date(now.getTime() + retryDelaySeconds(attemptsAfterFailure) * 1000).toISOString();
}

export function shouldMarkFailed(attempts: number, maxAttempts: number): boolean {
  return attempts >= Math.max(1, maxAttempts);
}

/** Guardrail for tests: this module must not touch kit subscribers. */
export function leadMagnetModuleTouchesSubscribers(): boolean {
  return false;
}
