import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Construction, ExternalLink, FileText, Images, LayoutDashboard, Plus } from 'lucide-react';
import DashboardOpsPanels from './components/admin/DashboardOpsPanels';
import DashboardContentHealth from './components/admin/DashboardContentHealth';
import DashboardPendingReview from './components/admin/DashboardPendingReview';
import { supabase } from './lib/supabase';
import AdminCmsShell from './components/admin/AdminCmsShell';
import PublisherPagesListPage from './pages/PublisherPagesListPage';
import PageAdminGate from './pages/PageAdminGate';
import PublisherPageAdminPage from './pages/PublisherPageAdminPage';
import { MANAGED_PUBLIC_PAGES } from '../lib/site/managedPublicPages';
import PublisherCmsMediaPage from './pages/PublisherCmsMediaPage';
import SiteAppearancePage from './pages/SiteAppearancePage';
import SiteMenusPage from './pages/SiteMenusPage';
import SiteSeoPage from './pages/SiteSeoPage';
import SiteSettingsPage from './pages/SiteSettingsPage';
import SiteUsersPage from './pages/SiteUsersPage';
import SiteTemplatesPage from './pages/SiteTemplatesPage';
import SocialCarouselPage from './pages/SocialCarouselPage';
import CustomContentListPage from './pages/CustomContentListPage';
import CustomContentEditorPage from './pages/CustomContentEditorPage';
import FormsListPage from './pages/FormsListPage';
import ContactsListPage from './pages/ContactsListPage';
import ContactDetailPage from './pages/ContactDetailPage';
import LeadMagnetsListPage from './pages/LeadMagnetsListPage';
import LeadMagnetEditorPage from './pages/LeadMagnetEditorPage';
import NewsletterListPage from './pages/NewsletterListPage';
import NewsletterTemplatesPage from './pages/NewsletterTemplatesPage';
import NewsletterEditorPage from './pages/NewsletterEditorPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PublicSiteHubPage from './pages/PublicSiteHubPage';
import PublicDownloadsAdminPage from './pages/PublicDownloadsAdminPage';
import ResourceTemplatesAdminPage from './pages/ResourceTemplatesAdminPage';
import BookUpdatesAdminPage from './pages/BookUpdatesAdminPage';
import CampaignsListPage from './pages/CampaignsListPage';
import CampaignEditorPage from './pages/CampaignEditorPage';
import ImportsListPage from './pages/ImportsListPage';
import ImportJobPage from './pages/ImportJobPage';
import PurchasesListPage from './pages/PurchasesListPage';
import SegmentsListPage from './pages/SegmentsListPage';
import SegmentEditorPage from './pages/SegmentEditorPage';
import CategoriesListPage from './pages/CategoriesListPage';
import SeriesListPage from './pages/SeriesListPage';
import NewsletterListsPage from './pages/NewsletterListsPage';
import FormEditorPage from './pages/FormEditorPage';
import type { UserProfile } from './types';
import './studio.css';

