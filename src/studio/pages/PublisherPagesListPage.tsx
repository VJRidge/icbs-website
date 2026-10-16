import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, FileText, GripVertical, Pin, Plus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugifyTitle } from '../lib/slugifyTitle';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { CMS_LIST_PAGE_SIZE, paginateList, totalListPages } from '../lib/admin/cmsListPagination';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import CmsListPagination from '../components/admin/CmsListPagination';
import { CONTENT_KINDS, type ContentKind, type ContentKindConfig } from '../lib/contentKinds';
import { restoreFromTrashPatch, trashPatch } from '../lib/cms/pageLifecycle';
import { pageListViewIsLive, previewPayloadFromListRow } from '../lib/cms/pageListView';
import { writeCmsPreview } from '../lib/cmsPreview';
import { recordActivity } from '../lib/cms/activityLog';
import { managedPublicPageBySlug } from '../../lib/site/managedPublicPages';
import { viewLivePath } from '../lib/cms/viewSite';
import {
  comparePostGridOrder,
  dropTargetPostId,
  moveIdAt,
  pinListOrder,
  ranksFromIds,
  readListOrder,
} from '../lib/cms/postGridOrder';
import type { PublisherSitePage, UserProfile } from '../types';

function normalizePageListStatus(raw: unknown): 'draft' | 'published' | 'trash' {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'published') return 'published';
  if (s === 'trash') return 'trash';
  return 'draft';
}

type QuickEditState = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
};

function RowActions({
  page,
  cfg,
  trashView,
  onQuickEdit,
  onTrash,
  onRestore,
  onPreview,
}: {
  page: PublisherSitePage;
  cfg: ContentKindConfig;
  trashView?: boolean;
  onQuickEdit: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onPreview: () => void;
}) {
  const sep = <span className="text-slate-300" aria-hidden> | </span>;
  if (trashView) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-x-0 gap-y-0.5 text-xs">
        <button type="button" onClick={onRestore} className="font-semibold text-brand-blue hover:underline">
          Restore
        </button>
      </div>
    );
  }
  const managed = cfg.kind === 'page' ? managedPublicPageBySlug(page.slug) : null;
  const editTo = managed?.adminEditPath ?? `${cfg.adminBase}/${page.id}`;
  const viewHref = managed?.publicPath ?? viewLivePath({ slug: page.slug, kind: cfg.kind });
  const viewLive = pageListViewIsLive(page.status, !!managed);
  const showEdit = !managed || !!managed.adminEditPath;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-0 gap-y-0.5 text-xs">
      <a
        href={viewLive ? viewHref : '/preview'}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => {
          if (viewLive) return;
          e.preventDefault();
          onPreview();
        }}
        className="font-semibold text-brand-blue hover:underline"
      >
        View
      </a>
      {sep}
      {showEdit ? (
        <>
          <Link to={editTo} className="font-semibold text-brand-blue hover:underline">
            Edit
          </Link>
          {sep}
        </>
      ) : null}
      {!managed ? (
        <>
          <button type="button" onClick={onQuickEdit} className="font-semibold text-brand-blue hover:underline">
            Quick Edit
          </button>
          {sep}
        </>
      ) : null}
      <button type="button" onClick={onTrash} className="font-semibold text-red-600 hover:underline">
        Trash
      </button>
    </div>
  );
}

