import { AlertTriangle } from 'lucide-react';
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore';
import { collectBuilderA11yIssues } from '../../../lib/blog/builderA11yIssues';

/** Live accessibility checklist for the working builder document. */
export default function BlogEditorA11yWarnings() {
  const blocks = useBlogEditorStore((s) => s.blocks);
  const selectBlock = useBlogEditorStore((s) => s.selectBlock);
  const issues = collectBuilderA11yIssues(blocks);

  if (issues.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={14} aria-hidden />
        Accessibility checks
      </div>
      <ul className="mt-1.5 space-y-1">
        {issues.slice(0, 8).map((issue, idx) => (
          <li key={`${issue.code}-${issue.blockId ?? idx}`} className="text-xs">
            <span className={issue.severity === 'error' ? 'font-semibold text-red-800' : 'text-amber-900'}>
              {issue.severity === 'error' ? 'Error' : 'Warning'}:
            </span>{' '}
            {issue.message}
            {issue.blockId ? (
              <>
                {' '}
                <button
                  type="button"
                  className="font-semibold text-brand-blue underline"
                  onClick={() => selectBlock(issue.blockId!)}
                >
                  Select block
                </button>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {issues.length > 8 ? <p className="mt-1 text-[11px] text-amber-800">+{issues.length - 8} more</p> : null}
    </div>
  );
}
