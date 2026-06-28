import { describe, expect, it } from 'vitest'

import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { createEmptyApiDefinition } from '@/shared/api-definition/create-empty-api-definition'

describe('project-scoped api repositories', () => {
  it('lists only APIs that belong to the requested project', () => {
    const repository = new ApiDefinitionRepository()
    const initialOrderApiCount = repository.list('project_order').length

    repository.save('project_order', createEmptyApiDefinition({ projectId: 'project_order', name: '订单 API' }))
    repository.save('project_crm', createEmptyApiDefinition({ projectId: 'project_crm', name: '客户 API' }))

    expect(repository.list('project_order')).toHaveLength(initialOrderApiCount + 1)
    expect(repository.list('project_order').map((api) => api.name)).toContain('订单 API')
    expect(repository.list('project_order').map((api) => api.name)).not.toContain('客户 API')
  })

  it('preserves the requested API lifecycle status when saving', () => {
    const repository = new ApiDefinitionRepository()
    const saved = repository.save(
      'project_order',
      createEmptyApiDefinition({
        projectId: 'project_order',
        name: '已发布 API',
        status: 'published',
      }),
    )

    expect(saved.status).toBe('published')
    expect(repository.list('project_order').find((api) => api.id === saved.id)?.status).toBe(
      'published',
    )
  })

  it('prevents API creation for archived projects', () => {
    const projectRepository = new ProjectRepository()

    projectRepository.archive('project_order')

    expect(projectRepository.canCreateApi('project_order')).toBe(false)
  })

  it('copies a project as a new active project container', () => {
    const projectRepository = new ProjectRepository()

    const copied = projectRepository.copy('project_order')

    expect(copied).toMatchObject({
      code: 'ORDER_COPY',
      name: '订单中心 副本',
      status: 'active',
      apiCount: 0,
    })
    expect(copied?.id).not.toBe('project_order')
    expect(projectRepository.list().map((project) => project.id)).toContain(copied?.id)
  })
})
