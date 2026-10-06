import type { ToolReviewPublishCheck } from '../../lib/customContent/toolReviewPublishChecks';

/** Live pre-publish checklist for tool reviews (disclosure + verification). */
export default function ToolReviewPublishChecklist({
  checks,
}: {
  checks: ToolReviewPublishCheck[];
}) {
  const blocked = checks.some((c) => !c.ok);
  return (
    <section
      className={`rounded-xl border p-4 ${
        blocked ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
      }`}
      aria-live="polite"
    >
      <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-600">
        Pre-publish checklist
      </h2>
      <ul className="mt-3 space-y-2">
        {checks.map((check) => (
          <li key={check.code} className="flex gap-2 text-sm">
            <span
              className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                check.ok ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
              aria-hidden
            />
            <div>
              <p className={`font-semibold ${check.ok ? 'text-emerald-900' : 'text-amber-950'}`}>
                {check.label}
                <span className="sr-only">{check.ok ? ' passed' : ' needs attention'}</span>
              </p>
              {!check.ok ? <p className="text-xs text-amber-900/80">{check.detail}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      {blocked ? (
        <p className="mt-3 text-xs font-semibold text-amber-950">
          Publish stays disabled until every check passes.
        </p>
      ) : (
        <p className="mt-3 text-xs font-semibold text-emerald-900">Ready to publish a frozen public snapshot.</p>
      )}
    </section>
  );
}
