import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'
import { useState, type PropsWithChildren, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

type CodeEditorShellProps = PropsWithChildren<{
  title?: ReactNode
  className?: string
  /**
   * 固定高度（像素）。如果未提供，编辑器将自适应内容高度。
   */
  height?: number
  /** 最小高度，仅在不使用固定 height 时生效。 */
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
}: CodeEditorShellProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = controlledExpanded ?? internalExpanded

  const toggle = () => {
    const next = !isExpanded
    setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  const showHeader = Boolean(title || collapsible || onMaximize)

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-slate-200 bg-white',
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
                  ...(minHeight != null ? { minHeight } : {}),
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
