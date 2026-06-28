import { describe, expect, it } from 'vitest'

import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import type { ProjectVariableDraft } from '@/shared/contracts/project-variable.contract'

const draft: ProjectVariableDraft = {
  name: 'region',
  label: '区域',
  kind: 'single',
  value: 'CN',
  items: [],
}

describe('ProjectVariableRepository', () => {
  it('lists only variables for the given project', () => {
    const repository = new ProjectVariableRepository()
    const created = repository.save('project_alpha', draft)

    expect(repository.list('project_alpha')).toContainEqual(created)
    expect(repository.list('project_beta')).not.toContainEqual(created)
  })

  it('creates a variable with generated id, projectId and equal timestamps', () => {
    const repository = new ProjectVariableRepository()

    const created = repository.save('project_alpha', draft)

    expect(created.id).toBeTruthy()
    expect(created.projectId).toBe('project_alpha')
    expect(created.createdAt).toBe(created.updatedAt)
  })

  it('updates an existing variable while preserving createdAt', () => {
    const repository = new ProjectVariableRepository()
    const created = repository.save('project_alpha', draft)

    const updated = repository.save('project_alpha', { ...draft, id: created.id, label: '改名后' })

    expect(updated.id).toBe(created.id)
    expect(updated.label).toBe('改名后')
    expect(updated.createdAt).toBe(created.createdAt)
  })

  it('rejects a duplicate name within the same project', () => {
    const repository = new ProjectVariableRepository()
    repository.save('project_alpha', draft)

    expect(() => repository.save('project_alpha', { ...draft })).toThrowError(/已存在/)
  })

  it('allows the same name in a different project', () => {
    const repository = new ProjectVariableRepository()
    repository.save('project_alpha', draft)

    expect(() => repository.save('project_beta', { ...draft })).not.toThrow()
  })

  it('clears items for single kind and value for list kind', () => {
    const repository = new ProjectVariableRepository()

    const single = repository.save('p', { name: 'a', label: 'A', kind: 'single', value: '1', items: ['x'] })
    const list = repository.save('p', { name: 'b', label: 'B', kind: 'list', value: 'stale', items: ['x', 'y'] })

    expect(single.items).toEqual([])
    expect(list.value).toBe('')
    expect(list.items).toEqual(['x', 'y'])
  })

  it('removes a variable', () => {
    const repository = new ProjectVariableRepository()
    const created = repository.save('project_alpha', draft)

    expect(repository.remove(created.id)).toBe(true)
    expect(repository.get(created.id)).toBeUndefined()
    expect(repository.remove(created.id)).toBe(false)
  })
})
