import { OpenAPIHono } from '@hono/zod-openapi'

import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'
import type { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import type { WorkflowDeps } from '@/server/workflow/workflow-runner'
import type { GlobalVariableLoaderServices } from '@/server/workflow/global-variable-loader'
import type { AuthDeps } from '@/server/domains/auth/auth.contract'
import { buildRoute } from '@/server/domains/api-runtime/definition-to-openapi'
import { liveHandler } from '@/server/domains/api-runtime/live-handler'

let currentPublishedApp: OpenAPIHono = new OpenAPIHono()

export function getPublishedApp(): OpenAPIHono {
  return currentPublishedApp
}

export function registerPublishedRoute(
  app: OpenAPIHono,
  def: ApiDefinitionDraft,
  deps: WorkflowDeps,
  services: GlobalVariableLoaderServices,
  authDeps: AuthDeps,
): void {
  const route = buildRoute(def)
  app.openapi(route, (c) => liveHandler(c, def, deps, services, authDeps) as never)
}

/** Rebuild the inner published app from the live repo. Cheap; call on startup and after every api save. */
export function rebuildPublishedRouter(
  deps: WorkflowDeps,
  services: GlobalVariableLoaderServices,
  repository: ApiDefinitionRepository,
  authDeps: AuthDeps,
): void {
  const app = new OpenAPIHono()
  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', { type: 'http', scheme: 'bearer' })
  for (const def of repository.listPublished()) {
    registerPublishedRoute(app, def, deps, services, authDeps)
  }
  app.doc('/api/openapi', { openapi: '3.0.0', info: { title: 'Dynamic API Studio', version: '1.0.0' } })
  currentPublishedApp = app
}