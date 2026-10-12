import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Contact,
  CreditCard,
  FileText,
  Filter,
  GalleryHorizontal,
  Globe2,
  Images,
  Import,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Mail,
  Megaphone,
  Menu,
  Newspaper,
  Package,
  Palette,
  Search,
  Settings,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { UserProfile } from '../types';

function navClass(isActive: boolean): string {
  return `flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest transition-colors ${
    isActive ? 'bg-white/15 text-brand-yellow' : 'text-white/55 hover:bg-white/10 hover:text-white'
  }`;
}

function nestedNavClass(isActive: boolean): string {
  return `flex items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${
    isActive ? 'bg-white/15 text-brand-yellow' : 'text-white/50 hover:bg-white/10 hover:text-white'
  }`;
}

type NavItem = { to: string; label: string; icon: LucideIcon; soon?: boolean };

const CONTENT_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/pages', label: 'Pages', icon: FileText },
  { to: '/admin/posts', label: 'Posts', icon: Newspaper },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/series', label: 'Series', icon: Layers },
  { to: '/admin/content/tool_review', label: 'Reviews', icon: ClipboardCheck },
  { to: '/admin/forms', label: 'Forms', icon: ClipboardList },
  { to: '/admin/contacts', label: 'Contacts', icon: Contact },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/imports', label: 'Imports', icon: Import },
  { to: '/admin/sales', label: 'Sales', icon: CreditCard },
  { to: '/admin/media', label: 'Media', icon: Images },
  { to: '/admin/templates', label: 'Templates', icon: LayoutTemplate },
];

const MARKETING_TOP_NAV: NavItem[] = [
  { to: '/admin/social/carousel', label: 'Social slides', icon: GalleryHorizontal },
  { to: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
];

const NEWSLETTER_NAV: NavItem[] = [
  { to: '/admin/newsletter', label: 'Newsletters', icon: Mail },
  { to: '/admin/newsletter/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/admin/newsletter/lists', label: 'Preferences', icon: ListChecks },
  { to: '/admin/segments', label: 'Contact lists', icon: Filter },
];

const MARKETING_BOTTOM_NAV: NavItem[] = [
  { to: '/admin/lead-magnets', label: 'Lead magnets', icon: Package },
];

const SITE_NAV: NavItem[] = [
  { to: '/admin/public-site', label: 'Public site', icon: Globe2 },
  { to: '/admin/appearance', label: 'Header & footer', icon: Palette },
  { to: '/admin/menus', label: 'Navigation', icon: Menu },
  { to: '/admin/seo', label: 'SEO & redirects', icon: Search },
  { to: '/admin/users', label: 'Users & roles', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

type AdminCmsNavProps = {
  userProfile?: UserProfile | null;
};

function itemActive(pathname: string, to: string): boolean {
  if (to === '/admin') return pathname === '/admin';
  // Newsletters list + editor, but not templates or preference lists.
  if (to === '/admin/newsletter') {
    if (pathname === '/admin/newsletter') return true;
    if (pathname.startsWith('/admin/newsletter/templates')) return false;
    if (pathname.startsWith('/admin/newsletter/lists')) return false;
    return pathname.startsWith('/admin/newsletter/');
  }
  if (to === '/admin/public-site') return pathname.startsWith('/admin/public-site');
  return pathname.startsWith(to);
}

function NavLinks({
  items,
  pathname,
  nested = false,
}: {
  items: NavItem[];
  pathname: string;
  nested?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {items.map(({ to, label, icon: Icon, soon }) => {
        const active = itemActive(pathname, to);
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={() => (nested ? nestedNavClass(active) : navClass(active))}
          >
            <Icon size={nested ? 14 : 15} className="shrink-0 opacity-80" />
            <span className="min-w-0 flex-1">{label}</span>
            {soon ? <span className="text-[8px] font-bold tracking-wider text-white/30">soon</span> : null}
          </NavLink>
        );
      })}
    </div>
  );
}

function NavDropdown({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  const childActive = items.some((item) => itemActive(pathname, item.to));

  return (
    <details className="mb-3 group" open={childActive || undefined}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest transition-colors marker:hidden [&::-webkit-details-marker]:hidden ${
          childActive
            ? 'bg-white/10 text-white'
            : 'text-white/55 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="min-w-0 flex-1">{title}</span>
        <ChevronDown
          size={14}
          className="shrink-0 opacity-60 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-0.5 pb-1">
        <NavLinks items={items} pathname={pathname} nested />
      </div>
    </details>
  );
}

function NestedNavDropdown({
  title,
  icon: Icon,
  items,
  pathname,
}: {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
  pathname: string;
}) {
  const childActive = items.some((item) => itemActive(pathname, item.to));

  return (
    <details className="group/nested" open={childActive || undefined}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors marker:hidden [&::-webkit-details-marker]:hidden ${
          childActive
            ? 'bg-white/15 text-brand-yellow'
            : 'text-white/50 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={14} className="shrink-0 opacity-80" />
        <span className="min-w-0 flex-1">{title}</span>
        <ChevronDown
          size={12}
          className="shrink-0 opacity-60 transition-transform group-open/nested:rotate-180"
        />
      </summary>
      <div className="mt-0.5 space-y-0.5 pb-1 pl-4">
        {items.map(({ to, label, icon: ItemIcon }) => {
          const active = itemActive(pathname, to);
          return (
            <NavLink key={to} to={to} className={() => nestedNavClass(active)}>
              <ItemIcon size={14} className="shrink-0 opacity-80" />
              <span className="min-w-0 flex-1">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </details>
  );
}

function MarketingNav({ pathname }: { pathname: string }) {
  const all = [...MARKETING_TOP_NAV, ...NEWSLETTER_NAV, ...MARKETING_BOTTOM_NAV];
  const childActive = all.some((item) => itemActive(pathname, item.to));

  return (
    <details className="mb-3 group" open={childActive || undefined}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-widest transition-colors marker:hidden [&::-webkit-details-marker]:hidden ${
          childActive
            ? 'bg-white/10 text-white'
            : 'text-white/55 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="min-w-0 flex-1">Marketing</span>
        <ChevronDown
          size={14}
          className="shrink-0 opacity-60 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-0.5 pb-1">
        <NavLinks items={MARKETING_TOP_NAV} pathname={pathname} nested />
        <NestedNavDropdown
          title="Newsletter"
          icon={Mail}
          items={NEWSLETTER_NAV}
          pathname={pathname}
        />
        <NavLinks items={MARKETING_BOTTOM_NAV} pathname={pathname} nested />
      </div>
    </details>
  );
}

function NavGroup({ title, items, pathname }: { title: string; items: NavItem[]; pathname: string }) {
  return (
    <>
      <p className="mb-2 mt-1 px-3 text-[9px] font-black uppercase tracking-[0.22em] text-white/35">{title}</p>
      <div className="mb-3">
        <NavLinks items={items} pathname={pathname} />
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
      <MarketingNav pathname={path} />
      <NavDropdown title="Site" items={SITE_NAV} pathname={path} />
    </nav>
  );
}
