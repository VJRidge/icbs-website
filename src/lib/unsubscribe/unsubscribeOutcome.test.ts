import { describe, expect, it } from 'vitest';
import { unsubscribeGetLocation } from './unsubscribeOutcome';

describe('unsubscribeGetLocation', () => {
  it('sends a successful GET to the branded confirmation page', () => {
    expect(unsubscribeGetLocation({ ok: true, list: 'kit' })).toBe('/unsubscribed?list=kit');
    expect(unsubscribeGetLocation({ ok: true, list: 'contacts' })).toBe('/unsubscribed?list=contacts');
  });

  it('sends a bad token to the error page', () => {
    expect(unsubscribeGetLocation({ ok: false, invalid: true, list: 'kit' })).toBe(
      '/unsubscribe-error?reason=invalid',
    );
  });

  it('sends a server failure to the error page', () => {
    expect(unsubscribeGetLocation({ ok: false, list: 'contacts' })).toBe('/unsubscribe-error?reason=failed');
  });
});
