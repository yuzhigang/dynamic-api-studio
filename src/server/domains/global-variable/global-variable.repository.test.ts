import { describe, expect, it } from 'vitest'

import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import type { GlobalVariableDraft } from '@/shared/contracts/global-variable.contract'

const singleDraft: GlobalVariableDraft = {
  name: 'tenant_id',
  label: '租户 ID',
  kind: 'single',
  value: 'acme',
  items: [],
}

const listDraft: GlobalVariableDraft = {
  name: 'allowed_status',
  label: '允许状态',
  kind: 'list',
  value: '',
  items: ['active', 'frozen'],
}

describe('GlobalVariableRepository', () => {
  it('seeds with at least one single and one list variable', () => {
    const repository = new GlobalVariableRepository()
    const all = repository.list()

    expect(all.some((variable) => variable.kind === 'single')).toBe(true)
    expect(all.some((variable) => variable.kind === 'list')).toBe(true)
  })

  it('creates a new variable with generated id and equal timestamps', () => {
    const repository = new GlobalVariableRepository()
    const before = repository.list().length

    const created = repository.save(singleDraft)

    expect(created.id).toBeTruthy()
    expect(created.name).toBe('tenant_id')
    expect(created.createdAt).toBe(created.updatedAt)
    expect(repository.list()).toHaveLength(before + 1)
  })

  it('updates an existing variable while preserving createdAt', () => {
    const repository = new GlobalVariableRepository()
    const created = repository.save(listDraft)

    const updated = repository.save({ ...listDraft, id: created.id, label: '改名后' })

    expect(updated.id).toBe(created.id)
    expect(updated.label).toBe('改名后')
    expect(updated.createdAt).toBe(created.createdAt)
  })

  it('rejects a duplicate name on create', () => {
    const repository = new GlobalVariableRepository()
    repository.save(singleDraft)

    expect(() => repository.save({ ...singleDraft })).toThrowError(/已存在/)
  })

  it('allows saving the same variable without triggering its own duplicate check', () => {
    const repository = new GlobalVariableRepository()
    const created = repository.save(singleDraft)

    expect(() => repository.save({ ...singleDraft, id: created.id })).not.toThrow()
  })

  it('removes a variable', () => {
    const repository = new GlobalVariableRepository()
    const created = repository.save(singleDraft)

    expect(repository.remove(created.id)).toBe(true)
    expect(repository.get(created.id)).toBeUndefined()
    expect(repository.remove(created.id)).toBe(false)
  })
})
