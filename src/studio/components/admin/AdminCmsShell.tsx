import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, ShieldCheck } from 'lucide-react';
import AdminCmsNav from '../AdminCmsNav';
import type { UserProfile } from '../../types';
import { isSuperAdminProfile } from '../../lib/adminPermissions';
import { supabase } from '../../lib/supabase';

type AdminCmsShellProps = {
  title: string;
  titleIcon?: ReactNode;
  backTo?: string;
  backLabel?: string;
  headerExtra?: ReactNode;
  userProfile?: UserProfile | null;
  children: ReactNode;
};

/** CMS chrome: top bar + content nav sidebar + main area (no post/page list in sidebar). */
export default function AdminCmsShell({
  title,
  titleIcon,
  backTo,
  backLabel = 'Back',
  headerExtra,
  userProfile,
  children,
}: AdminCmsShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSuper = isSuperAdminProfile(userProfile);

  const onBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    if (backTo) navigate(backTo);
  };
  // Show the role pill whenever we have an admin context. `is_admin`
  // is true for both standard admins and super admins (the migration
  // keeps them in sync), so this also lights up for super admins who
  // happen to be reached via the email-allowlist override.
  const showRolePill = !!userProfile && (isSuper || !!userProfile.is_admin);

  return (
    <div className="isolate flex h-[100dvh] flex-col overflow-hidden bg-[#04190f]">
      <header className="z-[2147483646] flex h-12 shrink-0 items-center bg-[#072a1b] shadow-lg">
        <div className="flex h-full w-64 shrink-0 items-center gap-2.5 border-r border-white/10 px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-yellow">
            <span className="text-sm font-black leading-none text-brand-blue">BS</span>
          </div>
          <span className="truncate text-xs font-bold tracking-wide text-brand-yellow">VettaJimale.Tech Studio</span>
        </div>
        <div className="flex h-full min-w-0 flex-1 items-stretch overflow-hidden">
          {backTo ? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-full shrink-0 items-center gap-1.5 border-r border-white/10 px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:px-4"
              title={backLabel}
            >
              <ArrowLeft size={16} className="shrink-0" />
              <span className="hidden sm:inline">{backLabel}</span>
            </button>
          ) : null}
          <div className="flex items-center gap-2 border-b-2 border-brand-yellow bg-white/10 px-5 text-sm font-semibold text-white">
            {titleIcon}
            {title}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3">
          {showRolePill ? (
            <span
              className={
                isSuper
                  ? 'inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-yellow ring-1 ring-inset ring-brand-yellow/40'
                  : 'inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white/80 ring-1 ring-inset ring-white/15'
              }
              title={
                isSuper
                  ? 'Owner — full access.'
                  : 'Staff — approved studio access.'
              }
            >
              {isSuper ? (
                <ShieldCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              ) : (
                <Shield className="h-3 w-3" strokeWidth={2.5} aria-hidden />
              )}
              {isSuper ? 'Owner' : 'Staff'}
            </span>
          ) : null}
          {headerExtra}
        </div>
      </header>

      <div className="relative z-0 min-h-0 flex-1 pl-64">
        <aside className="fixed bottom-0 left-0 top-12 z-[2147483647] flex w-64 flex-col border-r border-white/10 bg-[#04190f] pointer-events-auto">
          <AdminCmsNav userProfile={userProfile} />
          <div className="mt-auto space-y-2 border-t border-white/10 p-3">
            {userProfile?.display_name || userProfile?.email ? (
              <p className="truncate text-center text-[10px] font-semibold text-white/50">
                {userProfile.display_name || userProfile.email}
              </p>
            ) : null}
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.assign('/admin');
              }}
              className="block w-full text-center text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-brand-yellow"
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="relative z-0 h-full min-w-0 overflow-auto bg-[#F3EDE3]">{children}</main>
      </div>
    </div>
  );
}
