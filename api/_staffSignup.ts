/** Studio signup validation for Vercel API routes. Mirrors src/lib/auth/*. */

export const STAFF_SIGNUP_MIN_PASSWORD = 10
export const STAFF_SIGNUP_HONEYPOT_KEY = 'website'

const HAS_LOWER = /[a-z]/
const HAS_UPPER = /[A-Z]/
const HAS_DIGIT = /\d/

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
)

export function normalizeSignupEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (!email || email.length > 200) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null
  return email
}

export function staffSignupPasswordError(password: unknown): string | null {
  if (typeof password !== 'string' || !password) return 'Enter a password.'
  if (password.length < STAFF_SIGNUP_MIN_PASSWORD) {
    return `Password must be at least ${STAFF_SIGNUP_MIN_PASSWORD} characters.`
  }
  if (password.length > 200) return 'Password is too long.'
  if (/\s/.test(password)) return 'Password cannot contain spaces.'
  if (!HAS_LOWER.test(password) || !HAS_UPPER.test(password) || !HAS_DIGIT.test(password)) {
    return 'Password needs upper and lower case letters and a number.'
  }
  return null
}

export function honeypotTriggered(
  body: Record<string, unknown>,
  key = STAFF_SIGNUP_HONEYPOT_KEY,
): boolean {
  const raw = body[key]
  return typeof raw === 'string' ? Boolean(raw.trim()) : Boolean(raw)
}

export function isDisposableEmailDomain(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at < 0) return true
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain) return true
  if (DISPOSABLE.has(domain)) return true
  for (const blocked of DISPOSABLE) {
    if (domain.endsWith(`.${blocked}`)) return true
  }
  return false
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp: string,
  secret: string,
): Promise<boolean> {
  if (!secret || !token) return false
  try {
    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    if (remoteIp && remoteIp !== 'local') body.set('remoteip', remoteIp)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) return false
    const data = (await res.json()) as { success?: boolean }
    return Boolean(data.success)
  } catch {
    return false
  }
}
