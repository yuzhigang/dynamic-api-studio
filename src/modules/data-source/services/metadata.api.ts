import { apiFetch } from '@/lib/api-fetch'

export type DatasourceMetadata = {
  datasourceId: string
  tables: Array<{
    name: string
    columns: Array<{ name: string; type: string; comment?: string }>
  }>
}

export async function getDatasourceMetadata(datasourceId: string) {
  return apiFetch<DatasourceMetadata>(`/api/metadata/${datasourceId}`)
}
