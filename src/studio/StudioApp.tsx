import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Construction, FileText, Images, LayoutDashboard, Plus } from 'lucide-react';
import { supabase } from './lib/supabase';
import AdminCmsShell from './components/admin/AdminCmsShell';
import PublisherPagesListPage from './pages/PublisherPagesListPage';
import PublisherPageAdminPage from './pages/PublisherPageAdminPage';
import PublisherCmsMediaPage from './pages/PublisherCmsMediaPage';
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
          This area is planned for a later phase. Pages, blog posts, and the media library are live now.
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
          <Route path="/admin/pages/:pageId" element={<PublisherPageAdminPage userProfile={userProfile} />} />
          <Route path="/admin/posts" element={<PublisherPagesListPage key="post" kind="post" userProfile={userProfile} />} />
          <Route
            path="/admin/posts/:pageId"
            element={<PublisherPageAdminPage key="post" kind="post" userProfile={userProfile} />}
          />
          <Route path="/admin/media" element={<PublisherCmsMediaPage userProfile={userProfile} />} />
          <Route path="/admin/*" element={<ComingSoon userProfile={userProfile} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
