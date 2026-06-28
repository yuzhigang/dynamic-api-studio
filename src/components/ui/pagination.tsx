import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
  /** 是否显示「第 X / Y 页」信息，false 时仅保留左右翻页按钮 */
  showInfo?: boolean
}

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
  showInfo = true,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)

  return (
    <nav
      aria-label="分页导航"
      className={cn('flex items-center justify-end gap-3 text-sm text-muted-foreground', className)}
    >
      {showInfo ? (
        <span className="tabular-nums">
          第 {currentPage} / {totalPages} 页
        </span>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="上一页"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="下一页"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}

export { Pagination, type PaginationProps }
