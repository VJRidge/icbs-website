/** Pure newsletter webhook auth (Bearer + optional Resend/Svix signatures). */

import { createHmac, timingSafeEqual } from 'node:crypto';

const SVIX_TOLERANCE_SEC = 5 * 60;

export type NewsletterWebhookAuthInput = {
  /** Dedicated secret only — never fall back to CRON_SECRET. */
  secret: string | undefined | null;
  authorizationHeader?: string | null;
  customSecretHeader?: string | null;
  svixId?: string | null;
  svixTimestamp?: string | null;
  svixSignature?: string | null;
  rawBody: string;
  nowSec?: number;
};

function timingSafeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function bearerToken(authorizationHeader: string | null | undefined): string {
  if (!authorizationHeader) return '';
  if (authorizationHeader.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length).trim();
  }
  return '';
}

/** Decode Resend/Svix secret (`whsec_…` base64) or use raw UTF-8 bytes. */
export function decodeWebhookSigningSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  if (trimmed.startsWith('whsec_')) {
    return Buffer.from(trimmed.slice('whsec_'.length), 'base64');
  }
  return Buffer.from(trimmed, 'utf8');
}

/**
 * Verify Svix-style signatures (Resend webhooks).
 * Accepts any `v1,<base64>` entry in the comma-separated header.
 */
export function verifySvixSignature(opts: {
  secret: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  rawBody: string;
  nowSec?: number;
}): boolean {
  const id = opts.svixId.trim();
  const ts = opts.svixTimestamp.trim();
  const sigHeader = opts.svixSignature.trim();
  if (!id || !ts || !sigHeader || !opts.secret.trim()) return false;

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > SVIX_TOLERANCE_SEC) return false;

  const key = decodeWebhookSigningSecret(opts.secret);
  const signedContent = `${id}.${ts}.${opts.rawBody}`;
  const expected = createHmac('sha256', key).update(signedContent, 'utf8').digest();

  for (const part of sigHeader.split(' ')) {
    const [version, b64] = part.split(',', 2);
    if (version !== 'v1' || !b64) continue;
    let provided: Buffer;
    try {
      provided = Buffer.from(b64, 'base64');
    } catch {
      continue;
    }
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return true;
    }
  }
  return false;
}

export function authorizeNewsletterWebhook(input: NewsletterWebhookAuthInput): boolean {
  const secret = (input.secret || '').trim();
  if (!secret) return false;

  const hasSvix =
    Boolean(input.svixId?.trim()) &&
    Boolean(input.svixTimestamp?.trim()) &&
    Boolean(input.svixSignature?.trim());

  if (hasSvix) {
    return verifySvixSignature({
      secret,
      svixId: String(input.svixId),
      svixTimestamp: String(input.svixTimestamp),
      svixSignature: String(input.svixSignature),
      rawBody: input.rawBody,
      nowSec: input.nowSec,
    });
  }

  const provided =
    bearerToken(input.authorizationHeader) ||
    (typeof input.customSecretHeader === 'string' ? input.customSecretHeader.trim() : '');
  if (!provided) return false;
  return timingSafeStringEqual(provided, secret);
}
