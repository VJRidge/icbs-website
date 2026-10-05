import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronDown, Copy, Eye, FileText, Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { slugifyTitle } from '../lib/slugifyTitle';
import {
  htmlWordCount,
  manuscriptLooksLikeHtml,
  prefersBlogRawHtmlEditor,
  unwrapTiptapEscapedFullDocument,
} from '../lib/opEdManuscript';
import { serializeBlogBlocksToHtml } from '../lib/blog/blogBlocksSerialize';
import { useBlogEditorStore, htmlBodyToEditorBlocks, parseBlogBlocks } from '../lib/blog/useBlogEditorStore';
import { sanitizeBlogBlocksDeep } from '../lib/blog/sanitizeBlogBlockHtml';
import { ActiveEditorProvider } from '../contexts/ActiveEditorContext';
import { BlogAdminMediaLibraryProvider } from '../contexts/BlogAdminMediaLibraryContext';
import { BlogEditorSidebarProvider } from '../contexts/BlogEditorSidebarContext';
import OpEdRichEditor from '../components/OpEdRichEditor';
import FileUpload from '../components/FileUpload';
import BlogBlockEditor from '../components/blog/editor/BlogBlockEditor';
import BlogAdminLeftColumn from '../components/blog/editor/BlogAdminLeftColumn';
import BlogAdminModuleBay from '../components/blog/editor/BlogAdminModuleBay';
import BlogAdminPostSettingsAside from '../components/blog/editor/BlogAdminPostSettingsAside';
import PostCarouselActions from '../components/social/PostCarouselActions';
import BlogBlockEditModalHost from '../components/blog/editor/BlogBlockEditModalHost';
import StudioHistoryButtons from '../components/blog/editor/StudioHistoryButtons';
import { addSectionAt, pageUsesBrandCanvas } from '../../brand/sectionActions';
import BlogPageStructureHeaderControl from '../components/blog/editor/BlogPageStructureHeaderControl';
import BlogPostTitleField from '../components/blog/editor/BlogPostTitleField';
import BlogArticleHtmlDisplay from '../components/blog/BlogArticleHtmlDisplay';
import CmsEditorActionsMenu from '../components/admin/CmsEditorActionsMenu';
import CmsShortLinkPanel from '../components/admin/CmsShortLinkPanel';
import HomepageToggle from '../components/admin/HomepageToggle';
import { clipboardCopy } from '../lib/clipboardCopy';
import { clearCmsEditorLocalDraft, syncCmsEditorUrlSilently } from '../lib/cms/cmsEditorDraft';
import { useCmsEditorAutosave } from '../lib/cms/useCmsEditorAutosave';
import PostCategoriesPanel from '../components/admin/PostCategoriesPanel';
import { CONTENT_KINDS, type ContentKind } from '../lib/contentKinds';
import { writeCmsPreview } from '../lib/cmsPreview';
import type { PageLayout, PublishedPageDocument, PublisherSitePage, UserProfile } from '../types';

function bodyHtmlForEditor(raw: string | null | undefined): string {
  const b = (raw ?? '').trim();
  if (!b) return '<p></p>';
  if (manuscriptLooksLikeHtml(b)) return b;
  const escaped = b
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `<p>${escaped}</p>`;
}

function initialBodyHtml(raw: string | null | undefined): string {
  const u = unwrapTiptapEscapedFullDocument(raw ?? '');
  if (u) return u;
  return bodyHtmlForEditor(raw);
}

function hasBlocksInDb(row: PublisherSitePage): boolean {
  return Array.isArray(row.content_blocks) && row.content_blocks.length > 0;
}

function blocksKeepPageSections(blocks: Array<{ type?: string }>): boolean {
  return blocks.some((block) => {
    const type = String(block?.type ?? '');
    return type.startsWith('brand_') || type.startsWith('kit_');
  });
}

type ContentMode = 'html' | 'blocks';

type FormState = {
  id: string | null;
  title: string;
  slug: string;
  body: string;
  featured_image_url: string;
  featured_image_alt: string;
  status: 'draft' | 'published';
  contentMode: ContentMode;
  seo_title: string;
  seo_description: string;
  layout: PageLayout;
  /** Posts only. */
  excerpt: string;
  /** Posts only: `yyyy-MM-dd`; empty = date of first publish. */
  publish_date: string;
};

function emptyForm(): FormState {
  return {
    id: null,
    title: '',
    slug: '',
    body: '<p></p>',
    featured_image_url: '',
    featured_image_alt: '',
    status: 'draft',
    contentMode: 'blocks',
    seo_title: '',
    seo_description: '',
    layout: 'article',
    excerpt: '',
    publish_date: '',
  };
}

type PersistOptions = {
  silent?: boolean;
  autosave?: boolean;
};

function formatPostgrestError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    const chunks = [o.message, o.details, o.hint].map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
    if (chunks.length) return chunks.join(' — ');
    if (typeof o.code === 'string' && o.code) return `Database error (${o.code}).`;
    try {
      return JSON.stringify(o);
    } catch {
      /* fall through */
    }
  }
  if (typeof err === 'string' && err.trim()) return err.trim();
  return 'Something went wrong while saving.';
}

