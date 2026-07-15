import type { Context } from 'hono'

import type { ApiDefinitionDraft, RequestParam } from '@/shared/schemas/api-definition.schema'
import type { WorkflowDeps } from '@/server/workflow/workflow-runner'
import { runWorkflow } from '@/server/workflow/workflow-runner'
import type { GlobalVariableLoaderServices } from '@/server/workflow/global-variable-loader'
import { loadGlobalValues } from '@/server/workflow/global-variable-loader'

/** Per-route handler for a published API: zod-openapi validates the request; we merge
 *  c.req.valid() by location, run the workflow, and map the result to an HTTP response. */
export async function liveHandler(
  c: Context,
  def: ApiDefinitionDraft,
  deps: WorkflowDeps,
  services: GlobalVariableLoaderServices,
): Promise<Response> {
  const has = (loc: RequestParam['location']) => def.requestParams.some((p) => p.location === loc)
  const validQuery = has('query') ? c.req.valid('query' as never) : {}
  const validHeader = has('header') ? c.req.valid('header' as never) : {}
  const validBody = has('body') && def.bodyContentType === 'json' ? c.req.valid('json' as never) : {}
  const inputValues: Record<string, unknown> = {}
  for (const p of def.requestParams) {
    if (p.location === 'query') inputValues[p.name] = (validQuery as Record<string, unknown>)[p.name]
    else if (p.location === 'header') inputValues[p.name] = (validHeader as Record<string, unknown>)[p.name]
    else inputValues[p.name] = (validBody as Record<string, unknown>)[p.name]
  }

  const globalValues = loadGlobalValues(def.projectId, services)
  const run = await runWorkflow(def, inputValues, globalValues, deps, { onLog: (log) => console.log(log.step, log.status, log.durationMs) })

  if (run.status === 'success') return c.json(run.response, 200)
  const status = run.error?.code === 'INVALID_INPUT' ? 400 : 500
  return c.json({ code: run.error?.code, message: run.error?.message, details: run.error?.details }, status)
}