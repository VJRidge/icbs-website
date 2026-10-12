/**
 * POST /api/staff-signup
 * Studio signup with bot friction. Creates Auth users via service role only —
 * disable public Auth signup in Supabase. New profiles stay staff_approved=false
 * until an owner approves on Site Users. Email confirmation required before /admin.
 */
import { env, escapeHtml, sendTransactionalEmail, supabase } from './_lib.js'
import { rateLimited, requestAddress } from './_rateLimit.js'
import {
  honeypotTriggered,
  isDisposableEmailDomain,
  normalizeSignupEmail,
  staffSignupPasswordError,
  verifyTurnstileToken,
} from './_staffSignup.js'

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}

async function durableSignupLimited(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/rpc/rate_limit_hit`, {
      method: 'POST',
      headers: {
        apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
        Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_key: key,
        p_window_seconds: 900,
        p_max_hits: 5,
      }),
    })
    if (!res.ok) return rateLimited(key)
    return Boolean(await res.json())
  } catch {
    return rateLimited(key)
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const address = requestAddress(req)
  if (await durableSignupLimited(`staff-signup:${address}`)) {
    return res.status(429).json({ error: 'Too many signup attempts. Try again in a few minutes.' })
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  if (honeypotTriggered(body)) {
    return res.status(200).json({ ok: true, message: 'Account created. Confirm your email, then sign in.' })
  }

  const email = normalizeSignupEmail(body.email)
  if (!email) {
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }
  if (isDisposableEmailDomain(email)) {
    return res.status(400).json({ error: 'Use a permanent email address (throwaway inboxes are blocked).' })
  }

  const passwordError = staffSignupPasswordError(body.password)
  if (passwordError) {
    return res.status(400).json({ error: passwordError })
  }
  const password = String(body.password)

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || ''
  const production =
    process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
  if (!turnstileSecret) {
    if (production) {
      return res.status(503).json({ error: 'Signup temporarily unavailable. Try again later.' })
    }
  } else {
    const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : ''
    const ok = await verifyTurnstileToken(turnstileToken, address, turnstileSecret)
    if (!ok) {
      return res.status(400).json({ error: 'CAPTCHA failed. Refresh and try again.' })
    }
  }

  const displayName =
    typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 80) : ''
  const name = displayName || email.split('@')[0] || 'there'

  try {
    env('SUPABASE_URL')
    env('SUPABASE_SERVICE_ROLE_KEY')
    env('RESEND_API_KEY')
    const site = env('SITE_URL').replace(/\/+$/, '')

    const linkRes = await fetch(`${env('SUPABASE_URL')}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
        Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'signup',
        email,
        password,
        data: { display_name: name },
        redirect_to: `${site}/admin`,
      }),
    })

    if (!linkRes.ok) {
      const errBody = (await linkRes.json().catch(() => ({}))) as {
        msg?: string
        message?: string
        error_description?: string
      }
      const msg = errBody.msg || errBody.message || errBody.error_description || ''
      if (/already|exists|registered/i.test(msg)) {
        return res.status(409).json({ error: 'An account with that email already exists. Sign in instead.' })
      }
      console.error('staff-signup generate_link failed', linkRes.status, msg)
      return res.status(400).json({ error: 'Could not create account. Try a different email or password.' })
    }

    const linkPayload = (await linkRes.json()) as {
      id?: string
      user?: { id?: string }
      properties?: { action_link?: string; hashed_token?: string }
      action_link?: string
    }
    const userId = linkPayload.user?.id || linkPayload.id || ''
    const actionLink =
      linkPayload.properties?.action_link ||
      linkPayload.action_link ||
      ''

    if (!actionLink) {
      console.error('staff-signup missing action_link', linkPayload)
      return res.status(500).json({ error: 'Could not send confirmation email. Please try again.' })
    }

    if (userId) {
      try {
        // Keep staff_approved false — owner must approve (SUP-001).
        await supabase(`profiles?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: JSON.stringify({
            staff_approved: false,
            email,
            display_name: name,
          }),
        })
      } catch (err) {
        console.error('staff-signup profile patch failed', err)
      }
    }

    await sendTransactionalEmail({
      to: email,
      subject: 'Confirm your VettaJimale.Tech studio account',
      text: `Hi ${name},

Confirm your studio account:
${actionLink}

If you did not request this, ignore this email.`,
      html: `<div style="font-family:Georgia,serif;font-size:17px;line-height:26px;color:#0E0D0B;max-width:560px">
<p>Hi ${escapeHtml(name)},</p>
<p><a href="${escapeHtml(actionLink)}" style="color:#0B3D91">Confirm your studio account</a></p>
<p style="font-size:14px;color:#666">If you did not request this, ignore this email.</p>
</div>`,
    })

    return res.status(200).json({
      ok: true,
      message: 'Account created. Confirm your email, then sign in.',
    })
  } catch (err) {
    console.error('staff-signup failed', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again in a minute.' })
  }
}
