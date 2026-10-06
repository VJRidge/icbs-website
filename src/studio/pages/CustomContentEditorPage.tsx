import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import AdminCmsShell from '../components/admin/AdminCmsShell';
import StructuredFieldsPanel from '../components/customContent/StructuredFieldsPanel';
import ToolReviewPublishChecklist from '../components/customContent/ToolReviewPublishChecklist';
import ContentRelationshipsPanel from '../components/customContent/ContentRelationshipsPanel';
import { supabase } from '../lib/supabase';
import { isAnyAdminProfile } from '../lib/adminPermissions';
import { CUSTOM_CONTENT_TYPE_KEYS, CUSTOM_CONTENT_TYPES, type CustomContentTypeKey } from '../lib/customContentTypes';
import { buildCustomContentDraft, buildCustomContentPublish, isMissingCustomContentSchema, publicPathForCustomContent } from '../lib/customContent/customContentDraft';
import {
  collectToolReviewPublishChecks,
  toolReviewPublishBlocked,
} from '../lib/customContent/toolReviewPublishChecks';
import { recordActivity } from '../lib/cms/activityLog';
import { pendingReviewPatch, returnFromReviewPatch } from '../lib/cms/pendingReview';
import PendingReviewControls from '../components/cms/PendingReviewControls';
import type { UserProfile } from '../types';

function asTypeKey(value: string | undefined): CustomContentTypeKey | null {
  return CUSTOM_CONTENT_TYPE_KEYS.includes(value as CustomContentTypeKey) ? (value as CustomContentTypeKey) : null;
}

function normalizeCustomStatus(raw: string | null | undefined): 'draft' | 'pending_review' | 'published' {
  if (raw === 'published') return 'published';
  if (raw === 'pending_review') return 'pending_review';
  return 'draft';
}

