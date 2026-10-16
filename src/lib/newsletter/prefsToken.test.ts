import { describe, expect, it } from 'vitest';
import { isPrefsToken, normalizePrefsAction } from './prefsToken';

describe('prefsToken', () => {
  it('accepts a UUID token and subscribe/unsubscribe actions', () => {
    expect(isPrefsToken('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true);
    expect(isPrefsToken('nope')).toBe(false);
    expect(normalizePrefsAction('unsubscribe')).toBe('unsubscribe');
    expect(normalizePrefsAction('subscribe')).toBe('subscribe');
    expect(normalizePrefsAction('other')).toBeNull();
  });
});
