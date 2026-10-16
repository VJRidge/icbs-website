import { describe, expect, it } from 'vitest';
import { kitSubscribeNeedsConfirm, shouldClearKitUnsubscribe } from './kitResubscribe';

describe('kitResubscribe', () => {
  it('lets a first-time or still-subscribed signup clear the unsubscribe stamp', () => {
    expect(kitSubscribeNeedsConfirm(null, false)).toBe(false);
    expect(shouldClearKitUnsubscribe(null, false)).toBe(true);
    expect(shouldClearKitUnsubscribe(undefined, false)).toBe(true);
  });

  it('blocks a silent resubscribe after they left the list', () => {
    expect(kitSubscribeNeedsConfirm('2026-01-01T00:00:00.000Z', false)).toBe(true);
    expect(shouldClearKitUnsubscribe('2026-01-01T00:00:00.000Z', false)).toBe(false);
  });

  it('clears unsubscribe only when they confirm', () => {
    expect(kitSubscribeNeedsConfirm('2026-01-01T00:00:00.000Z', true)).toBe(false);
    expect(shouldClearKitUnsubscribe('2026-01-01T00:00:00.000Z', true)).toBe(true);
  });
});
