import { describe, expect, it } from 'vitest';
import { isDisposableEmailDomain } from './disposableEmailDomains';
import {
  honeypotTriggered,
  normalizeSignupEmail,
  passwordMeetsStaffSignupRules,
  staffSignupPasswordError,
} from './staffSignupRules';

describe('staffSignupRules', () => {
  it('normalizes valid emails', () => {
    expect(normalizeSignupEmail('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(normalizeSignupEmail('nope')).toBeNull();
  });

  it('requires a strong password', () => {
    expect(passwordMeetsStaffSignupRules('Short1')).toBe(false);
    expect(passwordMeetsStaffSignupRules('alllowercase1')).toBe(false);
    expect(passwordMeetsStaffSignupRules('GoodPass12')).toBe(true);
    expect(staffSignupPasswordError('weak')).toMatch(/at least/i);
  });

  it('flags honeypot and disposable domains', () => {
    expect(honeypotTriggered({ website: 'http://spam' })).toBe(true);
    expect(honeypotTriggered({ website: '' })).toBe(false);
    expect(isDisposableEmailDomain('bot@mailinator.com')).toBe(true);
    expect(isDisposableEmailDomain('vetta@vettajimale.tech')).toBe(false);
  });
});