function useCount(build: () => PromiseLike<{ count: number | null }>) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    void build().then(({ count }) => setN(count ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return n;
}

function StatCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-serif text-3xl font-black text-brand-blue">{value ?? '—'}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}

function Dashboard({ userProfile }: { userProfile: UserProfile }) {
  const published = useCount(() =>
    supabase.from('contents').select('id', { count: 'exact', head: true }).eq('kind', 'page').eq('status', 'published'),
  );
  const drafts = useCount(() =>
    supabase.from('contents').select('id', { count: 'exact', head: true }).eq('kind', 'page').eq('status', 'draft'),
  );
  const posts = useCount(() =>
    supabase.from('contents').select('id', { count: 'exact', head: true }).eq('kind', 'post').eq('status', 'published'),
  );
  const submissions = useCount(() => supabase.from('form_submissions').select('id', { count: 'exact', head: true }));

  return (
    <AdminCmsShell title="Dashboard" titleIcon={<LayoutDashboard size={14} className="text-brand-yellow" />} userProfile={userProfile}>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">
          Welcome{userProfile.display_name ? `, ${userProfile.display_name}` : ''}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
          Build pages with blocks, manage media, and publish when ready. The kit at /free never changes.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Published pages" value={published} />
          <StatCard label="Published posts" value={posts} />
          <StatCard label="Page drafts" value={drafts} />
          <StatCard label="Form submissions" value={submissions} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/admin/pages/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow shadow-md hover:bg-brand-blue/90"
          >
            <Plus size={14} /> Add a page
          </Link>
          <Link
            to="/admin/posts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow shadow-md hover:bg-brand-blue/90"
          >
            <Plus size={14} /> Write a post
          </Link>
          <Link
            to="/admin/pages"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue"
          >
            <FileText size={14} /> All pages
          </Link>
          <Link
            to="/admin/posts"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue"
          >
            <FileText size={14} /> All posts
          </Link>
          <Link
            to="/admin/media"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue"
          >
            <Images size={14} /> Media library
          </Link>
        </div>

        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-serif text-xl font-black text-slate-900">Public resources</h2>
              <p className="mt-1 text-sm text-slate-600">
                Also listed under Pages. Edit opens the manage screen; View opens the live URL.
              </p>
            </div>
            <Link to="/admin/pages" className="text-xs font-bold text-brand-blue hover:underline">
              All pages →
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MANAGED_PUBLIC_PAGES.map((page) => (
              <li key={page.slug} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-slate-900">{page.title}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">{page.publicPath}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
                  <a
                    href={page.publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                  >
                    View page <ExternalLink size={12} />
                  </a>
                  {page.adminEditPath ? (
                    <Link to={page.adminEditPath} className="text-brand-blue hover:underline">
                      Edit
                    </Link>
                  ) : null}
                  {page.slug === 'resources/templates' ? (
                    <Link to="/admin/templates" className="text-brand-blue hover:underline">
                      Starters
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <DashboardOpsPanels userId={userProfile.id} />
        <DashboardPendingReview />
        <DashboardContentHealth />
      </div>
    </AdminCmsShell>
  );
}

function ComingSoon({ userProfile }: { userProfile: UserProfile }) {
  const { pathname } = useLocation();
  const section = pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'Section';
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <AdminCmsShell title={title} titleIcon={<Construction size={14} className="text-brand-yellow" />} userProfile={userProfile}>
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">{title}</h1>
        <p className="mt-3 text-sm font-medium text-slate-600">
          This area is not a studio section. Everything in the left nav is live.
        </p>
      </div>
    </AdminCmsShell>
  );
}

export default function StudioApp({ userProfile }: { userProfile: UserProfile }) {
  return (
    <BrowserRouter>
      <div className="studio-root contents">
        <Routes>
          <Route path="/admin" element={<Dashboard userProfile={userProfile} />} />
          <Route path="/admin/pages" element={<PublisherPagesListPage key="page" userProfile={userProfile} />} />
          <Route path="/admin/pages/:pageId" element={<PageAdminGate userProfile={userProfile} />} />
          <Route path="/admin/posts" element={<PublisherPagesListPage key="post" kind="post" userProfile={userProfile} />} />
          <Route
            path="/admin/posts/:pageId"
            element={<PublisherPageAdminPage key="post" kind="post" userProfile={userProfile} />}
          />
          <Route path="/admin/media" element={<PublisherCmsMediaPage userProfile={userProfile} />} />
          <Route path="/admin/appearance" element={<SiteAppearancePage userProfile={userProfile} />} />
          <Route path="/admin/menus" element={<SiteMenusPage userProfile={userProfile} />} />
          <Route path="/admin/templates" element={<SiteTemplatesPage userProfile={userProfile} />} />
          <Route path="/admin/social/carousel" element={<SocialCarouselPage userProfile={userProfile} />} />
          <Route path="/admin/seo" element={<SiteSeoPage userProfile={userProfile} />} />
          <Route path="/admin/users" element={<SiteUsersPage userProfile={userProfile} />} />
          <Route path="/admin/settings" element={<SiteSettingsPage userProfile={userProfile} />} />
          <Route path="/admin/content/:typeKey" element={<CustomContentListPage userProfile={userProfile} />} />
          <Route path="/admin/content/:typeKey/:contentId" element={<CustomContentEditorPage userProfile={userProfile} />} />
          <Route path="/admin/forms" element={<FormsListPage userProfile={userProfile} />} />
          <Route path="/admin/forms/:formId" element={<FormEditorPage userProfile={userProfile} />} />
          <Route path="/admin/contacts" element={<ContactsListPage userProfile={userProfile} />} />
          <Route path="/admin/contacts/:contactId" element={<ContactDetailPage userProfile={userProfile} />} />
          <Route path="/admin/lead-magnets" element={<LeadMagnetsListPage userProfile={userProfile} />} />
          <Route path="/admin/lead-magnets/:magnetId" element={<LeadMagnetEditorPage userProfile={userProfile} />} />
          <Route path="/admin/newsletter" element={<NewsletterListPage userProfile={userProfile} />} />
          <Route
            path="/admin/newsletter/templates"
            element={<NewsletterTemplatesPage userProfile={userProfile} />}
          />
          <Route
            path="/admin/newsletter/lists"
            element={<NewsletterListsPage userProfile={userProfile} />}
          />
          <Route path="/admin/newsletter/:issueId" element={<NewsletterEditorPage userProfile={userProfile} />} />
          <Route path="/admin/categories" element={<CategoriesListPage userProfile={userProfile} />} />
          <Route path="/admin/series" element={<SeriesListPage userProfile={userProfile} />} />
          <Route path="/admin/segments" element={<SegmentsListPage userProfile={userProfile} />} />
          <Route path="/admin/segments/:segmentId" element={<SegmentEditorPage userProfile={userProfile} />} />
          <Route path="/admin/analytics" element={<AnalyticsPage userProfile={userProfile} />} />
          <Route path="/admin/public-site" element={<PublicSiteHubPage userProfile={userProfile} />} />
          <Route path="/admin/public-site/downloads" element={<PublicDownloadsAdminPage />} />
          <Route path="/admin/resource-templates" element={<ResourceTemplatesAdminPage />} />
          <Route path="/admin/public-site/book-updates" element={<BookUpdatesAdminPage userProfile={userProfile} />} />
          <Route path="/admin/campaigns" element={<CampaignsListPage userProfile={userProfile} />} />
          <Route path="/admin/campaigns/:campaignId" element={<CampaignEditorPage userProfile={userProfile} />} />
          <Route path="/admin/imports" element={<ImportsListPage userProfile={userProfile} />} />
          <Route path="/admin/imports/:jobId" element={<ImportJobPage userProfile={userProfile} />} />
          <Route path="/admin/sales" element={<PurchasesListPage userProfile={userProfile} />} />
          <Route path="/admin/purchases" element={<Navigate to="/admin/sales" replace />} />
          <Route path="/admin/*" element={<ComingSoon userProfile={userProfile} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
