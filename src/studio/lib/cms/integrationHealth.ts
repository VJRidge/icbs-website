export type IntegrationAdapterId = 'supabase' | 'storage' | 'email' | 'scheduler';

export type IntegrationCheckStatus = 'ok' | 'missing' | 'error' | 'unknown';

export type IntegrationCheck = {
  id: IntegrationAdapterId;
  label: string;
  status: IntegrationCheckStatus;
  detail: string;
  checkedAt: string;
  /** Never include secret values. */
  recovery?: string;
};

export type IntegrationHealthReport = {
  checks: IntegrationCheck[];
  checkedAt: string;
};

export function summarizeEnvPresence(args: {
  supabaseUrl: boolean;
  serviceRole: boolean;
  resendKey: boolean;
  emailFrom: boolean;
  siteUrl: boolean;
  cronSecret: boolean;
  now?: string;
}): IntegrationHealthReport {
  const checkedAt = args.now ?? new Date().toISOString();
  const checks: IntegrationCheck[] = [
    {
      id: 'supabase',
      label: 'Supabase',
      status: args.supabaseUrl && args.serviceRole ? 'ok' : 'missing',
      detail:
        args.supabaseUrl && args.serviceRole
          ? 'Server URL and service role are configured.'
          : 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.',
      checkedAt,
      recovery: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.',
    },
    {
      id: 'email',
      label: 'Email (Resend)',
      status: args.resendKey && args.emailFrom ? 'ok' : 'missing',
      detail:
        args.resendKey && args.emailFrom
          ? 'Resend API key and EMAIL_FROM are configured.'
          : 'RESEND_API_KEY or EMAIL_FROM is missing.',
      checkedAt,
      recovery: 'Set RESEND_API_KEY and EMAIL_FROM. Never put the API key in VITE_* variables.',
    },
    {
      id: 'scheduler',
      label: 'Scheduled publish',
      status: args.cronSecret && args.siteUrl ? 'ok' : 'missing',
      detail:
        args.cronSecret && args.siteUrl
          ? 'CRON_SECRET and SITE_URL are configured for publish-due jobs.'
          : 'CRON_SECRET or SITE_URL is missing.',
      checkedAt,
      recovery: 'Set CRON_SECRET and SITE_URL so Vercel Cron can call /api/cms-publish-due.',
    },
  ];
  return { checks, checkedAt };
}

export function clientStorageCheck(args: {
  ok: boolean;
  errorMessage?: string | null;
  now?: string;
}): IntegrationCheck {
  const checkedAt = args.now ?? new Date().toISOString();
  if (args.ok) {
    return {
      id: 'storage',
      label: 'Media storage',
      status: 'ok',
      detail: 'Staff can list the public media bucket.',
      checkedAt,
    };
  }
  return {
    id: 'storage',
    label: 'Media storage',
    status: 'error',
    detail: args.errorMessage?.trim() || 'Could not list the media bucket.',
    checkedAt,
    recovery: 'Confirm media-public exists and authenticated staff have Storage policies.',
  };
}

export function mergeHealthReports(
  server: IntegrationHealthReport,
  storage: IntegrationCheck,
): IntegrationHealthReport {
  return {
    checkedAt: server.checkedAt,
    checks: [...server.checks, storage],
  };
}
