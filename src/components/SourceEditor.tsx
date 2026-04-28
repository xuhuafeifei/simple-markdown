import { useState, useRef, useLayoutEffect } from 'react'

interface SourceEditorProps {
  value: string
  onChange: (value: string) => void
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Sync when external value changes (e.g. Display → Source mode switch)
  useLayoutEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChangeRef.current(newValue), 150)
  }

  return (
    <textarea
      className="source-editor"
      value={localValue}
      onChange={e => handleChange(e.target.value)}
      placeholder="Write Markdown..."
      spellCheck={false}
    />
  )
}
