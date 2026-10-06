import { describe, expect, it } from 'vitest';
import {
  buildDeliveryIdempotencyKey,
  leadMagnetModuleTouchesSubscribers,
  nextAttemptAt,
  planEnqueueDelivery,
  retryDelaySeconds,
  shouldMarkFailed,
} from './deliveryJobs';

describe('buildDeliveryIdempotencyKey', () => {
  it('builds a stable contact:magnet:version key', () => {
    expect(buildDeliveryIdempotencyKey('c1', 'm1', 'v1')).toBe('c1:m1:v1');
    expect(buildDeliveryIdempotencyKey('', 'm1', 'v1')).toBeNull();
  });
});

describe('planEnqueueDelivery', () => {
  it('enqueues when marketing is ok and ids are present', () => {
    const plan = planEnqueueDelivery({
      contactId: 'c1',
      leadMagnetId: 'm1',
      versionId: 'v1',
      marketingOk: true,
      suppressedAt: null,
    });
    expect(plan).toEqual({ action: 'enqueue', idempotencyKey: 'c1:m1:v1' });
  });

  it('skips when suppressed or marketing off', () => {
    expect(
      planEnqueueDelivery({
        contactId: 'c1',
        leadMagnetId: 'm1',
        versionId: 'v1',
        marketingOk: false,
        suppressedAt: null,
      }),
    ).toEqual({ action: 'skip', reason: 'suppressed' });
    expect(
      planEnqueueDelivery({
        contactId: 'c1',
        leadMagnetId: 'm1',
        versionId: 'v1',
        marketingOk: true,
        suppressedAt: '2026-10-05T00:00:00.000Z',
      }),
    ).toEqual({ action: 'skip', reason: 'suppressed' });
  });

  it('skips when no magnet configured', () => {
    expect(
      planEnqueueDelivery({
        contactId: 'c1',
        leadMagnetId: null,
        versionId: 'v1',
        marketingOk: true,
        suppressedAt: null,
      }),
    ).toEqual({ action: 'skip', reason: 'no_magnet' });
  });
});

describe('retry / failure', () => {
  it('backs off and fails at max attempts', () => {
    expect(retryDelaySeconds(1)).toBe(60);
    expect(retryDelaySeconds(2)).toBe(120);
    expect(retryDelaySeconds(10)).toBe(3600);
    expect(shouldMarkFailed(4, 5)).toBe(false);
    expect(shouldMarkFailed(5, 5)).toBe(true);
    const at = nextAttemptAt(1, new Date('2026-10-05T12:00:00.000Z'));
    expect(at).toBe('2026-10-05T12:01:00.000Z');
    expect(leadMagnetModuleTouchesSubscribers()).toBe(false);
  });
});
