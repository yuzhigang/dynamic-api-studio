import { apiFetch } from '@/lib/api-fetch'
import type {
  DataSource,
  DataSourceDraft,
  TestConnectionResult,
} from '@/shared/contracts/data-source.contract'

export function listDataSources() {
  return apiFetch<DataSource[]>('/api/datasources')
}

export function getDataSource(dataSourceId: string) {
  return apiFetch<DataSource>(`/api/datasources/${dataSourceId}`)
}

export function saveDataSource(draft: DataSourceDraft) {
  return apiFetch<DataSource>(
    draft.id ? `/api/datasources/${draft.id}` : '/api/datasources',
    {
      method: draft.id ? 'PUT' : 'POST',
      body: JSON.stringify(draft),
    },
  )
}

export function deleteDataSource(dataSourceId: string) {
  return apiFetch<{ success: boolean }>(`/api/datasources/${dataSourceId}`, {
    method: 'DELETE',
  })
}

export function testConnection(draft: DataSourceDraft) {
  return apiFetch<TestConnectionResult>('/api/datasources/test-connection', {
    method: 'POST',
    body: JSON.stringify(draft),
  })
}
