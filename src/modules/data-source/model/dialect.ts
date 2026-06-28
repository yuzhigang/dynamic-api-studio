import type { Dialect } from '@/shared/contracts/data-source.contract'

export const dialectOptions: Array<{ value: Dialect; label: string; defaultPort: number }> = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
  { value: 'oracle', label: 'Oracle', defaultPort: 1521 },
  { value: 'sqlserver', label: 'SQL Server', defaultPort: 1433 },
  { value: 'tdengine', label: 'TDengine', defaultPort: 6030 },
]

export function dialectLabel(dialect: Dialect) {
  return dialectOptions.find((option) => option.value === dialect)?.label ?? dialect
}

export function defaultPortFor(dialect: Dialect) {
  return dialectOptions.find((option) => option.value === dialect)?.defaultPort ?? 0
}
