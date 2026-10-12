/** Pure rules for open studio signup (no invite / no manual approve). */

export const STAFF_SIGNUP_MIN_PASSWORD = 10;
export const STAFF_SIGNUP_HONEYPOT_KEY = 'website';

const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /\d/;

export function normalizeSignupEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > 200) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export function passwordMeetsStaffSignupRules(password: unknown): boolean {
  if (typeof password !== 'string') return false;
  if (password.length < STAFF_SIGNUP_MIN_PASSWORD || password.length > 200) return false;
  if (/\s/.test(password)) return false;
  return HAS_LOWER.test(password) && HAS_UPPER.test(password) && HAS_DIGIT.test(password);
}

export function staffSignupPasswordError(password: unknown): string | null {
  if (typeof password !== 'string' || !password) return 'Enter a password.';
  if (password.length < STAFF_SIGNUP_MIN_PASSWORD) {
    return `Password must be at least ${STAFF_SIGNUP_MIN_PASSWORD} characters.`;
  }
  if (password.length > 200) return 'Password is too long.';
  if (/\s/.test(password)) return 'Password cannot contain spaces.';
  if (!HAS_LOWER.test(password) || !HAS_UPPER.test(password) || !HAS_DIGIT.test(password)) {
    return 'Password needs upper and lower case letters and a number.';
  }
  return null;
}

export function honeypotTriggered(body: Record<string, unknown>, key = STAFF_SIGNUP_HONEYPOT_KEY): boolean {
  const raw = body[key];
  return typeof raw === 'string' ? Boolean(raw.trim()) : Boolean(raw);
}
