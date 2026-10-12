/** Compact blocklist of throwaway mailbox domains used by signup bots. */

const DISPOSABLE = new Set(
  [
    'mailinator.com',
    'guerrillamail.com',
    'guerrillamail.net',
    'sharklasers.com',
    'grr.la',
    'yopmail.com',
    'tempmail.com',
    'temp-mail.org',
    '10minutemail.com',
    'trashmail.com',
    'discard.email',
    'getnada.com',
    'maildrop.cc',
    'fakeinbox.com',
    'mailnesia.com',
    'moakt.com',
    'emailondeck.com',
    'throwaway.email',
    'tempail.com',
    'dispostable.com',
    'mailcatch.com',
    'spam4.me',
    'bccto.me',
    'mintemail.com',
    'mytemp.email',
  ].map((d) => d.toLowerCase()),
);

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

export function isDisposableEmailDomain(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return true;
  if (DISPOSABLE.has(domain)) return true;
  // Catch common subdomain patterns: foo.mailinator.com
  for (const blocked of DISPOSABLE) {
    if (domain.endsWith(`.${blocked}`)) return true;
  }
  return false;
}
