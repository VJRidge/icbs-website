import { captureUtm } from '../utm';

const SESSION_KEY = 'vj-analytics-session';

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

/** Fire-and-forget public beacon. Never throws. */
export function trackPublicEvent(
  name: 'page_view' | 'form_start',
  opts?: { path?: string; meta?: Record<string, unknown> },
): void {
  try {
    const path = opts?.path || (typeof window !== 'undefined' ? window.location.pathname : '/');
    void fetch('/api/analytics-track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        path,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        sessionId: sessionId(),
        utm: captureUtm(),
        meta: opts?.meta ?? {},
      }),
      keepalive: true,
    }).catch(() => {
      /* ignore beacon failures */
    });
  } catch {
    /* ignore */
  }
}
