import { useMemo } from 'react'

import { cn } from '@/lib/cn'
import { CodeMirrorEditor } from '@/components/editors/code-mirror-editor'
import { resolveEditorAppearance, type EditorAppearance } from '@/components/editors/editor-appearance'
import { useEditorAppearance } from '@/components/editors/use-editor-appearance'

type JsonCodeEditorProps = {
  value: string
  onChange: (value: string) => void
  /**
   * 额外的语义校验，仅在 JSON 语法合法时调用。
   * 返回错误信息（多条以换行分隔）或 null（通过）。
   */
  validate?: (parsed: unknown) => string | null
  /** 空字符串是否合法。默认 true（表示不传请求体）。 */
  allowEmpty?: boolean
  /** 覆盖全局编辑器外观（字体、字号、配色）。 */
  appearance?: Partial<EditorAppearance>
}

function getError(value: string, allowEmpty: boolean, validate?: JsonCodeEditorProps['validate']) {
  const trimmed = value.trim()

  if (trimmed === '') {
    return allowEmpty ? null : '请求体不能为空'
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (error) {
    return `JSON 格式错误：${error instanceof Error ? error.message : '无法解析'}`
  }

  return validate?.(parsed) ?? null
}

export function JsonCodeEditor({ value, onChange, validate, allowEmpty = true, appearance }: JsonCodeEditorProps) {
  const { appearance: globalAppearance } = useEditorAppearance()
  const resolvedAppearance = appearance ? resolveEditorAppearance(appearance) : globalAppearance
  const error = useMemo(() => getError(value, allowEmpty, validate), [value, allowEmpty, validate])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <CodeMirrorEditor language="json" value={value} appearance={resolvedAppearance} onChange={onChange} />
      </div>
      {error ? (
        <div
          role="alert"
          className={cn(
            'shrink-0 whitespace-pre-line border-t border-destructive/30 bg-destructive/5',
            'px-3 py-1.5 text-xs font-medium text-destructive',
          )}
        >
          {error}
        </div>
      ) : null}
    </div>
  )
}
