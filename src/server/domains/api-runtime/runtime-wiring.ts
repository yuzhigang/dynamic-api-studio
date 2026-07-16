import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { InvocationLogRepository } from '@/server/domains/invocation-log/invocation-log.repository'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { UserRepository } from '@/server/domains/auth/user.repository'
import { AuthSessionStore } from '@/server/domains/auth/auth-session.store'
import type { AuthDeps } from '@/server/domains/auth/auth.contract'
import { rebuildPublishedRouter } from '@/server/domains/api-runtime/published-router'
import { authRoute } from '@/server/domains/auth/auth.route'
import { platformDb } from '@/server/infra/db/db'

export const apiDefinitionRepository = new ApiDefinitionRepository(platformDb)
export const dataSourceRepository = new DataSourceRepository(platformDb)
export const invocationLogRepository = new InvocationLogRepository(platformDb)
export const userRepository = new UserRepository()
export const authSessionStore = new AuthSessionStore()

export const runtimeDeps = {
  knexRegistry: new KnexRegistry(),
  getDataSource: (id: string) => dataSourceRepository.get(id),
  analyzer: new EnhancedSqlAnalyzer(),
} as const

export const runtimeServices = {
  globalVariableService: new GlobalVariableService(new GlobalVariableRepository(platformDb)),
  projectVariableService: new ProjectVariableService(new ProjectVariableRepository(platformDb)),
} as const

export const authDeps: AuthDeps = {
  verifyToken: (t) => authSessionStore.verify(t),
  getPermissions: (id) => userRepository.getPermissions(id),
}

/** The auth (login) route — shares the session store + user repo with authDeps. */
export const authApp = authRoute(userRepository, authSessionStore)

let publishedRuntimePromise: Promise<void> | undefined

/**
 * 首次调用时从 DB（listPublished）构建 published 路由；幂等（后续调用返回同一 promise）。
 * app.ts 在 published 分发前 await 它，避免模块加载期 TLA 触发 DB、保持离线 import 安全。
 */
export function initPublishedRuntime(): Promise<void> {
  if (!publishedRuntimePromise) {
    publishedRuntimePromise = rebuildPublishedRouter(
      runtimeDeps,
      runtimeServices,
      apiDefinitionRepository,
      authDeps,
    )
  }
  return publishedRuntimePromise
}