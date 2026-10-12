import DOMPurify from 'dompurify';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Open compiled newsletter HTML in a new tab (staff preview). */
export function openNewsletterHtmlPreview(subject: string, bodyHtml: string): void {
  const safeBody = DOMPurify.sanitize(bodyHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  });
  const title = subject.trim() || 'Newsletter preview';
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    throw new Error('Pop-up blocked. Allow pop-ups to preview the email.');
  }
  w.document.open();
  w.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; background: #f3ede3; color: #0e0d0b; font-family: Georgia, 'Times New Roman', serif; }
    .bar { background: #0e0d0b; color: #f4efe3; font: 12px/1.4 system-ui, sans-serif; padding: 10px 16px; letter-spacing: 0.06em; text-transform: uppercase; }
    .wrap { max-width: 640px; margin: 24px auto; padding: 0 16px 48px; }
  </style>
</head>
<body>
  <div class="bar">Email preview · ${escapeHtml(title)}</div>
  <div class="wrap">${safeBody}</div>
</body>
</html>`);
  w.document.close();
}

export function canDeleteNewsletterIssue(status: string): boolean {
  return status === 'draft' || status === 'scheduled';
}
