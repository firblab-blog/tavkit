import { useState } from 'react'
import Icon from '@/components/common/Icon'

interface ArrayFieldEditorProps {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  description?: string
  maxItems?: number
}

export function ArrayFieldEditor({
  label,
  values,
  onChange,
  placeholder = 'Add item...',
  description,
  maxItems,
}: ArrayFieldEditorProps) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (trimmed && (!maxItems || values.length < maxItems)) {
      onChange([...values, trimmed])
      setInputValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const canAdd = !maxItems || values.length < maxItems

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text">{label}</label>
      {description && <p className="text-xs text-text-muted">{description}</p>}

      {/* Existing items */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-background-panel border border-border rounded text-sm text-text"
            >
              {value}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="text-text-muted hover:text-red-400 transition-colors"
              >
                <Icon name="X" className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add input */}
      {canAdd && (
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-text text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="px-3 py-2 bg-background-panel border border-border rounded-lg text-text-muted hover:text-text hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Icon name="Plus" className="w-4 h-4" />
          </button>
        </div>
      )}

      {maxItems && (
        <p className="text-xs text-text-muted">
          {values.length}/{maxItems} items
        </p>
      )}
    </div>
  )
}
