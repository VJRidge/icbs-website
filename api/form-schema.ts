/**
 * GET /api/form-schema?slug=lead-capture
 * Public published form field schema for the signup renderer.
 */
import { supabase } from './_lib.js'

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Cache-Control', 'public, max-age=60')
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const slug =
    typeof req.query?.slug === 'string'
      ? req.query.slug.trim().toLowerCase().slice(0, 80)
      : 'lead-capture'
  if (!slug) return res.status(400).json({ error: 'slug is required.' })

  try {
    const rows = await supabase(
      `forms?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=slug,title,version,fields,settings&limit=1`,
    )
    const row = rows?.[0]
    if (!row) return res.status(404).json({ error: 'Form not found.' })

    // Mirror normalize without importing TS path that may not bundle — inline minimal shape.
    const fields = Array.isArray(row.fields) ? row.fields : []
    const settings =
      row.settings && typeof row.settings === 'object' ? row.settings : {}

    return res.status(200).json({
      ok: true,
      slug: row.slug,
      title: row.title,
      version: row.version ?? 1,
      fields,
      // Omit honeypotKey from the public schema (SUP-008). Client + server share a constant.
      settings: {
        successMessage:
          typeof (settings as { successMessage?: string }).successMessage === 'string'
            ? (settings as { successMessage: string }).successMessage
            : undefined,
        consentText:
          typeof (settings as { consentText?: string }).consentText === 'string'
            ? (settings as { consentText: string }).consentText
            : undefined,
      },
    })
  } catch (err) {
    console.error('form-schema failed', err)
    return res.status(500).json({ error: 'Could not load form.' })
  }
}
