import { env, supabase } from './_lib.js'

async function staffUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const jwt = authHeader.slice('Bearer '.length).trim()
  if (!jwt) return null
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
      Authorization: `Bearer ${jwt}`,
    },
  })
  if (!res.ok) return null
  const user = (await res.json()) as { id?: string }
  return user.id || null
}

async function isApprovedStaff(userId: string): Promise<boolean> {
  const rows = await supabase(
    `profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
  )
  const row = rows?.[0]
  return Boolean(row?.staff_approved && !row?.disabled_at && row?.role)
}

function present(name: string): boolean {
  const v = process.env[name]
  return Boolean(v && String(v).trim())
}

function summarizeEnvPresence() {
  const checkedAt = new Date().toISOString()
  return {
    checkedAt,
    checks: [
      {
        id: 'supabase',
        label: 'Supabase',
        status: present('SUPABASE_URL') && present('SUPABASE_SERVICE_ROLE_KEY') ? 'ok' : 'missing',
        detail:
          present('SUPABASE_URL') && present('SUPABASE_SERVICE_ROLE_KEY')
            ? 'Server URL and service role are configured.'
            : 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.',
        checkedAt,
        recovery: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.',
      },
      {
        id: 'email',
        label: 'Email (Resend)',
        status: present('RESEND_API_KEY') && present('EMAIL_FROM') ? 'ok' : 'missing',
        detail:
          present('RESEND_API_KEY') && present('EMAIL_FROM')
            ? 'Resend API key and EMAIL_FROM are configured.'
            : 'RESEND_API_KEY or EMAIL_FROM is missing.',
        checkedAt,
        recovery: 'Set RESEND_API_KEY and EMAIL_FROM. Never put the API key in VITE_* variables.',
      },
      {
        id: 'scheduler',
        label: 'Scheduled publish',
        status: present('CRON_SECRET') && present('SITE_URL') ? 'ok' : 'missing',
        detail:
          present('CRON_SECRET') && present('SITE_URL')
            ? 'CRON_SECRET and SITE_URL are configured for publish-due jobs.'
            : 'CRON_SECRET or SITE_URL is missing.',
        checkedAt,
        recovery: 'Set CRON_SECRET and SITE_URL so Vercel Cron can call /api/cms-publish-due.',
      },
    ],
  }
}

/**
 * Staff-only integration status. Never returns secret values.
 * GET /api/cms-health  Authorization: Bearer <staff jwt>
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Ensure required env for auth probe exists before staff check.
    env('SUPABASE_URL')
    env('SUPABASE_SERVICE_ROLE_KEY')

    const userId = await staffUserId(req.headers?.authorization)
    if (!userId || !(await isApprovedStaff(userId))) {
      return res.status(401).json({ error: 'Staff authentication required.' })
    }

    return res.status(200).json(summarizeEnvPresence())
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Health check failed.',
    })
  }
}
