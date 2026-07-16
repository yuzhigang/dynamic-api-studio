import { apiFetch } from '@/lib/api-fetch'
import type { DataSourceSchema } from '@/shared/contracts/data-source.contract'

export async function getDataSourceSchema(datasourceId: string) {
  return apiFetch<DataSourceSchema>(`/api/data-source/${datasourceId}/schema`)
}