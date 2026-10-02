type Props = {
  enabled: boolean
  onCommand: (cmd: string, value?: string) => void
}

function Btn({ label, onClick, enabled }: { label: string; onClick: () => void; enabled: boolean }) {
  return (
    <button type="button" disabled={!enabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {label}
    </button>
  )
}

export default function FormatToolbar({ enabled, onCommand }: Props) {
  return (
    <div className="doc-toolbar" role="toolbar" aria-label="Text formatting">
      <Btn enabled={enabled} label="B" onClick={() => onCommand('bold')} />
      <Btn enabled={enabled} label="I" onClick={() => onCommand('italic')} />
      <Btn enabled={enabled} label="U" onClick={() => onCommand('underline')} />
      <span />
      <Btn enabled={enabled} label="• List" onClick={() => onCommand('insertUnorderedList')} />
      <Btn enabled={enabled} label="1. List" onClick={() => onCommand('insertOrderedList')} />
      <span />
      <Btn enabled={enabled} label="Left" onClick={() => onCommand('justifyLeft')} />
      <Btn enabled={enabled} label="Center" onClick={() => onCommand('justifyCenter')} />
      <Btn enabled={enabled} label="Right" onClick={() => onCommand('justifyRight')} />
      <span />
      <Btn
        enabled={enabled}
        label="Link"
        onClick={() => {
          const href = window.prompt('Link URL')
          if (href) onCommand('createLink', href)
        }}
      />
      <Btn enabled={enabled} label="Clear" onClick={() => onCommand('removeFormat')} />
    </div>
  )
}
