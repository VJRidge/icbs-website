import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  authorizeNewsletterWebhook,
  decodeWebhookSigningSecret,
  verifySvixSignature,
} from './newsletterWebhookAuth';

function sign(secret: string, id: string, ts: string, body: string): string {
  const key = decodeWebhookSigningSecret(secret);
  const dig = createHmac('sha256', key).update(`${id}.${ts}.${body}`, 'utf8').digest('base64');
  return `v1,${dig}`;
}

describe('authorizeNewsletterWebhook', () => {
  it('rejects missing dedicated secret (no cron fallback)', () => {
    expect(
      authorizeNewsletterWebhook({
        secret: '',
        authorizationHeader: 'Bearer anything',
        rawBody: '{}',
      }),
    ).toBe(false);
  });

  it('accepts Bearer with dedicated secret', () => {
    expect(
      authorizeNewsletterWebhook({
        secret: 'newsletter-only-secret',
        authorizationHeader: 'Bearer newsletter-only-secret',
        rawBody: '{}',
      }),
    ).toBe(true);
    expect(
      authorizeNewsletterWebhook({
        secret: 'newsletter-only-secret',
        authorizationHeader: 'Bearer wrong',
        rawBody: '{}',
      }),
    ).toBe(false);
  });

  it('verifies Svix signatures when headers present', () => {
    const secret = 'whsec_' + Buffer.from('test-signing-key').toString('base64');
    const id = 'msg_123';
    const ts = String(Math.floor(Date.now() / 1000));
    const body = '{"type":"email.delivered"}';
    const sig = sign(secret, id, ts, body);

    expect(
      authorizeNewsletterWebhook({
        secret,
        svixId: id,
        svixTimestamp: ts,
        svixSignature: sig,
        rawBody: body,
      }),
    ).toBe(true);

    expect(
      authorizeNewsletterWebhook({
        secret,
        svixId: id,
        svixTimestamp: ts,
        svixSignature: 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        rawBody: body,
      }),
    ).toBe(false);
  });
});

describe('verifySvixSignature', () => {
  it('rejects stale timestamps', () => {
    const secret = 'plain-secret';
    const id = 'msg_1';
    const ts = String(Math.floor(Date.now() / 1000) - 60 * 60);
    const body = '{}';
    const sig = sign(secret, id, ts, body);
    expect(
      verifySvixSignature({
        secret,
        svixId: id,
        svixTimestamp: ts,
        svixSignature: sig,
        rawBody: body,
      }),
    ).toBe(false);
  });
});
