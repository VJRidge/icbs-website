import { CUSTOM_CONTENT_TYPES, type CustomContentTypeKey } from '../../lib/customContentTypes';
import { STRUCTURED_FIELD_CONTROLS } from '../../lib/customContent/structuredFieldControls';

function setValue(fields: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const next = { ...fields };
  if (value === '' || value == null) delete next[key];
  else next[key] = value;
  return next;
}

export default function StructuredFieldsPanel({
  typeKey,
  fields,
  onChange,
}: {
  typeKey: CustomContentTypeKey;
  fields: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const controls = STRUCTURED_FIELD_CONTROLS[typeKey];
  const type = CUSTOM_CONTENT_TYPES[typeKey];

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="font-serif text-xl font-black text-slate-900">{type.singular} fields</h2>
        <p className="mt-1 text-sm text-slate-600">{type.description} Required fields are enforced on publish, not on draft save.</p>
      </div>
      {controls.map((control) => {
        const value = fields[control.key];
        const label = `${control.label}${control.requiredOnPublish ? ' (required to publish)' : ''}`;
        if (control.input === 'boolean') {
          return (
            <label key={control.key} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => onChange(setValue(fields, control.key, e.target.checked))}
              />
              {label}
            </label>
          );
        }
        if (control.input === 'select') {
          return (
            <label key={control.key} className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
              <select
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(setValue(fields, control.key, e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {(control.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        }
        if (control.input === 'textarea' || control.input === 'url_list') {
          return (
            <label key={control.key} className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
              <textarea
                value={control.input === 'url_list' && Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : ''}
                onChange={(e) =>
                  onChange(
                    setValue(
                      fields,
                      control.key,
                      control.input === 'url_list'
                        ? e.target.value.split(/\n+/).map((item) => item.trim()).filter(Boolean)
                        : e.target.value,
                    ),
                  )
                }
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
          );
        }
        return (
          <label key={control.key} className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            <input
              type={control.input === 'datetime' ? 'datetime-local' : control.input === 'url' ? 'url' : control.input}
              value={typeof value === 'string' ? value : ''}
              onChange={(e) => onChange(setValue(fields, control.key, e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
        );
      })}
    </section>
  );
}
