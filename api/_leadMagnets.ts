/**
 * Lead-magnet delivery enqueue + private URL signing (service role).
 * Does not write kit `subscribers`. Plan helpers mirror src/lib/leadMagnets/deliveryJobs.ts.
 */
import { env, supabase } from './_lib.js'
import { absoluteSignedStorageUrl, PRIVATE_MEDIA_BUCKET } from './_privateMedia.js'

function buildDeliveryIdempotencyKey(contactId: string, leadMagnetId: string, versionId: string): string | null {
  const c = contactId.trim()
  const m = leadMagnetId.trim()
  const v = versionId.trim()
  if (!c || !m || !v) return null
  return `${c}:${m}:${v}`.slice(0, 200)
}

function planEnqueue(input: {
  contactId: string | null | undefined
  leadMagnetId: string | null | undefined
  versionId: string | null | undefined
  marketingOk: boolean
  suppressedAt: string | null | undefined
}): { action: 'enqueue'; idempotencyKey: string } | { action: 'skip'; reason: string } {
  if (!input.leadMagnetId?.trim()) return { action: 'skip', reason: 'no_magnet' }
  if (!input.contactId?.trim() || !input.versionId?.trim()) return { action: 'skip', reason: 'invalid_ids' }
  if (!input.marketingOk || input.suppressedAt) return { action: 'skip', reason: 'suppressed' }
  const key = buildDeliveryIdempotencyKey(input.contactId, input.leadMagnetId, input.versionId)
  if (!key) return { action: 'skip', reason: 'invalid_ids' }
  return { action: 'enqueue', idempotencyKey: key }
}

export function retryDelaySeconds(attemptsAfterFailure: number): number {
  const n = Math.max(1, Math.floor(attemptsAfterFailure))
  return Math.min(3600, 60 * 2 ** (n - 1))
}

export function nextAttemptAtIso(attemptsAfterFailure: number, now = new Date()): string {
  return new Date(now.getTime() + retryDelaySeconds(attemptsAfterFailure) * 1000).toISOString()
}

export function shouldMarkFailed(attempts: number, maxAttempts: number): boolean {
  return attempts >= Math.max(1, maxAttempts)
}

export type EnqueueLeadMagnetArgs = {
  contactId: string
  leadMagnetId: string
  formId?: string | null
  submissionId?: string | null
  marketingOk: boolean
  suppressedAt: string | null
}

export async function enqueueLeadMagnetDelivery(args: EnqueueLeadMagnetArgs): Promise<{
  enqueued: boolean
  reason?: string
  jobId?: string
}> {
  const magnets = await supabase(
    `lead_magnets?id=eq.${encodeURIComponent(args.leadMagnetId)}&status=eq.published&select=id,active_version_id&limit=1`,
  )
  const magnet = magnets?.[0]
  const versionId = typeof magnet?.active_version_id === 'string' ? magnet.active_version_id : null
  const decision = planEnqueue({
    contactId: args.contactId,
    leadMagnetId: args.leadMagnetId,
    versionId,
    marketingOk: args.marketingOk,
    suppressedAt: args.suppressedAt,
  })
  if (decision.action === 'skip') {
    return { enqueued: false, reason: decision.reason }
  }

  try {
    const created = await supabase('delivery_jobs', {
      method: 'POST',
      prefer: 'return=representation,resolution=ignore-duplicates',
      body: JSON.stringify({
        idempotency_key: decision.idempotencyKey,
        contact_id: args.contactId,
        lead_magnet_id: args.leadMagnetId,
        lead_magnet_version_id: versionId,
        form_id: args.formId ?? null,
        submission_id: args.submissionId ?? null,
        status: 'pending',
        next_attempt_at: new Date().toISOString(),
      }),
    })
    const row = Array.isArray(created) ? created[0] : created
    if (!row?.id) {
      return { enqueued: false, reason: 'duplicate' }
    }
    return { enqueued: true, jobId: row.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('23505') || msg.toLowerCase().includes('duplicate')) {
      return { enqueued: false, reason: 'duplicate' }
    }
    throw err
  }
}

export async function signPrivateMediaPath(path: string, expiresIn = 3600): Promise<string> {
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  const signRes = await fetch(
    `${env('SUPABASE_URL')}/storage/v1/object/sign/${encodeURIComponent(PRIVATE_MEDIA_BUCKET)}/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expiresIn }),
    },
  )
  if (!signRes.ok) {
    throw new Error(`Could not sign private media (${signRes.status})`)
  }
  const payload = (await signRes.json()) as { signedURL?: string; signedUrl?: string }
  const signed = payload.signedURL || payload.signedUrl
  if (!signed) throw new Error('Storage sign response missing signedURL')
  return absoluteSignedStorageUrl(env('SUPABASE_URL'), signed)
}
