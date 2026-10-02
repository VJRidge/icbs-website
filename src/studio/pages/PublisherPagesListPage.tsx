import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, FileText, Plus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugifyTitle } from '../lib/slugifyTitle';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { CMS_LIST_PAGE_SIZE, paginateList, totalListPages } from '../lib/admin/cmsListPagination';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import CmsListPagination from '../components/admin/CmsListPagination';
import type { PublisherSitePage, UserProfile } from '../types';

function normalizePageListStatus(raw: unknown): 'draft' | 'published' {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return s === 'published' ? 'published' : 'draft';
}

type QuickEditState = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
};

function RowActions({
  page,
  onQuickEdit,
  onTrash,
}: {
  page: PublisherSitePage;
  onQuickEdit: () => void;
  onTrash: () => void;
}) {
  const sep = <span className="text-slate-300" aria-hidden> | </span>;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-0 gap-y-0.5 text-xs">
      <Link to={`/admin/pages/${page.id}`} className="font-semibold text-brand-blue hover:underline">
        Edit
      </Link>
      {sep}
      <button type="button" onClick={onQuickEdit} className="font-semibold text-brand-blue hover:underline">
        Quick Edit
      </button>
      {sep}
      <button type="button" onClick={onTrash} className="font-semibold text-red-600 hover:underline">
        Trash
      </button>
      {page.status === 'published' ? (
        <>
          {sep}
          <Link
            to={`/${encodeURIComponent(page.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-blue hover:underline"
          >
            <Eye size={12} />
            View
          </Link>
        </>
      ) : null}
    </div>
  );
}

export default function PublisherPagesListPage({ userProfile }: { userProfile: UserProfile | null }) {
  const [rows, setRows] = useState<PublisherSitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [page, setPage] = useState(1);
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .eq('kind', 'page')
      .neq('status', 'trash')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error(error);
      setRows([]);
      return;
    }
    setRows((data as PublisherSitePage[]) || []);
  }, []);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) {
      setLoading(false);
      return;
    }
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [userProfile, load]);

  const filteredPages = useMemo(() => {
    let list = rows;
    if (listStatusFilter !== 'all') {
      list = list.filter((r) => normalizePageListStatus(r.status) === listStatusFilter);
    }
    const q = listSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => (r.title || '').toLowerCase().includes(q) || (r.slug || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, listSearchQuery, listStatusFilter]);

  const totalPages = totalListPages(filteredPages.length);
  const pagedPages = useMemo(() => paginateList(filteredPages, page), [filteredPages, page]);

  useEffect(() => {
    setPage(1);
  }, [listSearchQuery, listStatusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onTrash = async (row: PublisherSitePage) => {
    if (!window.confirm(`Delete "${row.title || 'Untitled'}" permanently?`)) return;
    const { error } = await supabase.from('contents').delete().eq('kind', 'page').eq('id', row.id);
    if (error) {
      window.alert(error.message);
      return;
    }
    if (quickEdit?.id === row.id) setQuickEdit(null);
    await load();
  };

  const openQuickEdit = (row: PublisherSitePage) => {
    setQuickEdit({
      id: row.id,
      title: row.title || '',
      slug: row.slug || '',
      status: normalizePageListStatus(row.status),
    });
  };

  const saveQuickEdit = async () => {
    if (!quickEdit) return;
    const title = quickEdit.title.trim();
    if (!title) {
      window.alert('Title is required.');
      return;
    }
    const slug = (quickEdit.slug.trim() || slugifyTitle(title)).toLowerCase();
    setQuickSaving(true);
    try {
      const prev = rows.find((r) => r.id === quickEdit.id);
      let published_at = prev?.published_at ?? null;
      if (quickEdit.status === 'published' && !published_at) published_at = new Date().toISOString();
      if (quickEdit.status === 'draft') published_at = null;

      const { error } = await supabase
        .from('contents')
        .update({
          title,
          slug,
          status: quickEdit.status,
          published_at,
          ...(quickEdit.status === 'draft'
            ? { published_document: null }
            : prev && prev.status !== 'published'
              ? {
                  published_document: {
                    format: 'blocks',
                    blocks: prev.content_blocks ?? [],
                    html: prev.body ?? '',
                    featured_image_url: prev.featured_image_url ?? null,
                    featured_image_alt: prev.featured_image_alt ?? null,
                  },
                }
              : {}),
        })
        .eq('id', quickEdit.id);
      if (error) throw error;
      setQuickEdit(null);
      await load();
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Could not save quick edit.');
    } finally {
      setQuickSaving(false);
    }
  };

  const statusCounts = useMemo(() => {
    const all = rows.length;
    const published = rows.filter((r) => normalizePageListStatus(r.status) === 'published').length;
    const draft = rows.filter((r) => normalizePageListStatus(r.status) === 'draft').length;
    return { all, published, draft };
  }, [rows]);

  if (!isAnyAdminProfile(userProfile)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8">
        <p className="max-w-md text-center font-semibold text-slate-700">Administrator access required.</p>
        <Link to="/" className="mt-6 text-xs font-black uppercase tracking-widest text-brand-blue hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <AdminCmsShell
      title="Pages"
      titleIcon={<FileText size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
      headerExtra={
        <Link
          to="/admin/pages/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-bold text-brand-blue transition-colors hover:bg-brand-yellow/90"
        >
          <Plus size={14} />
          Add new
        </Link>
      }
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">All pages</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
          Static pages publish at <span className="font-mono text-brand-blue">/your-slug</span> — About, program landing pages, and evergreen content.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setListStatusFilter('all')}
            className={`font-semibold ${listStatusFilter === 'all' ? 'text-slate-900' : 'text-brand-blue hover:underline'}`}
          >
            All <span className="text-slate-400">({statusCounts.all})</span>
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setListStatusFilter('published')}
            className={`font-semibold ${listStatusFilter === 'published' ? 'text-slate-900' : 'text-brand-blue hover:underline'}`}
          >
            Published <span className="text-slate-400">({statusCounts.published})</span>
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setListStatusFilter('draft')}
            className={`font-semibold ${listStatusFilter === 'draft' ? 'text-slate-900' : 'text-brand-blue hover:underline'}`}
          >
            Drafts <span className="text-slate-400">({statusCounts.draft})</span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative min-w-[12rem] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              placeholder="Search title or slug"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-blue/40"
              aria-label="Search pages"
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="hidden px-4 py-3 sm:table-cell">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    Loading pages…
                  </td>
                </tr>
              ) : pagedPages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                    {rows.length === 0 ? (
                      <>
                        No pages yet.{' '}
                        <Link to="/admin/pages/new" className="font-bold text-brand-blue hover:underline">
                          Create your first page
                        </Link>
                        .
                      </>
                    ) : (
                      'No pages match your filters.'
                    )}
                  </td>
                </tr>
              ) : (
                pagedPages.map((row) => (
                  <Fragment key={row.id}>
                    <tr className="border-b border-slate-50 align-top hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <Link to={`/admin/pages/${row.id}`} className="font-bold text-brand-blue hover:underline">
                          {row.title || 'Untitled'}
                        </Link>
                        <RowActions
                          page={row}
                          onQuickEdit={() => openQuickEdit(row)}
                          onTrash={() => void onTrash(row)}
                        />
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs text-slate-500 sm:table-cell">/{row.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            row.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {normalizePageListStatus(row.status)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                        {format(new Date(row.updated_at || row.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                    {quickEdit?.id === row.id ? (
                      <tr className="border-b border-slate-100 bg-slate-50/90">
                        <td colSpan={4} className="px-4 py-4">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                              Title
                              <input
                                value={quickEdit.title}
                                onChange={(e) => setQuickEdit((q) => (q ? { ...q, title: e.target.value } : q))}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
                              />
                            </label>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                              Slug
                              <input
                                value={quickEdit.slug}
                                onChange={(e) => setQuickEdit((q) => (q ? { ...q, slug: e.target.value } : q))}
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
                              />
                            </label>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                              Status
                              <select
                                value={quickEdit.status}
                                onChange={(e) =>
                                  setQuickEdit((q) =>
                                    q ? { ...q, status: e.target.value as 'draft' | 'published' } : q,
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-brand-blue/40"
                              >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                              </select>
                            </label>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={quickSaving}
                              onClick={() => void saveQuickEdit()}
                              className="rounded-lg bg-brand-blue px-4 py-2 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
                            >
                              {quickSaving ? 'Saving…' : 'Update'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickEdit(null)}
                              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
          <CmsListPagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredPages.length}
            pageSize={CMS_LIST_PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="pages"
          />
        </div>
      </div>
    </AdminCmsShell>
  );
}
