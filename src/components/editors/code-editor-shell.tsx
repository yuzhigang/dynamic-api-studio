import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'
import { useState, type PropsWithChildren, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'
import { EditorAppearanceSettingsButton } from '@/components/editors/editor-appearance-settings-button'

/** 约三行代码的最小高度（含编辑器上下内边距），匹配 defaultEditorAppearance
 * 的 14px 字号 / 1.6 行高，单位 px。 */
const THREE_LINE_MIN_HEIGHT = 88

type CodeEditorShellProps = PropsWithChildren<{
  title?: ReactNode
  className?: string
  /**
   * 固定高度（像素）。如果未提供，编辑器将自适应内容高度。
   */
  height?: number
  /**
   * 最小高度，仅在不使用固定 height 时生效。默认保持约三行的最低高度；
   * 传 0 可关闭该最小高度。
   */
  minHeight?: number
  /** 最大高度，仅在不使用固定 height 时生效。 */
  maxHeight?: number
  /** 是否让编辑器占满剩余空间。适合放在 flex 容器内。 */
  flex?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  onMaximize?: () => void
  /** 是否在标题栏显示编辑器风格设置按钮。默认 true。 */
  showAppearanceSettings?: boolean
}>

export function CodeEditorShell({
  title,
  className,
  height,
  minHeight,
  maxHeight,
  flex = false,
  children,
  collapsible,
  defaultExpanded = true,
  expanded: controlledExpanded,
  onExpandedChange,
  onMaximize,
  showAppearanceSettings = true,
}: CodeEditorShellProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = controlledExpanded ?? internalExpanded

  const toggle = () => {
    const next = !isExpanded
    setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  const showHeader = Boolean(title || collapsible || onMaximize)

  // Keep at least three lines visible unless the caller fixes the height,
  // wants the editor to fill flex space, or explicitly opts out (minHeight={0}).
  const effectiveMinHeight = minHeight ?? (flex ? undefined : THREE_LINE_MIN_HEIGHT)

  return (
    <div
      className={cn(
        'code-editor-shell overflow-hidden rounded-md border border-slate-200 bg-white transition-colors',
        'focus-within:border-ring focus-within:ring-1 focus-within:ring-ring',
        flex && 'flex min-h-0 flex-1 flex-col',
        className,
      )}
    >
      {showHeader ? (
        <div className="flex h-8 items-center border-b border-slate-200 pl-3 pr-1 text-xs font-medium text-slate-600">
          {collapsible ? (
            <button
              type="button"
              className="min-w-0 flex-1 self-stretch truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-expanded={isExpanded}
              onClick={toggle}
            >
              {title}
            </button>
          ) : (
            <span className="min-w-0 flex-1 truncate">{title}</span>
          )}
          <div className="flex shrink-0 items-center">
            {showAppearanceSettings ? <EditorAppearanceSettingsButton /> : null}
            {onMaximize ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onMaximize}
                    aria-label="放大编辑器"
                  >
                    <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>放大编辑器</TooltipContent>
              </Tooltip>
            ) : null}
            {collapsible ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggle}
                    aria-label={isExpanded ? '收起编辑器' : '展开编辑器'}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isExpanded ? '收起编辑器' : '展开编辑器'}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>
      ) : null}
      {isExpanded ? (
        <div
          style={
            height != null
              ? { height }
              : {
                  ...(effectiveMinHeight != null ? { minHeight: effectiveMinHeight } : {}),
                  ...(maxHeight != null ? { maxHeight } : {}),
                }
          }
          className={cn(
            'min-h-0 overflow-auto',
            height == null && !flex && 'h-auto',
            flex && 'flex-1',
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
