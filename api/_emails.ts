import { escapeHtml } from './_lib.js'

// Email 1: delivers the kit. The Prime Directive block is copied from the book (Chapter 8).
// DRAFT WORDING: review the two short lines around it before launch.
const PRIME_DIRECTIVE = `PRIME DIRECTIVE — read twice:
- Existing behavior must not break.
- Prefer additive changes and new files.
- Do not refactor unrelated code.
- If you think a core file must change, STOP and ask first.
- Do not change brand colors/tokens unless I ask.
- If you can run a command yourself, do it — except deleting data, destructive
  database changes, or anything in production. Ask me first on those.`

export function newsletterIssueEmail(opts: {
  firstName: string
  subject: string
  previewText: string
  bodyHtml: string
  bodyText: string
  unsubscribeUrl: string
  postalAddress: string
}) {
  const name = opts.firstName.trim() || 'there'
  const subject = opts.subject.trim() || 'Update from VettaJimale.Tech'
  const preview = opts.previewText.trim()
  const textBody = opts.bodyText.trim() || opts.bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const text = `Hi ${name},

${preview ? `${preview}\n\n` : ''}${textBody}

Unsubscribe: ${opts.unsubscribeUrl}
${opts.postalAddress}`

  const html = `<div style="font-family:Georgia,serif;font-size:17px;line-height:26px;color:#0E0D0B;max-width:560px">
${preview ? `<p style="font-size:14px;color:#666">${escapeHtml(preview)}</p>` : ''}
<p>Hi ${escapeHtml(name)},</p>
${opts.bodyHtml || `<p>${escapeHtml(textBody)}</p>`}
<p style="font-size:13px;color:#666;margin-top:28px"><a href="${opts.unsubscribeUrl}" style="color:#666">Unsubscribe</a><br>${escapeHtml(opts.postalAddress)}</p>
</div>`
  return { subject, text, html }
}

export function leadMagnetEmail(opts: {
  firstName: string
  title: string
  downloadUrl: string
  unsubscribeUrl: string
  postalAddress: string
}) {
  const name = opts.firstName.trim() || 'there'
  const title = opts.title.trim() || 'your download'
  const subject = `Your download: ${title}`
  const text = `Hi ${name},

Here's your download — ${title}:
${opts.downloadUrl}

This link is personal and expires. If it stops working, reply to this email.

Unsubscribe: ${opts.unsubscribeUrl}
${opts.postalAddress}`

  const html = `<div style="font-family:Georgia,serif;font-size:17px;line-height:26px;color:#0E0D0B;max-width:560px">
<p>Hi ${escapeHtml(name)},</p>
<p>Here's your download — <strong>${escapeHtml(title)}</strong>:</p>
<p><a href="${opts.downloadUrl}" style="display:inline-block;background:#FDC20F;color:#0E0D0B;font-weight:bold;padding:12px 18px;text-decoration:none;border:2px solid #0E0D0B">Download</a></p>
<p style="font-size:14px;color:#666">This link is personal and expires. If it stops working, reply to this email.</p>
<p style="font-size:13px;color:#666"><a href="${opts.unsubscribeUrl}" style="color:#666">Unsubscribe</a><br>${escapeHtml(opts.postalAddress)}</p>
</div>`
  return { subject, text, html }
}

export function kitEmail(opts: { firstName: string; kitUrl: string; unsubscribeUrl: string; postalAddress: string }) {
  const name = opts.firstName.trim() || 'there'
  const subject = 'Your I Call BS Free Starter Kit'
  const text = `Hi ${name},

Here's your Free Starter Kit:
${opts.kitUrl}

This is the honest version of "build an app with AI." No fairy tales. No thirty-minute miracles.

One thing you can use today, from the kit's Toolkit. Paste it at the top of risky prompts:

${PRIME_DIRECTIVE}

Vetta Jimale

Unsubscribe: ${opts.unsubscribeUrl}
${opts.postalAddress}`

  const html = `<div style="font-family:Georgia,serif;font-size:17px;line-height:26px;color:#0E0D0B;max-width:560px">
<p>Hi ${escapeHtml(name)},</p>
<p>Here's your Free Starter Kit:</p>
<p><a href="${opts.kitUrl}" style="display:inline-block;background:#FDC20F;color:#0E0D0B;font-weight:bold;padding:12px 18px;text-decoration:none;border:2px solid #0E0D0B">Download the free kit</a></p>
<p>This is the honest version of “build an app with AI.” No fairy tales. No thirty-minute miracles.</p>
<p>One thing you can use today, from the kit's Toolkit. Paste it at the top of risky prompts:</p>
<pre style="font-family:Consolas,Menlo,monospace;font-size:13px;line-height:20px;background:#F4EFE3;border:2px solid #0E0D0B;padding:14px;white-space:pre-wrap">${escapeHtml(PRIME_DIRECTIVE)}</pre>
<p>Vetta Jimale</p>
<p style="font-size:13px;color:#666"><a href="${opts.unsubscribeUrl}" style="color:#666">Unsubscribe</a><br>${escapeHtml(opts.postalAddress)}</p>
</div>`
  return { subject, text, html }
}
