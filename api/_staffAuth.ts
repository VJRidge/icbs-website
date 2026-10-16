import { env } from './_lib.js'

const RESEND_ROLES = new Set(['owner', 'admin', 'editor'])

export async function staffUserIdFromAuth(authHeader: string | undefined): Promise<string | null> {
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

export async function isApprovedEditor(userId: string): Promise<boolean> {
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  const res = await fetch(
    `${env('SUPABASE_URL')}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=staff_approved,disabled_at,role&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    },
  )
  if (!res.ok) return false
  const rows = (await res.json()) as Array<{ staff_approved?: boolean; disabled_at?: string | null; role?: string }>
  const row = rows?.[0]
  return Boolean(row?.staff_approved && !row?.disabled_at && RESEND_ROLES.has(String(row?.role || '')))
}
