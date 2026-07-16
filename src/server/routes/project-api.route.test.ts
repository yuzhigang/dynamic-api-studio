import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { projectApiRoute } from '@/server/routes/project-api.route'
import { getPublishedApp } from '@/server/domains/api-runtime/published-router'
import { platformDb } from '@/server/infra/db/db'
import { dbAvailable } from '@/server/infra/db/db-test-helpers'
import { seedDemoData } from '@/server/infra/db/seed'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

// 运行唯一 path：避免跨运行累积触发 UNIQUE(project_id, method, path) 冲突（路由经单例 repo 提交，无法事务回滚）。
const testPath = `/api/v1/rt/test-${Date.now()}`

function publishedDef(path: string): ApiDefinitionDraft {
  return {
    projectId: 'project_order', status: 'published', name: path, path, method: 'GET',
    tags: [], permissions: [], requireAuth: false, bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { ok: true }' }],
  } as ApiDefinitionDraft
}

// 依赖平台库（canCreateApi + rebuildPublishedRouter 走 DB）。无 .env 时整组跳过，保持离线 `pnpm test` 仍绿。
describe.skipIf(!dbAvailable)('project-api route + published dispatch', () => {
  beforeAll(async () => {
    await seedDemoData(platformDb)
  })

  afterAll(async () => {
    // 按 path 前缀硬删测试创建的 api，避免跨运行累积/唯一冲突。seed api 路径不在此前缀下，不受影响。
    await platformDb.deleteFrom('api').where('path', 'like', '/api/v1/rt/%').execute()
  })

  it('save publishes a callable route and 409s on path+method collision', async () => {
    const a = await projectApiRoute.request('/project_order/apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...publishedDef(testPath), projectId: 'project_order' }),
    })
    expect(a.status).toBe(200)

    const live = await getPublishedApp().request(testPath)
    expect(live.status).toBe(200)

    const b = await projectApiRoute.request('/project_order/apis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...publishedDef(testPath), projectId: 'project_order', name: 'collision' }),
    })
    expect(b.status).toBe(409)
  })
})