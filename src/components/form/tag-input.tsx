import { X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'

type TagInputProps = {
  id?: string
  name?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

const separators = /[、,，]/

/** 以 tag 列表（chips）方式展示和增删字符串数组。回车/逗号添加，退格删除末项，点 × 删除指定项。 */
export function TagInput({ id, name, value, onChange, placeholder, className }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const tokens = raw
      .split(separators)
      .map((token) => token.trim())
      .filter(Boolean)

    if (tokens.length > 0) {
      const next = [...value]
      for (const token of tokens) {
        if (!next.includes(token)) {
          next.push(token)
        }
      }
      onChange(next)
    }

    setDraft('')
  }

  const removeAt = (index: number) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，' || event.key === '、') {
      event.preventDefault()
      commit(draft)
      return
    }

    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      event.preventDefault()
      removeAt(value.length - 1)
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-1',
        className,
      )}
    >
      {value.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
        >
          {item}
          <button
            type="button"
            className="text-slate-400 hover:text-slate-700"
            onClick={() => removeAt(index)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">删除 {item}</span>
          </button>
        </span>
      ))}
      <Input
        id={id}
        name={name}
        value={draft}
        autoComplete="off"
        placeholder={value.length === 0 ? placeholder : ''}
        className="h-6 min-w-[80px] flex-1 border-0 px-1 py-0 shadow-none focus-visible:ring-0"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
      />
    </div>
  )
}
