import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, Loader2, Save, Trash2 } from 'lucide-react';

type CmsEditorActionsMenuProps = {
  saving: boolean;
  status: 'draft' | 'published';
  hasTitle: boolean;
  hasId: boolean;
  onSaveDraft: () => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
  publishLabel?: string;
};

/** Top-right actions: Publish (or Save when live) + Save Draft menu (unpublish, delete). */
export default function CmsEditorActionsMenu({
  saving,
  status,
  hasTitle,
  hasId,
  onSaveDraft,
  onSave,
  onPublish,
  onUnpublish,
  onDelete,
  publishLabel = 'Publish',
}: CmsEditorActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const menuBtnCls =
    'inline-flex items-center gap-1 border border-white/25 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50';
  const splitMainCls =
    'inline-flex items-center gap-1.5 border border-white/25 border-r-0 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50';

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {status === 'published' ? (
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="flex items-center gap-1.5 rounded-lg bg-brand-yellow px-4 py-1.5 text-xs font-bold text-brand-blue transition-colors hover:bg-brand-yellow/90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save
        </button>
      ) : null}

      <div className="inline-flex items-stretch">
        {status === 'draft' ? (
          <button
            type="button"
            disabled={saving || !hasTitle}
            onClick={onSaveDraft}
            className={`${splitMainCls} rounded-l-lg`}
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save Draft
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => setOpen((o) => !o)}
          className={`${menuBtnCls} ${status === 'draft' ? 'rounded-r-lg' : 'rounded-lg'}`}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {status === 'published' ? (
            <>
              Save Draft
              <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
            </>
          ) : (
            <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
          )}
        </button>
      </div>

      {status === 'draft' ? (
        <button
          type="button"
          disabled={saving || !hasTitle}
          onClick={onPublish}
          className="flex items-center gap-1.5 rounded-lg bg-brand-yellow px-4 py-1.5 text-xs font-bold text-brand-blue transition-colors hover:bg-brand-yellow/90 disabled:opacity-40"
        >
          <Globe size={12} /> {publishLabel}
        </button>
      ) : null}

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          {status === 'published' ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onUnpublish();
              }}
            >
              Unpublish
            </button>
          ) : null}
          {hasId ? (
            <>
              {status === 'published' ? <div className="my-1 border-t border-slate-100" /> : null}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
