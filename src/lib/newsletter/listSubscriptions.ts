/** Newsletter list subscription helpers. Interests never imply subscriptions. */

export type SubscriptionStatus = 'subscribed' | 'unsubscribed' | 'pending';

export type ContactSubscriptionRow = {
  contactId: string;
  email: string;
  status: SubscriptionStatus;
  marketingOk: boolean;
  suppressedAt: string | null;
};

export function isEligibleListRecipient(row: ContactSubscriptionRow): boolean {
  if (!row.marketingOk || row.suppressedAt) return false;
  if (row.status !== 'subscribed') return false;
  const email = row.email.trim().toLowerCase();
  return Boolean(email);
}

/** Dedupe by email (case-insensitive); first eligible wins. */
export function selectEligibleListRecipients(
  rows: ContactSubscriptionRow[],
): Array<{ id: string; email: string }> {
  const seen = new Set<string>();
  const out: Array<{ id: string; email: string }> = [];
  for (const row of rows) {
    if (!isEligibleListRecipient(row)) continue;
    const email = row.email.trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    out.push({ id: row.contactId, email });
  }
  return out;
}

export function normalizeSubscriptionStatus(raw: unknown): SubscriptionStatus {
  if (raw === 'unsubscribed' || raw === 'pending' || raw === 'subscribed') return raw;
  return 'unsubscribed';
}