export default function CustomContentEditorPage({ userProfile }: { userProfile: UserProfile | null }) {
  const { typeKey: rawType, contentId } = useParams<{ typeKey: string; contentId: string }>();
  const typeKey = asTypeKey(rawType);
  const navigate = useNavigate();
  const isNew = contentId === 'new' || !contentId;
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [typeId, setTypeId] = useState<string | null>(null);
  const [schemaVersion, setSchemaVersion] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [status, setStatus] = useState<'draft' | 'pending_review' | 'published'>('draft');
  const [livePath, setLivePath] = useState<string | null>(null);

  const type = typeKey ? CUSTOM_CONTENT_TYPES[typeKey] : null;

  const publishChecks = useMemo(() => {
    if (typeKey !== 'tool_review') return [];
    return collectToolReviewPublishChecks({ title, slug, fields });
  }, [typeKey, title, slug, fields]);
  const publishBlocked = typeKey === 'tool_review' && toolReviewPublishBlocked(publishChecks);

  const loadType = useCallback(async () => {
    if (!typeKey) return;
    const { data, error: typeError } = await supabase
      .from('content_types')
      .select('id, schema_version')
      .eq('key', typeKey)
      .maybeSingle();
    if (typeError) {
      setSchemaMissing(isMissingCustomContentSchema(typeError));
      setError(typeError.message);
      return;
    }
    if (!data?.id) {
      setSchemaMissing(true);
      return;
    }
    setTypeId(data.id);
    setSchemaVersion(data.schema_version ?? 1);
    setSchemaMissing(false);
  }, [typeKey]);

  useEffect(() => {
    if (!isAnyAdminProfile(userProfile) || !typeKey) return;
    void loadType();
  }, [userProfile, typeKey, loadType]);

  useEffect(() => {
    if (!typeId || isNew || !contentId) return;
    let gone = false;
    void supabase
      .from('contents')
      .select('title, slug, structured_fields, status')
      .eq('id', contentId)
      .eq('kind', 'custom')
      .eq('content_type_id', typeId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (gone) return;
        if (loadError) {
          setError(loadError.message);
          return;
        }
        if (!data) {
          setError('Record not found.');
          return;
        }
        setTitle(data.title ?? '');
        setSlug(data.slug ?? '');
        setFields((data.structured_fields as Record<string, unknown> | null) ?? {});
        setStatus(normalizeCustomStatus(data.status));
        setLivePath(publicPathForCustomContent(typeKey ?? '', data.slug ?? ''));
      });
    return () => {
      gone = true;
    };
  }, [typeId, isNew, contentId]);

  if (!typeKey || !type) {
    return (
      <AdminCmsShell title="Structured content" userProfile={userProfile}>
        <p className="p-8 text-sm text-slate-600">Unknown content type.</p>
      </AdminCmsShell>
    );
  }

  const persist = async (intent: 'draft' | 'publish') => {
    if (!userProfile?.id || !typeId || !typeKey) return;
    if (intent === 'publish' && publishBlocked) {
      setError('Pre-publish checklist must pass before publishing.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload =
        intent === 'publish'
          ? buildCustomContentPublish({
              typeKey,
              typeId,
              schemaVersion,
              title,
              slug,
              authorId: userProfile.id,
              fields,
            })
          : buildCustomContentDraft({
              typeKey,
              typeId,
              schemaVersion,
              title,
              slug,
              authorId: userProfile.id,
              fields,
            });
      if (isNew) {
        const { data, error: insertError } = await supabase
          .from('contents')
          .insert({ ...payload } as Record<string, unknown>)
          .select('id, slug, status')
          .single();
        if (insertError) throw insertError;
        setStatus(normalizeCustomStatus(data.status));
        setLivePath(publicPathForCustomContent(typeKey, data.slug ?? payload.slug));
        if (intent === 'publish') {
          void recordActivity({
            actorId: userProfile.id,
            action: 'content.publish',
            entity: 'contents',
            entityId: data.id,
            meta: { kind: 'custom', typeKey, slug: data.slug },
          });
        }
        navigate(`/admin/content/${typeKey}/${data.id}`, { replace: true });
      } else if (contentId) {
        const { error: updateError } = await supabase
          .from('contents')
          .update({ ...payload } as Record<string, unknown>)
          .eq('id', contentId)
          .eq('kind', 'custom');
        if (updateError) throw updateError;
        setStatus(normalizeCustomStatus(payload.status));
        setLivePath(publicPathForCustomContent(typeKey, payload.slug));
        if (intent === 'publish') {
          void recordActivity({
            actorId: userProfile.id,
            action: 'content.publish',
            entity: 'contents',
            entityId: contentId,
            meta: { kind: 'custom', typeKey, slug: payload.slug },
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      setSchemaMissing(isMissingCustomContentSchema(err as { code?: string; message?: string }));
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    await persist('draft');
  };

  return (
    <AdminCmsShell
      title={isNew ? `New ${type.singular.toLowerCase()}` : type.singular}
      titleIcon={<ClipboardCheck size={14} className="text-brand-yellow" />}
      backTo={`/admin/content/${typeKey}`}
      userProfile={userProfile}
    >
      <form onSubmit={(e) => void onSave(e)} className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
        {schemaMissing ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            The structured-content schema is not applied yet. This editor will not change existing pages or posts.
          </p>
        ) : null}
        {error && !schemaMissing ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
        ) : null}
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm" />
        </label>
        <StructuredFieldsPanel typeKey={typeKey} fields={fields} onChange={setFields} />
        {typeKey === 'tool_review' ? <ToolReviewPublishChecklist checks={publishChecks} /> : null}
        {!isNew && contentId && typeKey ? (
          <ContentRelationshipsPanel
            sourceContentId={contentId}
            sourceType={typeKey}
            actorId={userProfile?.id}
          />
        ) : null}
        <p className="text-xs text-slate-500">
          Drafts never change the public site. Publish writes a frozen snapshot to `/reviews/:slug`.
        </p>
        {status === 'published' && livePath ? (
          <a href={livePath} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-blue hover:underline">
            View live review
          </a>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || schemaMissing || !typeId}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {typeKey === 'tool_review' ? (
            <button
              type="button"
              disabled={saving || schemaMissing || !typeId || publishBlocked}
              onClick={() => void persist('publish')}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-yellow disabled:opacity-50"
            >
              Publish review
            </button>
          ) : null}
          {!isNew && contentId ? (
            <PendingReviewControls
              status={status}
              userProfile={userProfile}
              disabled={saving || schemaMissing}
              onSubmitForReview={() => {
                void (async () => {
                  setSaving(true);
                  setError(null);
                  const { error: updError } = await supabase
                    .from('contents')
                    .update(pendingReviewPatch())
                    .eq('id', contentId)
                    .eq('kind', 'custom');
                  setSaving(false);
                  if (updError) {
                    setError(updError.message);
                    return;
                  }
                  setStatus('pending_review');
                  void recordActivity({
                    actorId: userProfile?.id,
                    action: 'content.submit_review',
                    entity: 'contents',
                    entityId: contentId,
                    meta: { typeKey },
                  });
                })();
              }}
              onReturnToDraft={() => {
                void (async () => {
                  setSaving(true);
                  setError(null);
                  const { error: updError } = await supabase
                    .from('contents')
                    .update(returnFromReviewPatch())
                    .eq('id', contentId)
                    .eq('kind', 'custom');
                  setSaving(false);
                  if (updError) {
                    setError(updError.message);
                    return;
                  }
                  setStatus('draft');
                  void recordActivity({
                    actorId: userProfile?.id,
                    action: 'content.return_review',
                    entity: 'contents',
                    entityId: contentId,
                    meta: { typeKey },
                  });
                })();
              }}
            />
          ) : null}
        </div>
      </form>
    </AdminCmsShell>
  );
}
