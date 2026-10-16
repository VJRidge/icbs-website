import { supabase } from './_lib.js'
import { suppressContactByToken } from './_contacts.js'
import { isPrefsToken, normalizePrefsAction } from '../src/lib/newsletter/prefsToken.js'

async function contactByToken(token: string) {
  const rows = await supabase(
    `contacts?unsubscribe_token=eq.${encodeURIComponent(token)}&select=id,email,first_name,marketing_ok,suppressed_at,unsubscribe_token&limit=1`,
  )
  return rows?.[0] ?? null
}

async function loadPrefs(token: string) {
  const contact = await contactByToken(token)
  if (!contact) return null
  const lists = await supabase(
    'newsletter_lists?is_active=eq.true&select=id,name&order=name.asc',
  )
  const subs = await supabase(
    `contact_subscriptions?contact_id=eq.${encodeURIComponent(contact.id)}&select=list_id,status`,
  )
  const statusByList = new Map(
    (subs || []).map((row: { list_id?: string; status?: string }) => [String(row.list_id), row.status]),
  )
  return {
    email: contact.email,
    firstName: contact.first_name,
    suppressed: Boolean(contact.suppressed_at),
    lists: (lists || []).map((list: { id: string; name: string }) => ({
      id: list.id,
      name: list.name,
      status: statusByList.get(list.id) === 'subscribed' ? 'subscribed' : 'unsubscribed',
    })),
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const token = String(req.query?.token || body.token || '').trim()
  if (!isPrefsToken(token)) return res.status(400).json({ error: 'That preferences link is not valid.' })

  try {
    if (req.method === 'GET') {
      const prefs = await loadPrefs(token)
      if (!prefs) return res.status(404).json({ error: 'That preferences link is not valid.' })
      return res.status(200).json({ ok: true, ...prefs })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    if (body.suppressAll === true) {
      const result = await suppressContactByToken(token)
      if (result !== 'ok') return res.status(400).json({ error: 'That preferences link is not valid.' })
      const prefs = await loadPrefs(token)
      return res.status(200).json({ ok: true, ...prefs })
    }

    const action = normalizePrefsAction(body.action)
    const listId = typeof body.listId === 'string' ? body.listId.trim() : ''
    if (!action || !isPrefsToken(listId)) {
      return res.status(400).json({ error: 'Choose a list and subscribe or unsubscribe.' })
    }

    const contact = await contactByToken(token)
    if (!contact) return res.status(404).json({ error: 'That preferences link is not valid.' })

    const now = new Date().toISOString()
    const status = action === 'subscribe' ? 'subscribed' : 'unsubscribed'
    await supabase('contact_subscriptions?on_conflict=contact_id,list_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify({
        contact_id: contact.id,
        list_id: listId,
        status,
        subscribed_at: action === 'subscribe' ? now : null,
        unsubscribed_at: action === 'unsubscribe' ? now : null,
        updated_at: now,
      }),
    })

    if (action === 'subscribe' && contact.suppressed_at) {
      await supabase(`contacts?id=eq.${contact.id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({
          suppressed_at: null,
          marketing_ok: true,
          last_consented_at: now,
        }),
      })
    }

    const prefs = await loadPrefs(token)
    return res.status(200).json({ ok: true, ...prefs })
  } catch (err) {
    console.error('email prefs failed', err)
    return res.status(500).json({ error: 'Could not update preferences.' })
  }
}
