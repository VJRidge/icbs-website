/** Pure newsletter recipient / dedupe helpers. No DB I/O. */

export type NewsletterContact = {
  id: string;
  email: string;
  marketing_ok: boolean;
  suppressed_at: string | null;
};

export function isEligibleNewsletterRecipient(contact: NewsletterContact): boolean {
  if (!contact.id || !contact.email?.trim()) return false;
  if (!contact.marketing_ok) return false;
  if (contact.suppressed_at) return false;
  return true;
}

export function buildNewsletterIdempotencyKey(issueId: string, contactId: string): string | null {
  const i = issueId.trim();
  const c = contactId.trim();
  if (!i || !c) return null;
  return `${i}:${c}`.slice(0, 200);
}

/** Eligible contacts, one job per email (first contact wins). */
export function selectNewsletterRecipients(contacts: NewsletterContact[]): NewsletterContact[] {
  const seen = new Set<string>();
  const out: NewsletterContact[] = [];
  for (const contact of contacts) {
    if (!isEligibleNewsletterRecipient(contact)) continue;
    const email = contact.email.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({ ...contact, email });
  }
  return out;
}

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

/** Map Resend-style event types to a suppress action. */
export function shouldSuppressFromProviderEvent(eventType: string): boolean {
  const t = eventType.trim().toLowerCase();
  return (
    t === 'email.bounced' ||
    t === 'email.complained' ||
    t === 'email.failed' ||
    t === 'contact.unsubscribed'
  );
}

export function newsletterModuleTouchesSubscribers(): boolean {
  return false;
}
