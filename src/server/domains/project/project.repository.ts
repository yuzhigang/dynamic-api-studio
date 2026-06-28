import type { Project, ProjectDraft } from '@/shared/contracts/project.contract'

const now = '2026-06-27T00:00:00.000Z'

const seedProjects: Project[] = [
  {
    id: 'project_order',
    code: 'ORDER',
    name: '订单中心',
    description: '订单查询、明细和商品组装 API',
    icon: 'ShoppingCart',
    color: 'blue',
    status: 'active',
    apiCount: 6,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'project_crm',
    code: 'CRM',
    name: '客户中心',
    description: '客户档案与画像相关 API',
    icon: 'Users',
    color: 'emerald',
    status: 'active',
    apiCount: 0,
    createdAt: now,
    updatedAt: now,
  },
]

export class ProjectRepository {
  private projects = new Map(seedProjects.map((project) => [project.id, project]))

  list() {
    return Array.from(this.projects.values())
  }

  get(projectId: string) {
    return this.projects.get(projectId)
  }

  save(draft: ProjectDraft) {
    const timestamp = new Date().toISOString()
    const id = draft.id ?? `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const existing = this.projects.get(id)
    const project: Project = {
      id,
      code: draft.code,
      name: draft.name,
      description: draft.description,
      icon: draft.icon ?? existing?.icon,
      color: draft.color ?? existing?.color,
      status: existing?.status ?? 'active',
      apiCount: existing?.apiCount ?? 0,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    this.projects.set(id, project)
    return project
  }

  archive(projectId: string) {
    const project = this.projects.get(projectId)

    if (!project) {
      return undefined
    }

    const archived: Project = {
      ...project,
      status: 'archived',
      updatedAt: new Date().toISOString(),
    }

    this.projects.set(projectId, archived)
    return archived
  }

  canCreateApi(projectId: string) {
    return this.projects.get(projectId)?.status === 'active'
  }

  copy(projectId: string) {
    const project = this.projects.get(projectId)

    if (!project) {
      return undefined
    }

    const timestamp = new Date().toISOString()
    const copied: Project = {
      ...project,
      id: `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      code: `${project.code}_COPY`,
      name: `${project.name} 副本`,
      status: 'active',
      apiCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    this.projects.set(copied.id, copied)
    return copied
  }
}
