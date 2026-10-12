import type { ChangeEvent, ReactNode } from 'react'

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="resource-form-section">
      <h2>{title}</h2>
      <div className="resource-form-fields">{children}</div>
    </section>
  )
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  multiline,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  multiline?: boolean
  rows?: number
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const common = {
    id,
    value,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    className: 'resource-form-input',
  }
  return (
    <label className="resource-form-label" htmlFor={id}>
      <span>{label}</span>
      {hint ? <span className="resource-form-hint">{hint}</span> : null}
      {multiline ? <textarea {...common} rows={rows} /> : <input type="text" {...common} />}
    </label>
  )
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="resource-form-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
