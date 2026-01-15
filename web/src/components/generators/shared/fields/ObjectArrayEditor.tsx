import { useState } from 'react'
import Icon from '@/components/common/Icon'

interface ObjectItem {
  name: string
  description: string
  [key: string]: unknown
}

interface ObjectArrayEditorProps {
  label: string
  values: ObjectItem[]
  onChange: (values: ObjectItem[]) => void
  nameLabel?: string
  descriptionLabel?: string
  namePlaceholder?: string
  descriptionPlaceholder?: string
  description?: string
  maxItems?: number
  extraFields?: {
    key: string
    label: string
    type: 'text' | 'number' | 'select'
    placeholder?: string
    options?: { value: string; label: string }[]
  }[]
}

export function ObjectArrayEditor({
  label,
  values,
  onChange,
  nameLabel = 'Name',
  descriptionLabel = 'Description',
  namePlaceholder = 'Name...',
  descriptionPlaceholder = 'Description...',
  description,
  maxItems,
  extraFields = [],
}: ObjectArrayEditorProps) {
  const [newItem, setNewItem] = useState<ObjectItem>({ name: '', description: '' })
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    if (newItem.name.trim()) {
      onChange([
        ...values,
        { ...newItem, name: newItem.name.trim(), description: newItem.description.trim() },
      ])
      setNewItem({ name: '', description: '' })
      setIsAdding(false)
    }
  }

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  const handleUpdate = (index: number, field: string, value: unknown) => {
    const updated = [...values]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const canAdd = !maxItems || values.length < maxItems

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text">{label}</label>
        {canAdd && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
          >
            <Icon name="Plus" className="w-3 h-3" />
            Add
          </button>
        )}
      </div>
      {description && <p className="text-xs text-text-muted">{description}</p>}

      {/* Existing items */}
      {values.length > 0 && (
        <div className="space-y-2">
          {values.map((item, index) => (
            <div
              key={index}
              className="p-3 bg-background-panel border border-border rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder={namePlaceholder}
                  className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-text placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-text-muted hover:text-red-400 p-1"
                >
                  <Icon name="Trash2" className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={item.description}
                onChange={(e) => handleUpdate(index, 'description', e.target.value)}
                placeholder={descriptionPlaceholder}
                rows={2}
                className="w-full px-2 py-1 bg-background border border-border rounded text-sm text-text placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              {extraFields.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-20">{field.label}:</span>
                  {field.type === 'select' ? (
                    <select
                      value={String(item[field.key] || '')}
                      onChange={(e) => handleUpdate(index, field.key, e.target.value)}
                      className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={String(item[field.key] || '')}
                      onChange={(e) =>
                        handleUpdate(
                          index,
                          field.key,
                          field.type === 'number' ? Number(e.target.value) : e.target.value
                        )
                      }
                      placeholder={field.placeholder}
                      className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-text placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Add new item form */}
      {isAdding && (
        <div className="p-3 bg-primary/5 border border-primary/30 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted w-20">{nameLabel}:</span>
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder={namePlaceholder}
              className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-text placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-text-muted w-20 pt-1">{descriptionLabel}:</span>
            <textarea
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              placeholder={descriptionPlaceholder}
              rows={2}
              className="flex-1 px-2 py-1 bg-background border border-border rounded text-sm text-text placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewItem({ name: '', description: '' })
              }}
              className="px-3 py-1 text-sm text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newItem.name.trim()}
              className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {values.length === 0 && !isAdding && (
        <p className="text-xs text-text-muted italic">No items added yet</p>
      )}

      {maxItems && (
        <p className="text-xs text-text-muted">
          {values.length}/{maxItems} items
        </p>
      )}
    </div>
  )
}