export default function PublisherPagesListPage({
  userProfile,
  kind = 'page',
}: {
  userProfile: UserProfile | null;
  kind?: ContentKind;
}) {
  const cfg = CONTENT_KINDS[kind];
  const isPost = kind === 'post';
  const noun = cfg.singular.toLowerCase();
  const nouns = isPost ? 'posts' : 'pages';
  const [rows, setRows] = useState<PublisherSitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'draft' | 'published' | 'trash'>('all');
  const [page, setPage] = useState(1);
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [dragPostId, setDragPostId] = useState<string | null>(null);
  const [dropPostId, setDropPostId] = useState<string | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const dragPostIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    let query = supabase.from('contents').select('*').eq('kind', cfg.kind).order('updated_at', { ascending: false });
    query = listStatusFilter === 'trash' ? query.eq('status', 'trash') : query.neq('status', 'trash');
    const { data, error } = await query;
    if (error) {
      console.error(error);
      setRows([]);
      return;
    }
    setRows((data as PublisherSitePage[]) || []);
  }, [cfg.kind, listStatusFilter]);

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
    if (!isPost || q) return list;
    const published = list
      .filter((r) => normalizePageListStatus(r.status) === 'published')
      .sort(comparePostGridOrder);
    const rest = list.filter((r) => normalizePageListStatus(r.status) !== 'published');
    return [...published, ...rest];
  }, [rows, listSearchQuery, listStatusFilter, isPost]);

  const totalPages = totalListPages(filteredPages.length);
  const pagedPages = useMemo(() => paginateList(filteredPages, page), [filteredPages, page]);

  useEffect(() => {
    setPage(1);
  }, [listSearchQuery, listStatusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onTrash = async (row: PublisherSitePage) => {
    if (!window.confirm(`Move "${row.title || 'Untitled'}" to trash? You can restore it later.`)) return;
    const { error } = await supabase.from('contents').update(trashPatch()).eq('kind', cfg.kind).eq('id', row.id);
    if (error) {
      window.alert(error.message);
      return;
    }
    void recordActivity({
      actorId: userProfile?.id,
      action: 'content.trash',
      entity: 'contents',
      entityId: row.id,
      meta: { kind: cfg.kind, title: row.title, slug: row.slug },
    });
    if (quickEdit?.id === row.id) setQuickEdit(null);
    await load();
  };

  const onRestore = async (row: PublisherSitePage) => {
    if (!window.confirm(`Restore "${row.title || 'Untitled'}" as a draft? It will not go live until you publish again.`)) return;
    const { error } = await supabase
      .from('contents')
      .update(restoreFromTrashPatch())
      .eq('kind', cfg.kind)
      .eq('id', row.id);
    if (error) {
      window.alert(error.message);
      return;
    }
    void recordActivity({
      actorId: userProfile?.id,
      action: 'content.restore',
      entity: 'contents',
      entityId: row.id,
      meta: { kind: cfg.kind, title: row.title, slug: row.slug },
    });
    setListStatusFilter('draft');
    await load();
  };

  const openQuickEdit = (row: PublisherSitePage) => {
    const status = normalizePageListStatus(row.status);
    if (status === 'trash') return;
    setQuickEdit({
      id: row.id,
      title: row.title || '',
      slug: row.slug || '',
      status,
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
                    ...(isPost
                      ? {
                          title,
                          excerpt: prev.excerpt ?? null,
                          author_name: userProfile?.display_name?.trim() || 'I Call BS',
                          published_at,
                        }
                      : {}),
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

  const publishedOrderIds = useMemo(
    () =>
      filteredPages
        .filter((r) => normalizePageListStatus(r.status) === 'published')
        .map((r) => r.id),
    [filteredPages],
  );

  const canReorderPosts =
    isPost && !listSearchQuery.trim() && listStatusFilter !== 'trash' && listStatusFilter !== 'draft';

  const persistPublishedOrder = async (ids: string[]) => {
    if (!ids.length) return;
    const ranks = ranksFromIds(ids);
    setRows((prev) =>
      prev.map((row) => {
        const hit = ranks.find((rank) => rank.id === row.id);
        return hit ? { ...row, list_order: hit.list_order } : row;
      }),
    );
    setOrderSaving(true);
    try {
      for (const rank of ranks) {
        const { error } = await supabase
          .from('contents')
          .update({ list_order: rank.list_order })
          .eq('kind', 'post')
          .eq('id', rank.id);
        if (error) throw error;
      }
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Could not save post order.');
      await load();
    } finally {
      setOrderSaving(false);
    }
  };

  const movePublishedPost = (fromId: string, toId: string) => {
    if (!canReorderPosts || fromId === toId || orderSaving) return;
    const next = moveIdAt(publishedOrderIds, publishedOrderIds.indexOf(fromId), publishedOrderIds.indexOf(toId));
    if (next.join() === publishedOrderIds.join()) return;
    void persistPublishedOrder(next);
  };

  const nudgePublishedPost = (id: string, direction: -1 | 1) => {
    const index = publishedOrderIds.indexOf(id);
    if (index < 0) return;
    const to = publishedOrderIds[index + direction];
    if (!to) return;
    movePublishedPost(id, to);
  };

  const togglePinPost = async (row: PublisherSitePage) => {
    if (!canReorderPosts || orderSaving) return;
    const current = readListOrder(row.list_order);
    const nextOrder =
      current < 0
        ? 0
        : pinListOrder(
            publishedOrderIds
              .filter((id) => id !== row.id)
              .map((id) => readListOrder(rows.find((r) => r.id === id)?.list_order)),
          );
    setOrderSaving(true);
    try {
      const { error } = await supabase
        .from('contents')
        .update({ list_order: nextOrder })
        .eq('kind', 'post')
        .eq('id', row.id);
      if (error) throw error;
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, list_order: nextOrder } : item)));
    } catch (err: unknown) {
      window.alert(err instanceof Error ? err.message : 'Could not pin post.');
      await load();
    } finally {
      setOrderSaving(false);
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
      title={cfg.plural}
      titleIcon={<FileText size={14} className="text-brand-yellow" />}
      backTo="/admin"
      backLabel="Dashboard"
      userProfile={userProfile}
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <h1 className="font-serif text-3xl font-black text-slate-900">All {nouns}</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
          {isPost ? (
            <>
              Posts publish at <span className="font-mono text-brand-blue">/blog/your-slug</span> and appear on the{' '}
              <a href="/blog" target="_blank" rel="noreferrer" className="font-semibold text-brand-blue hover:underline">
                blog
              </a>{' '}
              in this list order. Drag to rearrange, or pin one to keep it first. Publish date stays the same.
            </>
          ) : (
            <>
              Static pages publish at <span className="font-mono text-brand-blue">/your-slug</span> — About, program
              landing pages, and evergreen content.
            </>
          )}
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
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setListStatusFilter('trash')}
            className={`font-semibold ${listStatusFilter === 'trash' ? 'text-slate-900' : 'text-brand-blue hover:underline'}`}
          >
            Trash
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
              aria-label={`Search ${nouns}`}
            />
          </div>
        </div>

        <div className="mt-4">
          <Link
            to={`${cfg.adminBase}/new`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-bold text-brand-blue transition-colors hover:bg-brand-yellow/90"
          >
            <Plus size={14} />
            Add new
          </Link>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <tr>
                {isPost ? <th className="w-14 px-2 py-3">Order</th> : null}
                <th className="px-4 py-3">Title</th>
                <th className="hidden px-4 py-3 sm:table-cell">Slug</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody
              onDragOver={(event) => {
                if (!canReorderPosts || !dragPostIdRef.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                const overId = dropTargetPostId(event.target);
                if (overId && overId !== dropPostId) setDropPostId(overId);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const fromId = dragPostIdRef.current || event.dataTransfer.getData('text/plain');
                const toId = dropTargetPostId(event.target);
                dragPostIdRef.current = null;
                setDragPostId(null);
                setDropPostId(null);
                if (fromId && toId) movePublishedPost(fromId, toId);
              }}
            >
              {loading ? (
                <tr>
                  <td colSpan={isPost ? 5 : 4} className="px-4 py-12 text-center text-slate-500">
                    Loading {nouns}…
                  </td>
                </tr>
              ) : pagedPages.length === 0 ? (
                <tr>
                  <td colSpan={isPost ? 5 : 4} className="px-4 py-12 text-center text-slate-500">
                    {rows.length === 0 ? (
                      <>
                        No {nouns} yet.{' '}
                        <Link to={`${cfg.adminBase}/new`} className="font-bold text-brand-blue hover:underline">
                          Create your first {noun}
                        </Link>
                        .
                      </>
                    ) : (
                      `No ${nouns} match your filters.`
                    )}
                  </td>
                </tr>
              ) : (
                pagedPages.map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      data-post-id={
                        canReorderPosts && normalizePageListStatus(row.status) === 'published' ? row.id : undefined
                      }
                      className={`border-b border-slate-50 align-top hover:bg-slate-50/80 ${
                        dragPostId === row.id ? 'bg-brand-yellow/20' : ''
                      } ${dropPostId === row.id && dragPostId !== row.id ? 'bg-brand-blue/10' : ''}`}
                    >
                      {isPost ? (
                        <td className="px-2 py-3">
                          {canReorderPosts && normalizePageListStatus(row.status) === 'published' ? (
                            <div className="flex items-center gap-0.5">
                              <span
                                draggable
                                title="Drag to reorder the blog grid"
                                aria-label={`Drag to reorder ${row.title || 'post'}`}
                                className="inline-flex cursor-grab rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing"
                                onDragStart={(event) => {
                                  dragPostIdRef.current = row.id;
                                  setDragPostId(row.id);
                                  event.dataTransfer.effectAllowed = 'move';
                                  event.dataTransfer.setData('text/plain', row.id);
                                }}
                                onDragEnd={() => {
                                  window.setTimeout(() => {
                                    dragPostIdRef.current = null;
                                    setDragPostId(null);
                                    setDropPostId(null);
                                  }, 0);
                                }}
                              >
                                <GripVertical size={14} />
                              </span>
                              <button
                                type="button"
                                disabled={orderSaving}
                                title="Move up"
                                aria-label="Move up"
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                                onClick={() => nudgePublishedPost(row.id, -1)}
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={orderSaving}
                                title="Move down"
                                aria-label="Move down"
                                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                                onClick={() => nudgePublishedPost(row.id, 1)}
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          ) : null}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        {listStatusFilter === 'trash' ? (
                          <span className="font-bold text-slate-800">{row.title || 'Untitled'}</span>
                        ) : (
                          (() => {
                            const managed = cfg.kind === 'page' ? managedPublicPageBySlug(row.slug) : null;
                            // Managed public surfaces: title opens the live page; Edit goes to admin tools.
                            if (managed) {
                              return (
                                <a
                                  href={managed.publicPath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-brand-blue hover:underline"
                                >
                                  {row.title || 'Untitled'}
                                </a>
                              );
                            }
                            return (
                              <Link
                                to={`${cfg.adminBase}/${row.id}`}
                                className="font-bold text-brand-blue hover:underline"
                              >
                                {row.title || 'Untitled'}
                              </Link>
                            );
                          })()
                        )}
                        <RowActions
                          page={row}
                          cfg={cfg}
                          trashView={listStatusFilter === 'trash'}
                          onQuickEdit={() => openQuickEdit(row)}
                          onTrash={() => void onTrash(row)}
                          onRestore={() => void onRestore(row)}
                          onPreview={() => {
                            writeCmsPreview(previewPayloadFromListRow(row, cfg.kind));
                            window.open(`${window.location.origin}/preview`, '_blank', 'noopener,noreferrer');
                          }}
                        />
                        {canReorderPosts && normalizePageListStatus(row.status) === 'published' ? (
                          <div className="mt-1">
                            <button
                              type="button"
                              disabled={orderSaving}
                              onClick={() => void togglePinPost(row)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline disabled:opacity-40"
                            >
                              <Pin size={11} />
                              {readListOrder(row.list_order) < 0 ? 'Unpin' : 'Pin to top'}
                            </button>
                          </div>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs text-slate-500 sm:table-cell">{cfg.publicPath(row.slug)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                            row.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {normalizePageListStatus(row.status)}
                        </span>
                        {isPost && readListOrder(row.list_order) < 0 ? (
                          <span className="ml-1 rounded-full bg-brand-yellow/80 px-2 py-0.5 text-[10px] font-black uppercase text-brand-blue">
                            Pinned
                          </span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-500 md:table-cell">
                        {format(new Date(row.updated_at || row.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                    {quickEdit?.id === row.id ? (
                      <tr className="border-b border-slate-100 bg-slate-50/90">
                        <td colSpan={isPost ? 5 : 4} className="px-4 py-4">
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
            itemLabel={nouns}
          />
        </div>
      </div>
    </AdminCmsShell>
  );
}
