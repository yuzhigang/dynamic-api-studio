import { X } from 'lucide-react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { removeListItem } from '@/modules/variables/utils/string-list'
import { commitTag } from '@/modules/variables/utils/tag-input'

type TagListEditorProps = {
  items: string[]
  onChange: (items: string[]) => void
}

export function TagListEditor({ items, onChange }: TagListEditorProps) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    onChange(commitTag(items, draft))
    setDraft('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit()
      return
    }

    if (event.key === 'Backspace' && draft === '' && items.length > 0) {
      event.preventDefault()
      onChange(removeListItem(items, items.length - 1))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700"
        >
          {item}
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700"
            onClick={() => onChange(removeListItem(items, index))}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">删除 {item}</span>
          </button>
        </span>
      ))}
      <Input
        value={draft}
        autoComplete="off"
        placeholder={items.length === 0 ? '输入后回车添加…' : ''}
        className="h-6 min-w-[80px] flex-1 border-0 px-1 py-0 shadow-none focus-visible:ring-0"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
      />
    </div>
  )
}
