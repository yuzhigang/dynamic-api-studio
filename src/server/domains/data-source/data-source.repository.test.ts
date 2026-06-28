import { describe, expect, it } from 'vitest'

import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import type { DataSourceDraft } from '@/shared/contracts/data-source.contract'

const draft: DataSourceDraft = {
  name: '测试库',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'demo',
  username: 'root',
  password: 'secret',
  description: '',
}

describe('DataSourceRepository', () => {
  it('creates a new data source with generated id and timestamps', () => {
    const repository = new DataSourceRepository()
    const before = repository.list().length

    const created = repository.save(draft)

    expect(created.id).toBeTruthy()
    expect(created.name).toBe('测试库')
    expect(created.createdAt).toBe(created.updatedAt)
    expect(repository.list()).toHaveLength(before + 1)
  })

  it('updates an existing data source while preserving createdAt', () => {
    const repository = new DataSourceRepository()
    const created = repository.save(draft)

    const updated = repository.save({ ...draft, id: created.id, name: '改名后' })

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('改名后')
    expect(updated.createdAt).toBe(created.createdAt)
  })

  it('removes a data source', () => {
    const repository = new DataSourceRepository()
    const created = repository.save(draft)

    expect(repository.remove(created.id)).toBe(true)
    expect(repository.get(created.id)).toBeUndefined()
    expect(repository.remove(created.id)).toBe(false)
  })

  it('reports success when host and database are present', () => {
    const repository = new DataSourceRepository()

    expect(repository.testConnection(draft).success).toBe(true)
  })

  it('reports failure when host is missing', () => {
    const repository = new DataSourceRepository()

    const result = repository.testConnection({ ...draft, host: '  ' })

    expect(result.success).toBe(false)
    expect(result.message).toContain('连接失败')
  })
})
