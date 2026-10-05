import { useEffect, useState } from 'react'
import { useBlogEditorStore } from '../../../lib/blog/useBlogEditorStore'
import { clearDeviceOverride, readDeviceOverride, withDeviceOverride } from '../../../lib/blog/blockStyle'
import { deviceStyleValueOk } from '../../../lib/blog/deviceStyleValue'
import type { BlogBlock } from '../../../lib/blog/blogBlockTypes'

const FIELDS: { key: string; label: string }[] = [
  { key: 'align', label: 'Alignment' },
  { key: 'fontSize', label: 'Font size' },
  { key: 'color', label: 'Color' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'textColor', label: 'Text color' },
  { key: 'size', label: 'Size' },
  { key: 'buttonWidth', label: 'Width' },
  { key: 'marginTop', label: 'Space above' },
  { key: 'marginBottom', label: 'Space below' },
]

export default function DeviceStyleOverrides({ block }: { block: BlogBlock }) {
  const device = useBlogEditorStore((s) => s.previewDevice)
  const updateBlock = useBlogEditorStore((s) => s.updateBlock)
  if (device === 'desktop') {
    return (
      <p className="mb-3 text-[11px] leading-snug text-slate-500">
        Desktop uses the styles below. Choose Tablet or Phone above the canvas to override them for that size.
      </p>
    )
  }
  const current = readDeviceOverride(block.data, device)
  const label = device === 'tablet' ? 'Tablet' : 'Phone'
  return (
    <div className="mb-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{label} overrides</p>
        <button
          type="button"
          className="text-[10px] font-bold uppercase tracking-wide text-slate-500"
          onClick={() => updateBlock(block.id, clearDeviceOverride(block.data, device))}
        >
          Reset
        </button>
      </div>
      {FIELDS.map((field) => (
        <label key={field.key} className="block text-[11px] text-slate-600">
          {field.label}
          {field.key === 'align' ? (
            <select
              className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1"
              value={String(current.align ?? '')}
              onChange={(event) => updateBlock(block.id, withDeviceOverride(block.data, device, 'align', event.target.value))}
            >
              <option value="">Same as desktop</option>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          ) : (
            <StyleOverrideInput
              fieldKey={field.key}
              saved={String(current[field.key] ?? '')}
              onCommit={(value) => updateBlock(block.id, withDeviceOverride(block.data, device, field.key, value))}
            />
          )}
        </label>
      ))}
    </div>
  )
}

function StyleOverrideInput({
  fieldKey,
  saved,
  onCommit,
}: {
  fieldKey: string
  saved: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState(saved)
  useEffect(() => {
    setDraft(saved)
  }, [saved])
  return (
    <input
      className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1"
      value={draft}
      placeholder="Same as desktop"
      onChange={(event) => {
        const next = event.target.value
        setDraft(next)
        if (deviceStyleValueOk(fieldKey, next)) onCommit(next)
      }}
      onBlur={() => {
        if (!deviceStyleValueOk(fieldKey, draft)) setDraft(saved)
      }}
    />
  )
}
