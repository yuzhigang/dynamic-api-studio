import { Pagination } from '@/components/ui/pagination'

type InvocationLogPaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function InvocationLogPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: InvocationLogPaginationProps) {
  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      className="px-3 py-2"
    />
  )
}
