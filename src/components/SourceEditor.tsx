interface SourceEditorProps {
  value: string
  onChange: (value: string) => void
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  return (
    <textarea
      className="source-editor"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Write Markdown..."
      spellCheck={false}
    />
  )
}
