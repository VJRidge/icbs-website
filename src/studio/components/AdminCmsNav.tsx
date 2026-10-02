import { NavLink, useLocation } from 'react-router-dom';
import {
  ExternalLink,
  FileText,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  Newspaper,
  Palette,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserProfile } from '../types';

function navClass(isActive: boolean): string {
  return `flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest transition-colors ${
    isActive ? 'bg-white/15 text-brand-yellow' : 'text-white/55 hover:bg-white/10 hover:text-white'
  }`;
}

type NavItem = { to: string; label: string; icon: LucideIcon; soon?: boolean };

const CONTENT_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/pages', label: 'Pages', icon: FileText },
  { to: '/admin/posts', label: 'Blog posts', icon: Newspaper },
  { to: '/admin/media', label: 'Media', icon: Images },
  { to: '/admin/templates', label: 'Templates', icon: LayoutTemplate, soon: true },
];

const SITE_NAV: NavItem[] = [
  { to: '/admin/appearance', label: 'Header & footer', icon: Palette },
  { to: '/admin/menus', label: 'Navigation', icon: Menu },
  { to: '/admin/seo', label: 'SEO & redirects', icon: Search, soon: true },
  { to: '/admin/users', label: 'Users & roles', icon: Users, soon: true },
  { to: '/admin/settings', label: 'Settings', icon: Settings, soon: true },
];

type AdminCmsNavProps = {
  userProfile?: UserProfile | null;
};

function NavGroup({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) {
  return (
    <>
      <p className="mb-2 mt-1 px-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/35">{title}</p>
      <div className="mb-3 space-y-0.5">
        {items.map(({ to, label, icon: Icon, soon }) => {
          const active = to === '/admin' ? pathname === '/admin' : pathname.startsWith(to);
          return (
            <NavLink key={to} to={to} end={to === '/admin'} className={() => navClass(active)}>
              <Icon size={15} className="shrink-0 opacity-80" />
              <span className="min-w-0 flex-1">{label}</span>
              {soon ? <span className="text-[8px] font-bold tracking-wider text-white/30">soon</span> : null}
            </NavLink>
          );
        })}
      </div>
    </>
  );
}

/** WordPress-style studio nav. */
export default function AdminCmsNav(_props: AdminCmsNavProps) {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/admin';

  return (
    <nav className="border-b border-white/10 px-2 py-3">
      <NavGroup title="Content" items={CONTENT_NAV} pathname={path} />
      <NavGroup title="Site" items={SITE_NAV} pathname={path} />
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest text-white/45 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ExternalLink size={15} className="shrink-0 opacity-80" />
        View site
      </a>
    </nav>
  );
}