function normalizeStatus(raw: unknown): 'draft' | 'published' {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return s === 'published' ? 'published' : 'draft';
}

function StatusDot({ status }: { status: string }) {
  const cfg =
    status === 'published'
      ? { dot: 'bg-green-400', text: 'text-green-400', label: 'PUBLISHED' }
      : { dot: 'bg-slate-400', text: 'text-slate-300', label: 'DRAFT' };
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold tracking-wide ${cfg.text}`}>
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function PublisherPageAdminPage({
  userProfile,
  kind = 'page',
}: {
  userProfile: UserProfile | null;
  kind?: ContentKind;
}) {
  const cfg = CONTENT_KINDS[kind];
  const isPost = kind === 'post';
  const { pageId } = useParams<{ pageId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNewRoute = pageId === 'new';
  const templateId = isNewRoute ? searchParams.get('template') : null;
  const [templateReady, setTemplateReady] = useState(() => !templateId);

  const [loadedRow, setLoadedRow] = useState<PublisherSitePage | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(true);
  const [htmlSubView, setHtmlSubView] = useState<'edit' | 'rendered'>('edit');
  const [htmlInputMode, setHtmlInputMode] = useState<'richtext' | 'raw'>('richtext');

  const loadBlocks = useBlogEditorStore((s) => s.loadBlocks);
  const resetBlocks = useBlogEditorStore((s) => s.resetBlocks);
  const openBlockPicker = useBlogEditorStore((s) => s.openBlockPicker);
  const markClean = useBlogEditorStore((s) => s.markClean);
  const blockCount = useBlogEditorStore((s) => s.blocks.length);
  const blockList = useBlogEditorStore((s) => s.blocks);
  const saveSuccessRef = useRef<(form: FormState, slugTouched: boolean) => void>(() => {});
  const baselineDocRef = useRef<string | null>(null);
  const blockWordStats = useMemo(() => {
    const html = serializeBlogBlocksToHtml(blockList);
    const wc = htmlWordCount(html);
    return { wc, readMins: Math.max(1, Math.ceil(wc / 200)) };
  }, [blockList]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) return;
    if (form.id != null) return;
    if (form.contentMode !== 'blocks') return;
    if (blockCount > 0) return;
    if (templateId && !templateReady) return;
    loadBlocks([{ id: nanoid(), type: 'paragraph', data: { text: '<p></p>' } }]);
  }, [userProfile, form.id, form.contentMode, blockCount, loadBlocks, templateId, templateReady]);

  const startNew = useCallback(() => {
    setLoadedRow(null);
    setForm(emptyForm());
    setSlugTouched(false);
    resetBlocks();
    setSaveError(null);
    setHtmlSubView('edit');
    setHtmlInputMode('richtext');
  }, [resetBlocks]);

  const applyRow = useCallback(
    (r: PublisherSitePage) => {
      setLoadedRow(r);
      const blockMode = hasBlocksInDb(r);
      const nextBody = blockMode ? bodyHtmlForEditor(r.body) : initialBodyHtml(r.body);
      const openInBlocks = blockMode || Boolean((r.body ?? '').trim());
      setHtmlInputMode(!blockMode && prefersBlogRawHtmlEditor(nextBody) ? 'raw' : 'richtext');
      setForm({
        id: r.id,
        title: r.title,
        slug: r.slug,
        body: nextBody,
        featured_image_url: r.featured_image_url || '',
        featured_image_alt: r.featured_image_alt || '',
        status: normalizeStatus(r.status),
        contentMode: openInBlocks ? 'blocks' : 'html',
        seo_title: r.seo_title || '',
        seo_description: r.seo_description || '',
        layout: r.layout === 'landing' ? 'landing' : 'article',
        excerpt: r.excerpt || '',
        publish_date: r.published_at ? format(new Date(r.published_at), 'yyyy-MM-dd') : '',
      });
      if (blockMode) {
        loadBlocks(r.content_blocks);
      } else if ((r.body ?? '').trim()) {
        loadBlocks(htmlBodyToEditorBlocks(nextBody));
      } else {
        resetBlocks();
      }
      setSlugTouched(true);
      setSaveError(null);
      setHtmlSubView('edit');
    },
    [loadBlocks, resetBlocks],
  );

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile)) return;
    if (!pageId) return;
    let cancelled = false;

    if (pageId === 'new') {
      startNew();
      const tid = searchParams.get('template');
      if (!tid) {
        setTemplateReady(true);
        setHydrating(false);
        return () => {
          cancelled = true;
        };
      }
      setHydrating(true);
      void (async () => {
        const { data, error } = await supabase.from('templates').select('document').eq('id', tid).maybeSingle();
        if (cancelled) return;
        if (error) {
          window.alert(error.message);
          setTemplateReady(true);
          setHydrating(false);
          return;
        }
        const doc = data?.document && typeof data.document === 'object' ? (data.document as Record<string, unknown>) : {};
        const blocks = parseBlogBlocks(doc.blocks);
        const layout = doc.layout === 'landing' ? 'landing' : 'article';
        if (blocks.length) loadBlocks(blocks);
        setForm((f) => ({ ...f, layout, contentMode: 'blocks' }));
        setTemplateReady(true);
        setHydrating(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    if (form.id === pageId && loadedRow?.id === pageId) {
      setHydrating(false);
      return;
    }

    setHydrating(true);
    void (async () => {
      const { data, error } = await supabase
        .from('contents')
        .select('*')
        .eq('kind', cfg.kind)
        .eq('id', pageId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
        window.alert(error.message);
        navigate(cfg.adminBase, { replace: true });
        setHydrating(false);
        return;
      }
      const row = data as PublisherSitePage | null;
      if (!row) {
        window.alert(`${cfg.singular} not found.`);
        navigate(cfg.adminBase, { replace: true });
        setHydrating(false);
        return;
      }
      applyRow(row);
      setHydrating(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userProfile, pageId, navigate, startNew, applyRow, form.id, loadedRow?.id, searchParams, loadBlocks]);

  const switchToBlocks = () => {
    if (form.contentMode === 'blocks') return;
    const html = form.body || '<p></p>';
    const parsed = htmlBodyToEditorBlocks(html);
    loadBlocks(parsed.length ? parsed : [{ id: nanoid(), type: 'paragraph', data: { text: '<p></p>' } }]);
    setForm((f) => ({ ...f, contentMode: 'blocks' }));
  };

  const switchToHtml = () => {
    if (form.contentMode === 'html') return;
    const blocks = useBlogEditorStore.getState().blocks;
    const nextBody = blocks.length > 0 ? serializeBlogBlocksToHtml(blocks) : form.body;
    if (
      blocks.length > 0 &&
      !window.confirm('Switch to HTML? Block layout will be cleared on save (HTML is copied into the body field).')
    ) {
      return;
    }
    setHtmlSubView('edit');
    const normalized = initialBodyHtml(nextBody || '');
    setHtmlInputMode(prefersBlogRawHtmlEditor(normalized) ? 'raw' : 'richtext');
    setForm((f) => ({ ...f, contentMode: 'html', body: normalized }));
    resetBlocks();
  };

  useEffect(() => {
    if (form.contentMode !== 'html') return;
    if (htmlSubView !== 'edit') return;
    if (!prefersBlogRawHtmlEditor(form.body)) return;
    if (htmlInputMode === 'raw') return;
    setHtmlInputMode('raw');
  }, [form.contentMode, form.body, htmlSubView, htmlInputMode]);

  const persistPage = useCallback(
    async (statusOverride?: 'draft' | 'published', options?: PersistOptions): Promise<boolean> => {
      if (!userProfile?.id || !isAnyAdminProfile(userProfile)) {
        if (!options?.silent) window.alert('You must be signed in as an administrator.');
        return false;
      }
      setSaveError(null);

      const slugBase = (form.slug.trim() || slugifyTitle(form.title)).toLowerCase();
      if (!form.title.trim()) {
        if (!options?.silent) window.alert('Title is required.');
        return false;
      }

      const storedStatus = loadedRow?.id === form.id ? normalizeStatus(loadedRow.status) : 'draft';
      const effectiveStatus = options?.autosave ? storedStatus : (statusOverride ?? form.status);
      const wasExisting = Boolean(form.id);
      if (options?.autosave) setAutosaving(true);
      else setSaving(true);
      try {
        const prev = form.id && loadedRow?.id === form.id ? loadedRow : undefined;
        let published_at =
          effectiveStatus === 'published' ? prev?.published_at ?? new Date().toISOString() : null;
        if (effectiveStatus === 'published' && !published_at) published_at = new Date().toISOString();
        if (isPost && effectiveStatus === 'published' && /^\d{4}-\d{2}-\d{2}$/.test(form.publish_date)) {
          const prevDay = prev?.published_at ? format(new Date(prev.published_at), 'yyyy-MM-dd') : null;
          if (form.publish_date !== prevDay) published_at = new Date(`${form.publish_date}T09:00:00`).toISOString();
        }
        const prevDoc: PublishedPageDocument | null | undefined = prev?.published_document;
        const authorName = prevDoc?.author_name || userProfile.display_name?.trim() || 'I Call BS';
        const excerpt = form.excerpt.trim() || null;

        const blocks = useBlogEditorStore.getState().blocks;
        const serialized =
          form.contentMode === 'blocks' && blocks.length > 0 ? serializeBlogBlocksToHtml(blocks) : form.body;

        let slug = slugBase;
        let nextId: string | null = form.id;

        const contentBlocks =
          form.contentMode === 'blocks' && blocks.length > 0 ? sanitizeBlogBlocksDeep(blocks) : [];
        const seoTitle = form.seo_title.trim() || null;
        const seoDescription = form.seo_description.trim() || null;
        const featuredUrl = form.featured_image_url.trim() || null;
        const featuredAlt = form.featured_image_alt.trim() || null;
        /** Autosave only touches the working copy; the live snapshot changes on explicit Save / Publish. */
        const liveSnapshot = options?.autosave
          ? {}
          : {
              published_document:
                effectiveStatus === 'published'
                  ? {
                      format: 'blocks',
                      blocks: contentBlocks,
                      html: serialized,
                      layout: form.layout,
                      featured_image_url: featuredUrl,
                      featured_image_alt: featuredAlt,
                      ...(isPost
                        ? { title: form.title.trim(), excerpt, author_name: authorName, published_at }
                        : {}),
                    }
                  : null,
            };
        const buildBase = (nextSlug: string) => ({
          title: form.title.trim(),
          slug: nextSlug,
          body: serialized,
          featured_image_url: featuredUrl,
          featured_image_alt: featuredAlt,
          status: effectiveStatus,
          published_at,
          content_blocks: contentBlocks,
          seo_title: seoTitle,
          seo_description: seoDescription,
          seo: { title: seoTitle, description: seoDescription },
          layout: form.layout,
          excerpt,
          ...liveSnapshot,
        });

        const pageSlug = (form.slug.trim() || loadedRow?.slug || slug).toLowerCase();
        if (form.id && pageSlug.startsWith('vj-') && !blocksKeepPageSections(blocks)) {
          const { data: currentRow } = await supabase.from('contents').select('content_blocks').eq('id', form.id).maybeSingle();
          const existing = Array.isArray(currentRow?.content_blocks)
            ? (currentRow.content_blocks as Array<{ type?: string }>)
            : [];
          if (blocksKeepPageSections(existing)) {
            loadBlocks(existing);
            setSaveError('Refresh this page. The saved sections are still there, and this copy would erase them.');
            if (options?.autosave) setAutosaving(false);
            else setSaving(false);
            return false;
          }
        }

        if (!form.id) {
          let insertedId: string | null = null;
          for (let attempt = 0; attempt < 5; attempt += 1) {
            const { data: inserted, error } = await supabase
              .from('contents')
              .insert({
                ...buildBase(slug),
                kind: cfg.kind,
                author_id: userProfile.id,
              })
              .select('id')
              .single();
            if (!error && inserted) {
              insertedId =
                inserted && typeof inserted === 'object' && 'id' in inserted ? String((inserted as { id: unknown }).id) : '';
              if (insertedId) break;
            }
            if (error && (error as { code?: string }).code === '23505' && attempt < 4) {
              slug = `${slugBase}-${nanoid(4)}`;
              continue;
            }
            if (error) throw error;
          }
          if (!insertedId) throw new Error('Save succeeded but no id returned.');
          nextId = insertedId;
        } else {
          const { error } = await supabase
            .from('contents')
            .update(buildBase(slug))
            .eq('kind', cfg.kind)
            .eq('id', form.id);
          if (error) throw error;
          if (
            !options?.autosave &&
            prev &&
            normalizeStatus(prev.status) === 'published' &&
            prev.slug &&
            prev.slug !== slug
          ) {
            const { error: redirectError } = await supabase.from('redirects').insert({
              from_path: cfg.publicPath(prev.slug),
              to_path: cfg.publicPath(slug),
              status_code: 301,
            });
            if (redirectError && (redirectError as { code?: string }).code !== '23505') {
              console.warn(redirectError);
            }
          }
        }

        if (!options?.autosave && nextId) {
          await supabase.from('content_revisions').insert({
            content_id: nextId,
            title: form.title.trim(),
            document: { format: 'blocks', blocks: contentBlocks, html: serialized },
            created_by: userProfile.id,
          });
        }

        markClean();
        const nextForm: FormState = { ...form, id: nextId ?? form.id, status: effectiveStatus, slug };
        setForm(nextForm);
        if (nextId) {
          const { data: refreshed } = await supabase.from('contents').select('*').eq('id', nextId).maybeSingle();
          if (refreshed) {
            setLoadedRow(refreshed as PublisherSitePage);
          }
        }
        if (!wasExisting && nextId) {
          clearCmsEditorLocalDraft(cfg.draftKind, 'new');
          if (options?.autosave) {
            syncCmsEditorUrlSilently(`${cfg.adminBase}/${nextId}`);
          } else if (isNewRoute) {
            navigate(`${cfg.adminBase}/${nextId}`, { replace: true });
          }
        }
        saveSuccessRef.current(nextForm, slugTouched);
        if (!options?.silent) window.alert(wasExisting ? 'Saved.' : 'Created.');
        return true;
      } catch (err: unknown) {
        const msg = formatPostgrestError(err);
        setSaveError(msg);
        if (!options?.silent) window.alert(msg);
        return false;
      } finally {
        if (options?.autosave) setAutosaving(false);
        else setSaving(false);
      }
    },
    [userProfile, form, loadedRow, markClean, navigate, isNewRoute, slugTouched, cfg, isPost],
  );

  const draftStorageKey = form.id ?? (isNewRoute ? 'new' : pageId ?? 'new');

  const {
    autosaveStatus,
    lastAutosavedAt,
    pendingLocalDraft,
    setBaseline,
    noteManualSaveSuccess,
    restoreLocalDraft,
    dismissLocalDraft,
  } = useCmsEditorAutosave<FormState>({
    kind: cfg.draftKind,
    storageKey: draftStorageKey,
    enabled: !hydrating && isAnyAdminProfile(userProfile),
    form,
    blocks: blockList,
    slugTouched,
    serverUpdatedAt: loadedRow?.updated_at,
    saving: saving || autosaving,
    canServerAutosave: Boolean(form.title.trim()),
    persistAutosave: () => persistPage(undefined, { silent: true, autosave: true }),
    onRestore: (payload) => {
      setForm(payload.form);
      loadBlocks(payload.blocks);
      setSlugTouched(payload.slugTouched);
    },
  });

  saveSuccessRef.current = (nextForm, nextSlugTouched) => {
    noteManualSaveSuccess(nextForm, useBlogEditorStore.getState().blocks, nextSlugTouched);
  };

  useEffect(() => {
    if (!pendingLocalDraft) return;
    const slug = (form.slug || loadedRow?.slug || '').toLowerCase();
    if (!slug.startsWith('vj-')) return;
    if (blocksKeepPageSections(pendingLocalDraft.blocks)) return;
    dismissLocalDraft();
  }, [pendingLocalDraft, form.slug, loadedRow?.slug, dismissLocalDraft]);

  useEffect(() => {
    baselineDocRef.current = null;
  }, [draftStorageKey]);

  useEffect(() => {
    if (hydrating || pendingLocalDraft) return;
    if (baselineDocRef.current === draftStorageKey) return;
    baselineDocRef.current = draftStorageKey;
    setBaseline(form, blockList, slugTouched);
  }, [hydrating, pendingLocalDraft, draftStorageKey, form, blockList, slugTouched, setBaseline, loadedRow?.updated_at]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void persistPage();
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(`Delete this ${cfg.singular.toLowerCase()} permanently?`)) return;
    const { error } = await supabase.from('contents').delete().eq('kind', cfg.kind).eq('id', id);
    if (error) {
      window.alert(error.message);
      return;
    }
    navigate(cfg.adminBase, { replace: true });
  };

  const previewSlug = (form.slug.trim() || slugifyTitle(form.title)).toLowerCase();

  const openPreviewWindow = () => {
    if (!form.title.trim()) {
      window.alert('Add a title first.');
      return;
    }
    const blocks = useBlogEditorStore.getState().blocks;
    const html = form.contentMode === 'blocks' && blocks.length > 0 ? serializeBlogBlocksToHtml(blocks) : form.body;
    const title = form.title.trim();
    const publishedAt = form.publish_date
      ? new Date(`${form.publish_date}T09:00:00`).toISOString()
      : new Date().toISOString();
    writeCmsPreview({
      title,
      document: {
        format: 'blocks',
        blocks: form.contentMode === 'blocks' ? blocks : [],
        html,
        layout: form.layout,
        title,
        excerpt: form.excerpt.trim() || null,
        author_name: userProfile?.display_name?.trim() || 'I Call BS',
        published_at: publishedAt,
        featured_image_url: form.featured_image_url.trim() || null,
        featured_image_alt: form.featured_image_alt.trim() || null,
      },
      post: isPost
        ? {
            author: userProfile?.display_name?.trim() || 'I Call BS',
            publishedAt,
          }
        : undefined,
    });
    window.open(`${window.location.origin}/preview`, '_blank', 'noopener,noreferrer');
  };

  const publishedAtRow = loadedRow?.published_at ?? null;
  const publishedLabel = publishedAtRow
    ? format(new Date(publishedAtRow), 'MMM d, yyyy')
    : form.status === 'published'
      ? format(new Date(), 'MMM d, yyyy')
      : 'Not published';

  const savedSitePageRow = loadedRow;
  const absolutePagePublicUrl = previewSlug ? `${window.location.origin}${cfg.publicPath(previewSlug)}` : '';

  const copyPublicPageUrl = async (slug: string) => {
    const url = `${window.location.origin}${cfg.publicPath(slug)}`;
    const ok = await clipboardCopy(url);
    window.alert(ok ? 'Link copied to clipboard.' : 'Could not copy. Copy the URL manually.');
  };

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

  if (hydrating && !isNewRoute) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#04190f]">
        <p className="text-sm text-white/60">Loading page…</p>
      </div>
    );
  }

  return (
    <BlogAdminMediaLibraryProvider userId={userProfile?.id ?? null}>
      <BlogEditorSidebarProvider>        <ActiveEditorProvider>
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#04190f]">
          <header className="z-40 flex h-12 shrink-0 items-center bg-[#072a1b] shadow-lg">
            <div className="flex h-full w-64 shrink-0 items-center gap-2.5 border-r border-white/10 px-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand-yellow">
                <span className="text-sm font-black leading-none text-brand-blue">BS</span>
              </div>
              <span className="truncate text-xs font-bold tracking-wide text-brand-yellow">VettaJimale.Tech Studio</span>
            </div>

            <div className="flex h-full min-w-0 items-stretch">
              <button
                type="button"
                onClick={() => navigate(cfg.adminBase)}
                className="flex h-full shrink-0 items-center gap-1.5 border-r border-white/10 px-3 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:px-4"
                title={`Back to ${cfg.plural.toLowerCase()} list`}
              >
                <ArrowLeft size={16} className="shrink-0" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <Link
                to={cfg.adminBase}
                className="flex items-center gap-2 border-b-2 border-transparent px-5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
              >
                <FileText size={14} />
                {cfg.plural} list
              </Link>
              <div className="flex items-center gap-2 border-b-2 border-brand-yellow bg-white/10 px-5 text-sm font-semibold text-white">
                <FileText size={14} className="text-brand-yellow" />
                Editor
              </div>
              <StudioHistoryButtons />
            </div>

            <div className="ml-auto flex items-center gap-2 px-3">
              {saveError ? (
                <span className="flex items-center gap-1 text-[11px] text-red-300">
                  <AlertCircle size={11} /> {saveError}
                </span>
              ) : saving ? (
                <span className="flex items-center gap-1 text-[11px] text-white/40">
                  <Loader2 size={11} className="animate-spin" /> Saving…
                </span>
              ) : autosaveStatus === 'saving' ? (
                <span className="text-[11px] text-white/40">Autosaving…</span>
              ) : autosaveStatus === 'pending' ? (
                <span className="text-[11px] text-white/50">Unsaved changes</span>
              ) : lastAutosavedAt ? (
                <span className="text-[11px] text-white/45">Autosaved {format(lastAutosavedAt, 'h:mm a')}</span>
              ) : null}

              <StatusDot status={form.status} />

              {form.contentMode === 'blocks' ? <BlogPageStructureHeaderControl /> : null}

              <button
                type="button"
                disabled={saving || !form.title.trim()}
                onClick={() => openPreviewWindow()}
                className="flex items-center gap-1.5 rounded-lg border border-white/25 px-2.5 py-1.5 text-xs font-semibold text-white/90 transition-colors hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Eye size={12} /> Preview
              </button>

              {form.status === 'published' && previewSlug ? (
                <a
                  href={cfg.publicPath(previewSlug)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/25 px-2.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
                >
                  View live
                </a>
              ) : null}

              <CmsEditorActionsMenu
                saving={saving}
                status={form.status}
                hasTitle={Boolean(form.title.trim())}
                hasId={Boolean(form.id)}
                onSaveDraft={() => void persistPage('draft')}
                onSave={() => void persistPage()}
                onPublish={() => void persistPage('published')}
                onUnpublish={() => void persistPage('draft')}
                onDelete={() => form.id && void onDelete(form.id)}
                publishLabel={`Publish ${cfg.singular.toLowerCase()}`}
              />
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <BlogAdminLeftColumn
              userProfile={userProfile}
              moduleBay={form.contentMode === 'blocks' ? <BlogAdminModuleBay /> : undefined}
            />

            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#F3EDE3]">
              <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {pendingLocalDraft ? (
                  <div className="mx-6 mt-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p>
                      Unsaved work from{' '}
                      <span className="font-semibold">
                        {format(new Date(pendingLocalDraft.savedAt), 'MMM d, yyyy · h:mm a')}
                      </span>{' '}
                      is available on this device.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={restoreLocalDraft}
                        className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-bold text-brand-yellow"
                      >
                        Restore work
                      </button>
                      <button
                        type="button"
                        onClick={dismissLocalDraft}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
                      >
                        Discard backup
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 pb-2 pt-5">
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))}
                    aria-describedby="page-status-help"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <span id="page-status-help" className="max-w-md text-[11px] font-medium leading-snug text-slate-500">
                    {(() => {
                      const stored = loadedRow?.id === form.id ? loadedRow : undefined;
                      const storedStatus = stored?.status === 'published' ? 'published' : 'draft';
                      if (stored && storedStatus === 'published' && form.status === 'draft') {
                        return (
                          <>
                            Pending offline — Save or <strong className="text-slate-700">Unpublish</strong> to remove{' '}
                            <span className="font-mono text-slate-600">{cfg.publicPath(previewSlug)}</span> (still live until then).
                          </>
                        );
                      }
                      if (stored && storedStatus === 'draft' && form.status === 'published') {
                        return (
                          <>
                            Pending go-live — Save or <strong className="text-slate-700">Publish</strong> above to expose{' '}
                            <span className="font-mono text-slate-600">{cfg.publicPath(previewSlug)}</span>.
                          </>
                        );
                      }
                      if (form.status === 'published') {
                        return (
                          <>
                            Live at <span className="font-mono text-slate-600">{cfg.publicPath(previewSlug)}</span> until you unpublish or set Draft and save.
                          </>
                        );
                      }
                      return <>Draft — not public until you Publish.</>;
                    })()}
                  </span>
                  <span className="text-sm font-medium text-slate-500">{publishedLabel}</span>
                  {previewSlug ? (
                    <span className="text-xs font-medium text-slate-500">
                      {form.status === 'published' ? (
                        <>
                          Public URL:{' '}
                          <a
                            href={cfg.publicPath(previewSlug)}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-brand-blue underline decoration-brand-blue/30 underline-offset-2 hover:decoration-brand-blue"
                          >
                            {cfg.publicPath(previewSlug)}
                          </a>
                        </>
                      ) : (
                        <>
                          After publish: <span className="font-mono text-slate-600">{previewSlug ? cfg.publicPath(previewSlug) : '/'}</span>
                        </>
                      )}
                    </span>
                  ) : null}
                  <div className="ml-auto flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-black uppercase tracking-widest">
                    <button
                      type="button"
                      onClick={switchToHtml}
                      className={`rounded-md px-3 py-1.5 ${form.contentMode === 'html' ? 'bg-brand-blue text-brand-yellow' : 'text-slate-500'}`}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={switchToBlocks}
                      className={`rounded-md px-3 py-1.5 ${form.contentMode === 'blocks' ? 'bg-brand-blue text-brand-yellow' : 'text-slate-500'}`}
                    >
                      Blocks
                    </button>
                  </div>
                </div>

                <BlogPostTitleField
                  placeholder={`${cfg.singular} title`}
                  value={form.title}
                  onChange={(title) => {
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: !slugTouched && !f.id ? slugifyTitle(title) : f.slug,
                    }));
                  }}
                />

                {form.contentMode === 'blocks' ? (
                  <div data-blog-post-editor-root className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="blog-editor-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-2 pr-2">
                      <BlogBlockEditor userId={userProfile?.id ?? null} />
                    </div>
                  </div>
                ) : (
                  <div className="blog-editor-scroll h-0 min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-2 pr-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black uppercase tracking-widest text-slate-400">Rich HTML</span>
                          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-black uppercase tracking-widest">
                            <button
                              type="button"
                              onClick={() => setHtmlSubView('edit')}
                              className={`rounded-md px-2.5 py-1.5 ${htmlSubView === 'edit' ? 'bg-brand-blue text-brand-yellow' : 'text-slate-500'}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setHtmlSubView('rendered')}
                              className={`rounded-md px-2.5 py-1.5 ${htmlSubView === 'rendered' ? 'bg-brand-blue text-brand-yellow' : 'text-slate-500'}`}
                            >
                              Rendered
                            </button>
                          </div>
                        </div>
                        <span>
                          <span className="font-bold text-slate-700">{htmlWordCount(form.body)}</span> words
                        </span>
                      </div>
                      {htmlSubView === 'edit' ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[10px] font-black uppercase tracking-widest">
                              <button
                                type="button"
                                onClick={() => setHtmlInputMode('raw')}
                                className={`rounded-md px-2.5 py-1.5 ${htmlInputMode === 'raw' ? 'bg-brand-blue text-brand-yellow' : 'text-slate-600'}`}
                              >
                                Raw source
                              </button>
                              <button
                                type="button"
                                disabled={prefersBlogRawHtmlEditor(form.body) || saving}
                                onClick={() => {
                                  if (prefersBlogRawHtmlEditor(form.body)) return;
                                  setHtmlInputMode('richtext');
                                }}
                                className={`rounded-md px-2.5 py-1.5 ${
                                  htmlInputMode === 'richtext' && !prefersBlogRawHtmlEditor(form.body)
                                    ? 'bg-brand-blue text-brand-yellow'
                                    : 'text-slate-600'
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                              >
                                Visual editor
                              </button>
                            </div>
                            {prefersBlogRawHtmlEditor(form.body) ? (
                              <span className="text-[11px] font-medium leading-snug text-slate-500">
                                Full-page HTML is kept only in Raw source.
                              </span>
                            ) : null}
                          </div>
                          {htmlInputMode === 'raw' ? (
                            <textarea
                              value={form.body}
                              spellCheck={false}
                              disabled={saving}
                              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                              className="block min-h-[min(62vh,640px)] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-slate-900 outline-none focus:border-brand-blue/40"
                              aria-label="Raw HTML"
                            />
                          ) : (
                            <OpEdRichEditor
                              value={form.body}
                              onChange={(html) => setForm((f) => ({ ...f, body: html }))}
                              placeholder="Page content…"
                              disabled={saving}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="not-prose max-h-[min(75vh,820px)] overflow-auto rounded-xl border border-slate-100 bg-[#fafafa] p-3">
                          <BlogArticleHtmlDisplay html={form.body} showFullDocumentCaption />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200/80 bg-[#F3EDE3]/95 px-6 py-2 text-xs text-slate-500 backdrop-blur-sm supports-[backdrop-filter]:bg-[#F3EDE3]/88">
                  <div className="flex flex-wrap items-center gap-3">
                    {form.contentMode === 'blocks' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (pageUsesBrandCanvas(blockList)) addSectionAt(blockList.length);
                            else openBlockPicker(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-blue shadow-sm transition hover:bg-brand-blue/5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {pageUsesBrandCanvas(blockList) ? 'Add' : 'Add block'}
                        </button>
                        <span>
                          <span className="font-bold text-slate-700">{blockWordStats.wc}</span> words · ~ {blockWordStats.readMins} min
                        </span>
                      </>
                    ) : (
                      <span>
                        <span className="font-bold text-slate-700">{htmlWordCount(form.body)}</span> words
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </main>
            <BlogAdminPostSettingsAside settingsHeading={`${cfg.singular} settings`}>
              <div className="shrink-0 space-y-2 border-b border-slate-100 bg-slate-50/90 px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Public URL</span>
                  <button
                    type="button"
                    disabled={!previewSlug}
                    onClick={() => void copyPublicPageUrl(previewSlug)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-brand-blue/30 hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
                <p className="break-all font-mono text-[11px] leading-snug text-slate-700">
                  {previewSlug ? absolutePagePublicUrl : '—'}
                </p>
                <CmsShortLinkPanel
                  resourceType={cfg.shortLinkType}
                  resourceId={form.id}
                  isPublished={form.status === 'published'}
                  userId={userProfile?.id ?? null}
                />
                {isPost ? (
                  <>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Publish date</span>
                      <input
                        type="date"
                        value={form.publish_date}
                        onChange={(e) => setForm((f) => ({ ...f, publish_date: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                      />
                      <span className="block text-[10px] text-slate-500">
                        Empty = the day you publish. A future date keeps it off the blog list until then.
                      </span>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Excerpt</span>
                      <textarea
                        value={form.excerpt}
                        onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                        rows={3}
                        placeholder="One or two sentences for the blog list and link previews…"
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-blue/40"
                      />
                    </label>
                    <PostCategoriesPanel postId={form.id} />
                    <PostCarouselActions
                      title={form.title}
                      excerpt={form.excerpt}
                      body={form.body}
                      contentMode={form.contentMode}
                      slug={form.slug || previewSlug}
                      postId={form.id || null}
                      featuredImageUrl={form.featured_image_url}
                    />
                  </>
                ) : (
                  <>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Layout</span>
                      <select
                        value={form.layout}
                        onChange={(e) => setForm((f) => ({ ...f, layout: e.target.value as PageLayout }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        <option value="article">Article: title on top, narrow column</option>
                        <option value="landing">Landing: full-width sections, no title</option>
                      </select>
                    </label>
                    <HomepageToggle pageId={form.id} isPublished={loadedRow?.status === 'published'} />
                    <HomepageToggle pageId={form.id} isPublished={loadedRow?.status === 'published'} target="kit" />
                  </>
                )}
                <p className="text-[10px] font-medium leading-snug text-slate-500">
                  {savedSitePageRow?.updated_at
                    ? `Last saved ${format(new Date(savedSitePageRow.updated_at), 'MMM d, yyyy · h:mm a')}`
                    : !form.id
                      ? 'Not saved yet — Save to record updates.'
                      : null}
                </p>
              </div>
              <div className="blog-editor-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
                <div className="space-y-6">
                  <div className="border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={() => setCoverOpen((o) => !o)}
                      className="flex w-full items-center justify-between group"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 group-hover:text-slate-600">
                        Cover image
                      </span>
                      <ChevronDown size={13} className={`text-slate-300 transition-transform ${coverOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {coverOpen ? (
                      <div className="mt-3 space-y-3">
                        <FileUpload
                          variant="compact"
                          bucket="media-public"
                          label="Featured image"
                          type="image"
                          accept="image/*"
                          value={form.featured_image_url}
                          onChange={(url) => setForm((f) => ({ ...f, featured_image_url: url }))}
                        />
                        <input
                          value={form.featured_image_alt}
                          onChange={(e) => setForm((f) => ({ ...f, featured_image_alt: e.target.value }))}
                          placeholder="Alt text…"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-blue/40"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <button type="button" onClick={() => setSeoOpen((o) => !o)} className="flex w-full items-center justify-between group">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 group-hover:text-slate-600">SEO</span>
                      <ChevronDown size={13} className={`text-slate-300 transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {seoOpen ? (
                      <div className="mt-3 space-y-3">
                        <input
                          value={form.seo_title}
                          onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
                          placeholder="SEO title…"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-blue/40"
                        />
                        <p className="text-right text-[10px] text-slate-400">{(form.seo_title || '').length}/60</p>
                        <textarea
                          value={form.seo_description}
                          onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
                          placeholder="Meta description…"
                          rows={3}
                          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-brand-blue/40"
                        />
                        <p className="text-right text-[10px] text-slate-400">{(form.seo_description || '').length}/160</p>
                        <div className="flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs focus-within:border-brand-blue/40">
                          <span className="shrink-0 text-slate-400">{isPost ? '/blog/' : '/'}</span>
                          <input
                            value={form.slug}
                            onChange={(e) => {
                              setSlugTouched(true);
                              setForm((f) => ({ ...f, slug: e.target.value }));
                            }}
                            className="ml-1 flex-1 font-mono text-slate-600 outline-none"
                            placeholder={isPost ? 'post-slug' : 'page-slug'}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </BlogAdminPostSettingsAside>
          </div>
        </div>
        <BlogBlockEditModalHost />
      </ActiveEditorProvider>
      </BlogEditorSidebarProvider>
    </BlogAdminMediaLibraryProvider>
  );
}
