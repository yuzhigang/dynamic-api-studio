# Published-API Runtime (Part B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `status="published"` API definitions into callable Hono routes (via `@hono/zod-openapi`) that delegate to the Part A `runWorkflow` engine, plus an OpenAPI discovery endpoint.

**Architecture:** A stable outer catch-all in `app.ts` delegates unmatched `/api/*` requests to a swappable inner `OpenAPIHono` that registers one zod-openapi route per published definition. On every api-definition save, `rebuildPublishedRouter()` rebuilds the inner app from the live repo (cheap, no drift). Each route's handler reads `c.req.valid()` (zod-openapi validates+coerces the request) → `loadGlobalValues` → `runWorkflow` → returns the raw assemble output (200) or a structured error (400/500). `GET /api/openapi` serves the auto-generated OpenAPI doc.

**Tech Stack:** Hono, `@hono/zod-openapi` 1.4.0 (OpenAPIHono / createRoute / z), zod, vitest. Co-located `*.test.ts`. Path alias `@/` → `src/`.

## Global Constraints

- `@hono/zod-openapi` 1.4.0 is already in `package.json` (committed to `main`). Imports: `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'`.
- Verified zod-openapi behavior (do not re-litigate): `app.openapi(route, handler)` validates the **request** by default (400 in zod format `{"success":false,"error":{...}}`) and does **not** validate the response (raw body passes through). `c.req.valid('query'/'header'/'json')` returns the validated+coerced values. `app.doc(path, { openapi: { info: { title, version } } })` registers the OpenAPI JSON endpoint. `app.request(path)` drives in-process tests.
- Run a single test file: `node_modules/.bin/vitest run <path>` (`pnpm test` hits a sandbox TTY check — use the vitest binary; same config + `@/` alias).
- Type check: `tsc -p tsconfig.json --noEmit` and `tsc -p tsconfig.node.json --noEmit` (`pnpm typecheck` hits a sandbox install error — run tsc directly).
- Lint: `npx eslint <files>` on changed files (`pnpm lint` hits a sandbox install error).
- zod-openapi's TypeScript types are strict. If `tsc` errors on a `createRoute`/`app.openapi` shape, read `node_modules/@hono/zod-openapi/dist/index.d.ts` (via the package's type entry) and adjust to the installed signature — the intent of each call is stated in the task. Runtime behavior is verified above.
- New modules live under `src/server/domains/api-runtime/`. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. TDD, frequent commits.

## File Structure

| File | Responsibility |
| ---- | --------------- |
| `src/server/domains/api-definition/api-definition.repository.ts` | Add `listPublished()` + `isPathMethodUnique()` |
| `src/server/domains/api-definition/api-definition.repository.test.ts` | New test for the two methods |
| `src/server/domains/api-runtime/definition-to-openapi.ts` | `buildRoute(def)` — translate a def into a zod-openapi route (zod schemas + metadata) |
| `src/server/domains/api-runtime/definition-to-openapi.test.ts` | Test the generated schemas via `safeParse` |
| `src/server/domains/api-runtime/live-handler.ts` | `liveHandler(c, def, deps, services)` — `c.req.valid()` → `loadGlobalValues` → `runWorkflow` → HTTP mapping |
| `src/server/domains/api-runtime/live-handler.test.ts` | Test via a hand-built zod-openapi route + real `runWorkflow` (js-transform only, no DB) |
| `src/server/domains/api-runtime/published-router.ts` | `currentPublishedApp` + `getPublishedApp()` + `rebuildPublishedRouter()` + `registerPublishedRoute()` + `app.doc('/api/openapi')` |
| `src/server/domains/api-runtime/published-router.test.ts` | Build/dispatch/rebuild + OpenAPI doc |
| `src/server/domains/api-runtime/runtime-wiring.ts` | Shared `apiDefinitionRepository`/`runtimeDeps`/`runtimeServices` + `initPublishedRuntime()` |
| `src/server/app.ts` | Add outer catch-all delegation + startup rebuild |
| `src/server/routes/project-api.route.ts` | After save: uniqueness 409 + `rebuildPublishedRouter()` |
| `src/server/routes/project-api.route.test.ts` | New test: save publishes a callable route + 409 on collision |
| `CLAUDE.md` | Add `server/domains/api-runtime/` to the structure |

---

### Task 1: Repository extensions (`listPublished`, `isPathMethodUnique`)

**Files:**
- Modify: `src/server/domains/api-definition/api-definition.repository.ts`
- Create: `src/server/domains/api-definition/api-definition.repository.test.ts`

**Interfaces:**
- Consumes: `ApiDefinitionDraft` from `@/shared/contracts/api-definition.contract`.
- Produces: `repository.listPublished(): ApiDefinitionDraft[]`; `repository.isPathMethodUnique(path: string, method: string, exceptId?: string): boolean`.

- [ ] **Step 1: Write the failing test**

`src/server/domains/api-definition/api-definition.repository.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'

describe('ApiDefinitionRepository published lookups', () => {
  const repository = new ApiDefinitionRepository()

  it('listPublished returns only published drafts', () => {
    const published = repository.listPublished()
    expect(published.every((d) => d.status === 'published')).toBe(true)
    expect(published.map((d) => d.id).sort()).toEqual(
      ['api_order_detail', 'api_order_query', 'api_product_query', 'api_report_internal'].sort(),
    )
  })

  it('isPathMethodUnique is false for an existing published (path, method)', () => {
    expect(repository.isPathMethodUnique('/api/v1/order/query', 'POST')).toBe(false)
  })

  it('isPathMethodUnique is true when excluding the conflicting def itself', () => {
    expect(repository.isPathMethodUnique('/api/v1/order/query', 'POST', 'api_order_query')).toBe(true)
  })

  it('isPathMethodUnique is true for a brand new path', () => {
    expect(repository.isPathMethodUnique('/api/v1/brand/new', 'POST')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/server/domains/api-definition/api-definition.repository.test.ts`
Expected: FAIL — `repository.listPublished is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add these two methods to the `ApiDefinitionRepository` class in `src/server/domains/api-definition/api-definition.repository.ts` (after the existing `save` method, inside the class):

```ts
  listPublished(): ApiDefinitionDraft[] {
    return Array.from(this.drafts.values()).filter((draft) => draft.status === 'published')
  }

  isPathMethodUnique(path: string, method: string, exceptId?: string): boolean {
    return !this.listPublished().some(
      (draft) => draft.path === path && draft.method === method && draft.id !== exceptId,
    )
  }
```

(`ApiDefinitionDraft` is already imported at the top of the file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/server/domains/api-definition/api-definition.repository.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/domains/api-definition/api-definition.repository.ts src/server/domains/api-definition/api-definition.repository.test.ts
git commit -m "feat(api-definition): add listPublished + isPathMethodUnique" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Translator (`definition-to-openapi.ts`)

**Files:**
- Create: `src/server/domains/api-runtime/definition-to-openapi.ts`
- Create: `src/server/domains/api-runtime/definition-to-openapi.test.ts`

**Interfaces:**
- Consumes: `ApiDefinitionDraft`, `RequestParam`, `SchemaField` from `@/shared/schemas/api-definition.schema`; `createRoute`, `z` from `@hono/zod-openapi`.
- Produces: `buildRoute(def: ApiDefinitionDraft): ReturnType<typeof createRoute>` — a zod-openapi route with `method` (lowercased), `path`, `request` (query/headers/body schemas only for locations the def uses; body only when `bodyContentType === 'json'`), `responses` (200/400/500), and `summary`/`description`/`tags`. Query/header scalars use `z.coerce.*` (they arrive as strings); body scalars are uncoerced.

- [ ] **Step 1: Write the failing test**

`src/server/domains/api-runtime/definition-to-openapi.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildRoute } from '@/server/domains/api-runtime/definition-to-openapi'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function def(overrides: Partial<ApiDefinitionDraft> = {}): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'published', name: '订单查询', path: '/api/v1/order/query',
    method: 'POST', tags: ['订单'], permissions: [], bodyContentType: 'json',
    requestParams: [
      { id: 'r1', name: 'id', location: 'query', type: 'integer', required: true },
      { id: 'r2', name: 'name', location: 'query', type: 'string', required: false },
    ],
    responseSchema: [{ id: 'f1', name: 'total', type: 'integer', required: true }],
    localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { total: 1 }' }],
    ...overrides,
  } as ApiDefinitionDraft
}

describe('buildRoute', () => {
  it('builds a route with method/path/metadata', () => {
    const route = buildRoute(def())
    expect(route.method).toBe('post')
    expect(route.path).toBe('/api/v1/order/query')
  })

  it('coerces query integer (string -> number) and validates', () => {
    const route = buildRoute(def())
    const querySchema = (route.request as { query?: { safeParse: (v: unknown) => { success: boolean; data?: unknown } } }).query
    expect(querySchema).toBeDefined()
    expect(querySchema!.safeParse({ id: '7' })).toMatchObject({ success: true, data: { id: 7 } })
    expect(querySchema!.safeParse({ id: 'abc' }).success).toBe(false)
  })

  it('requires the required param and makes optional ones optional', () => {
    const route = buildRoute(def())
    const querySchema = (route.request as { query?: { safeParse: (v: unknown) => { success: boolean } } }).query
    expect(querySchema!.safeParse({}).success).toBe(false) // id required
  })

  it('omits body schema when there are no body params', () => {
    const route = buildRoute(def())
    expect((route.request as { body?: unknown }).body).toBeUndefined()
  })

  it('builds a body schema for json body params (uncoerced)', () => {
    const route = buildRoute(def({ bodyContentType: 'json', requestParams: [{ id: 'r1', name: 'payload', location: 'body', type: 'integer', required: true }] }))
    const bodySchema = (route.request as { body?: { content: { 'application/json': { schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } } } } } }).body!.content['application/json'].schema
    expect(bodySchema.safeParse({ payload: 7 })).toMatchObject({ success: true, data: { payload: 7 } })
    expect(bodySchema.safeParse({ payload: '7' }).success).toBe(false) // body not coerced
  })

  it('registers 200/400/500 responses', () => {
    const route = buildRoute(def())
    expect(Object.keys(route.responses).sort()).toEqual(['200', '400', '500'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/server/domains/api-runtime/definition-to-openapi.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/server/domains/api-runtime/definition-to-openapi.ts`:

```ts
import { createRoute, z } from '@hono/zod-openapi'

import type { ApiDefinitionDraft, RequestParam, SchemaField } from '@/shared/schemas/api-definition.schema'

type ScalarType = RequestParam['type']
type Loc = 'query' | 'header' | 'body'

function scalarSchema(type: ScalarType, location: Loc): z.ZodTypeAny {
  const coerce = location !== 'body' // query/header arrive as strings
  switch (type) {
    case 'string': return z.string()
    case 'integer': return coerce ? z.coerce.number().int() : z.number().int()
    case 'decimal': return coerce ? z.coerce.number() : z.number()
    case 'boolean': return coerce
      ? z.preprocess((v) => (typeof v === 'boolean' ? v : String(v) === 'true'), z.boolean())
      : z.boolean()
    case 'array': return z.array(z.unknown())
    case 'object': return z.record(z.unknown())
  }
}

function objectForParams(params: RequestParam[], loc: Loc): z.ZodObject<z.ZodRawShape> | undefined {
  if (params.length === 0) return undefined
  const shape: z.ZodRawShape = {}
  for (const p of params) {
    const base = scalarSchema(p.type, loc)
    shape[p.name] = p.required ? base : base.optional()
  }
  return z.object(shape)
}

function requestSchemaFor(def: ApiDefinitionDraft) {
  const byLoc = (loc: RequestParam['location']) => def.requestParams.filter((p) => p.location === loc)
  const query = objectForParams(byLoc('query'), 'query')
  const headers = objectForParams(byLoc('header'), 'header')
  const bodyParams = byLoc('body')
  const body = bodyParams.length > 0 && def.bodyContentType === 'json'
    ? { content: { 'application/json': { schema: objectForParams(bodyParams, 'body')! } } }
    : undefined
  const request: Record<string, unknown> = {}
  if (query) request.query = query
  if (headers) request.headers = headers
  if (body) request.body = body
  return request
}

function responseFieldSchema(field: SchemaField): z.ZodTypeAny {
  if (field.type === 'object' && field.children && field.children.length > 0) {
    const shape: z.ZodRawShape = {}
    for (const child of field.children) {
      shape[child.name] = child.required ? responseFieldSchema(child) : responseFieldSchema(child).optional()
    }
    return z.object(shape)
  }
  if (field.type === 'array') return z.array(z.unknown())
  return scalarSchema(field.type, 'body')
}

function responseSchema(def: ApiDefinitionDraft): z.ZodTypeAny {
  if (def.responseSchema.length === 0) return z.unknown()
  const shape: z.ZodRawShape = {}
  for (const field of def.responseSchema) {
    shape[field.name] = field.required ? responseFieldSchema(field) : responseFieldSchema(field).optional()
  }
  return z.object(shape)
}

const errorSchema = z.object({ code: z.string(), message: z.string(), details: z.unknown() })

/** Translate an API definition into a zod-openapi route (for routing + OpenAPI doc). */
export function buildRoute(def: ApiDefinitionDraft) {
  return createRoute({
    method: def.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: def.path,
    request: requestSchemaFor(def) as Parameters<typeof createRoute>[0]['request'],
    responses: {
      200: { content: { 'application/json': { schema: responseSchema(def) } }, description: '成功' },
      400: { content: { 'application/json': { schema: errorSchema } }, description: '输入非法' },
      500: { content: { 'application/json': { schema: errorSchema } }, description: '执行失败' },
    },
    summary: def.name,
    description: def.description,
    tags: def.tags,
  })
}
```

Note: the `request: ... as Parameters<typeof createRoute>[0]['request']` cast smooths over createRoute's strict request union (only query/headers/body are set, for locations the def uses). If `tsc` still errors on the `request` shape or the `method` union, consult `node_modules/@hono/zod-openapi/dist/index.d.ts` and adjust to the installed type — the intent is exactly the query/headers/body keys produced above.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/server/domains/api-runtime/definition-to-openapi.test.ts`
Expected: PASS (6 tests). Then `tsc -p tsconfig.json --noEmit` and `tsc -p tsconfig.node.json --noEmit` — clean. `npx eslint src/server/domains/api-runtime/definition-to-openapi.ts src/server/domains/api-runtime/definition-to-openapi.test.ts` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/domains/api-runtime/definition-to-openapi.ts src/server/domains/api-runtime/definition-to-openapi.test.ts
git commit -m "feat(api-runtime): add definition-to-openapi translator" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Live handler (`live-handler.ts`)

**Files:**
- Create: `src/server/domains/api-runtime/live-handler.ts`
- Create: `src/server/domains/api-runtime/live-handler.test.ts`

**Interfaces:**
- Consumes: `runWorkflow`, `WorkflowDeps` from `@/server/workflow/workflow-runner`; `loadGlobalValues`, `GlobalVariableLoaderServices` from `@/server/workflow/global-variable-loader`; `ApiDefinitionDraft`, `RequestParam` from `@/shared/schemas/api-definition.schema`; Hono `Context` (the zod-openapi route context).
- Produces: `liveHandler(c, def, deps, services): Promise<Response>` — merges `c.req.valid()` by location into `inputValues`, calls `runWorkflow`, returns 200 (raw response) or 400/500 (structured error).

- [ ] **Step 1: Write the failing test**

`src/server/domains/api-runtime/live-handler.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { liveHandler } from '@/server/domains/api-runtime/live-handler'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function def(script: string): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'published', name: 't', path: '/x', method: 'GET',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams: [{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }],
    responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script }],
  } as ApiDefinitionDraft
}

const deps = {
  knexRegistry: {} as never,
  getDataSource: () => undefined,
  analyzer: new EnhancedSqlAnalyzer(),
} as never
const services = {
  globalVariableService: { list: () => [] } as never,
  projectVariableService: { list: () => [] } as never,
} as never

function appFor(script: string) {
  const app = new OpenAPIHono()
  const route = createRoute({
    method: 'get', path: '/x',
    request: { query: z.object({ id: z.coerce.number().int() }) },
    responses: { 200: { content: { 'application/json': { schema: z.unknown() } }, description: 'ok' } },
  })
  app.openapi(route, (c) => liveHandler(c, def(script), deps, services))
  return app
}

describe('liveHandler', () => {
  it('returns the assemble output on success (200, raw)', async () => {
    const res = await appFor('return { ok: true }').request('/x?id=7')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns 400 from zod-openapi request validation before the handler runs', async () => {
    const res = await appFor('return { ok: true }').request('/x?id=abc')
    expect(res.status).toBe(400)
  })

  it('maps a step failure to 500 with the error code', async () => {
    const res = await appFor('throw new Error("boom")').request('/x?id=7')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe('STEP_FAILED')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/server/domains/api-runtime/live-handler.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/server/domains/api-runtime/live-handler.ts`:

```ts
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
  const validQuery = has('query') ? c.req.valid('query') : {}
  const validHeader = has('header') ? c.req.valid('header') : {}
  const validBody = has('body') ? c.req.valid('json') : {}
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
```

Note: `c.req.valid('query')` is provided by `@hono/zod-validator` (used by zod-openapi) and returns the validated values for the schema registered on the route. The `as Record<string, unknown>` casts smooth over the route-typed `c.req.valid` return; if `tsc` complains, adjust the casts to match the installed types — the intent is to read each param's validated value by name.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/server/domains/api-runtime/live-handler.test.ts`
Expected: PASS (3 tests). Then `tsc -p tsconfig.json --noEmit` + `tsc -p tsconfig.node.json --noEmit` — clean. `npx eslint src/server/domains/api-runtime/live-handler.ts src/server/domains/api-runtime/live-handler.test.ts` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/domains/api-runtime/live-handler.ts src/server/domains/api-runtime/live-handler.test.ts
git commit -m "feat(api-runtime): add live handler delegating to runWorkflow" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Published router (`published-router.ts`)

**Files:**
- Create: `src/server/domains/api-runtime/published-router.ts`
- Create: `src/server/domains/api-runtime/published-router.test.ts`

**Interfaces:**
- Consumes: `OpenAPIHono` from `@hono/zod-openapi`; `buildRoute` from `@/server/domains/api-runtime/definition-to-openapi`; `liveHandler` from `@/server/domains/api-runtime/live-handler`; `WorkflowDeps` from `@/server/workflow/workflow-runner`; `GlobalVariableLoaderServices` from `@/server/workflow/global-variable-loader`; `ApiDefinitionRepository`, `ApiDefinitionDraft` from `@/server/domains/api-definition/api-definition.repository` / `@/shared/contracts/api-definition.contract`.
- Produces: `getPublishedApp(): OpenAPIHono`; `rebuildPublishedRouter(deps, services, repository): void`; `registerPublishedRoute(app, def, deps, services): void`.

- [ ] **Step 1: Write the failing test**

`src/server/domains/api-runtime/published-router.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { rebuildPublishedRouter, getPublishedApp } from '@/server/domains/api-runtime/published-router'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

const deps = {
  knexRegistry: {} as never,
  getDataSource: () => undefined,
  analyzer: new EnhancedSqlAnalyzer(),
} as never
const services = {
  globalVariableService: { list: () => [] } as never,
  projectVariableService: { list: () => [] } as never,
} as never

function publishedDef(path: string, script: string): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'published', name: path, path, method: 'GET',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script }],
  } as ApiDefinitionDraft
}

describe('published-router', () => {
  it('serves a published route and 404s an unknown path', async () => {
    const repo = new ApiDefinitionRepository()
    repo.save('p1', publishedDef('/api/v1/rt/a', 'return { ok: "a" }'))
    rebuildPublishedRouter(deps, services, repo)

    const app = getPublishedApp()
    const ok = await app.request('/api/v1/rt/a')
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ ok: 'a' })

    const missing = await app.request('/api/v1/does-not-exist')
    expect(missing.status).toBe(404)
  })

  it('rebuild reflects a newly published def', async () => {
    const repo = new ApiDefinitionRepository()
    rebuildPublishedRouter(deps, services, repo)
    expect((await getPublishedApp().request('/api/v1/rt/b')).status).toBe(404)

    repo.save('p1', publishedDef('/api/v1/rt/b', 'return { ok: "b" }'))
    rebuildPublishedRouter(deps, services, repo)
    const res = await getPublishedApp().request('/api/v1/rt/b')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: 'b' })
  })

  it('serves the OpenAPI doc at /api/openapi with the published path', async () => {
    const repo = new ApiDefinitionRepository()
    repo.save('p1', publishedDef('/api/v1/rt/c', 'return 1'))
    rebuildPublishedRouter(deps, services, repo)
    const doc = await getPublishedApp().request('/api/openapi')
    expect(doc.status).toBe(200)
    const json = await doc.json() as { paths: Record<string, unknown> }
    expect(json.paths).toHaveProperty('/api/v1/rt/c')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/server/domains/api-runtime/published-router.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/server/domains/api-runtime/published-router.ts`:

```ts
import { OpenAPIHono } from '@hono/zod-openapi'

import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'
import type { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import type { WorkflowDeps } from '@/server/workflow/workflow-runner'
import type { GlobalVariableLoaderServices } from '@/server/workflow/global-variable-loader'
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
): void {
  const route = buildRoute(def)
  app.openapi(route, (c) => liveHandler(c, def, deps, services))
}

/** Rebuild the inner published app from the live repo. Cheap; call on startup and after every api save. */
export function rebuildPublishedRouter(
  deps: WorkflowDeps,
  services: GlobalVariableLoaderServices,
  repository: ApiDefinitionRepository,
): void {
  const app = new OpenAPIHono()
  for (const def of repository.listPublished()) {
    registerPublishedRoute(app, def, deps, services)
  }
  app.doc('/api/openapi', { openapi: { info: { title: 'Dynamic API Studio', version: '1.0.0' } } })
  currentPublishedApp = app
}
```

Note: `app.openapi(route, handler)` uses the default validation hook (request 400 in zod format, response passthrough — both verified). If `tsc` errors on the handler type (zod-openapi types the handler against the route), cast the handler minimally to satisfy the installed signature — the intent is `(c) => liveHandler(c, def, deps, services)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/server/domains/api-runtime/published-router.test.ts`
Expected: PASS (3 tests). Then `tsc -p tsconfig.json --noEmit` + `tsc -p tsconfig.node.json --noEmit` — clean. `npx eslint src/server/domains/api-runtime/published-router.ts src/server/domains/api-runtime/published-router.test.ts` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/domains/api-runtime/published-router.ts src/server/domains/api-runtime/published-router.test.ts
git commit -m "feat(api-runtime): add published router with rebuild + OpenAPI doc" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Wiring (app.ts delegation + save triggers rebuild + uniqueness 409)

**Files:**
- Create: `src/server/domains/api-runtime/runtime-wiring.ts`
- Modify: `src/server/app.ts`
- Modify: `src/server/routes/project-api.route.ts`
- Create: `src/server/routes/project-api.route.test.ts`

**Interfaces:**
- Consumes: `getPublishedApp`, `rebuildPublishedRouter` from `@/server/domains/api-runtime/published-router`; `WorkflowDeps` from `@/server/workflow/workflow-runner`; `GlobalVariableLoaderServices` from `@/server/workflow/global-variable-loader`; `ApiDefinitionRepository`/`ApiDefinitionService` from the api-definition domain; `KnexRegistry`, `EnhancedSqlAnalyzer`, `DataSourceRepository`, `GlobalVariableService`/`ProjectVariableService` (mirroring the Part A `api-test.route.ts` wiring).
- Produces: a running server where unmatched `/api/*` delegates to the published app; save publishes rebuild + enforce uniqueness.

- [ ] **Step 1: Write the failing test**

`src/server/routes/project-api.route.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { projectApiRoute } from '@/server/routes/project-api.route'
import { getPublishedApp } from '@/server/domains/api-runtime/published-router'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function publishedDef(path: string): ApiDefinitionDraft {
  return {
    projectId: 'project_order', status: 'published', name: path, path, method: 'GET',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams: [], responseSchema: [], localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { ok: true }' }],
  } as ApiDefinitionDraft
}

describe('project-api route + published dispatch', () => {
  it('save publishes a callable route and 409s on path+method collision', async () => {
    const a = await projectApiRoute.request('/project_order/apis/test-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...publishedDef('/api/v1/rt/unique1'), projectId: 'project_order' }),
    })
    expect(a.status).toBe(200)

    const live = await getPublishedApp().request('/api/v1/rt/unique1')
    expect(live.status).toBe(200)

    const b = await projectApiRoute.request('/project_order/apis/test-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...publishedDef('/api/v1/rt/unique1'), projectId: 'project_order', name: 'collision' }),
    })
    expect(b.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run src/server/routes/project-api.route.test.ts`
Expected: FAIL — the route does not yet rebuild/dispatch or return 409.

- [ ] **Step 3: Write minimal implementation**

Create `src/server/domains/api-runtime/runtime-wiring.ts` (shared instances so the route and the router use the same in-memory repository):

```ts
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { rebuildPublishedRouter } from '@/server/domains/api-runtime/published-router'

export const apiDefinitionRepository = new ApiDefinitionRepository()
export const dataSourceRepository = new DataSourceRepository()

export const runtimeDeps = {
  knexRegistry: new KnexRegistry(),
  getDataSource: (id: string) => dataSourceRepository.get(id),
  analyzer: new EnhancedSqlAnalyzer(),
} as const

export const runtimeServices = {
  globalVariableService: new GlobalVariableService(new GlobalVariableRepository()),
  projectVariableService: new ProjectVariableService(new ProjectVariableRepository()),
} as const

/** Build the initial published router from seed data. Call once at server startup. */
export function initPublishedRuntime(): void {
  rebuildPublishedRouter(runtimeDeps, runtimeServices, apiDefinitionRepository)
}
```

Replace `src/server/routes/project-api.route.ts` with (uses the shared instances, adds uniqueness 409 + rebuild after save):

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiDefinitionService } from '@/server/domains/api-definition/api-definition.service'
import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { projectRepository } from '@/server/routes/project.route'
import { apiDefinitionDraftSchema, apiTestRequestSchema } from '@/shared/contracts/api-definition.contract'
import {
  apiDefinitionRepository,
  dataSourceRepository,
  runtimeServices,
} from '@/server/domains/api-runtime/runtime-wiring'
import { rebuildPublishedRouter } from '@/server/domains/api-runtime/published-router'

const apiDefinitionService = new ApiDefinitionService(apiDefinitionRepository)
const apiTestService = new ApiTestService((id) => dataSourceRepository.get(id), runtimeServices)

export const projectApiRoute = new Hono()
  .get('/:projectId/apis', (context) => {
    const projectId = context.req.param('projectId')
    if (!projectRepository.get(projectId)) return context.json({ message: 'Project not found' }, 404)
    return context.json(apiDefinitionService.list(projectId))
  })
  .post('/:projectId/apis', zValidator('json', apiDefinitionDraftSchema), async (context) => {
    const projectId = context.req.param('projectId')
    if (!projectRepository.canCreateApi(projectId)) return context.json({ message: 'Project is archived or not found' }, 409)
    const draft = context.req.valid('json')
    if (draft.status === 'published' && !apiDefinitionRepository.isPathMethodUnique(draft.path, draft.method, draft.id)) {
      return context.json({ message: 'path+method 已被其他已发布 API 占用' }, 409)
    }
    const saved = apiDefinitionService.save(projectId, draft)
    rebuildPublishedRouter(runtimeDeps, runtimeServices, apiDefinitionRepository)
    return context.json(saved)
  })
  .get('/:projectId/apis/:apiId', (context) => {
    const apiDefinition = apiDefinitionService.get(context.req.param('projectId'), context.req.param('apiId'))
    return apiDefinition ? context.json(apiDefinition) : context.json({ message: 'API not found' }, 404)
  })
  .put('/:projectId/apis/:apiId', zValidator('json', apiDefinitionDraftSchema), async (context) => {
    const projectId = context.req.param('projectId')
    const apiId = context.req.param('apiId')
    const draft = context.req.valid('json')
    if (draft.status === 'published' && !apiDefinitionRepository.isPathMethodUnique(draft.path, draft.method, apiId)) {
      return context.json({ message: 'path+method 已被其他已发布 API 占用' }, 409)
    }
    const saved = apiDefinitionService.save(projectId, { ...draft, id: apiId, projectId })
    rebuildPublishedRouter(runtimeDeps, runtimeServices, apiDefinitionRepository)
    return context.json(saved)
  })
  .post('/:projectId/apis/test-draft', zValidator('json', apiTestRequestSchema), async (context) =>
    context.json(await apiTestService.run(context.req.valid('json'))),
  )
  .post('/:projectId/apis/:apiId/test', zValidator('json', apiTestRequestSchema), async (context) =>
    context.json(await apiTestService.run(context.req.valid('json'))),
  )
```

Modify `src/server/app.ts`: add imports (after the existing route imports):

```ts
import { getPublishedApp } from '@/server/domains/api-runtime/published-router'
import { initPublishedRuntime } from '@/server/domains/api-runtime/runtime-wiring'
```

Then, after the `.route('/tasks', taskRoute)` line (and before `app.notFound`), add:

```ts
// Published API dispatch: unmatched /api/* delegates to the swappable inner OpenAPIHono.
initPublishedRuntime()
app.all('/*', (c) => getPublishedApp().fetch(c.req.raw, c.env))
```

(`initPublishedRuntime()` builds the inner app from seed; `app.all('/*', ...)` is registered last so management routes match first. `getPublishedApp().fetch(c.req.raw, c.env)` hands the raw request to the inner app, which matches the published path.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run src/server/routes/project-api.route.test.ts src/server/routes/task.route.test.ts src/server/routes/home-overview.route.test.ts`
Expected: PASS (the new test + existing route tests green). Then the full server suite: `node_modules/.bin/vitest run src/server/` — no regressions. Then `tsc -p tsconfig.json --noEmit` + `tsc -p tsconfig.node.json --noEmit` — clean. `npx eslint src/server/app.ts src/server/routes/project-api.route.ts src/server/domains/api-runtime/runtime-wiring.ts src/server/routes/project-api.route.test.ts` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/app.ts src/server/routes/project-api.route.ts src/server/domains/api-runtime/runtime-wiring.ts src/server/routes/project-api.route.test.ts
git commit -m "feat(api-runtime): wire published dispatch + save rebuild + uniqueness 409" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Update CLAUDE.md structure

**Files:**
- Modify: `CLAUDE.md` — add the `server/domains/api-runtime/` subtree to the Project Structure block, under the `server/domains/` group (near `api-test/`).

- [ ] **Step 1: Locate the domains subtree in `CLAUDE.md`**

Open `CLAUDE.md` and find the `server/domains/` listing that includes `api-test/` (with `api-test.service.ts` as the thin consumer, per the Part A update).

- [ ] **Step 2: Edit the structure**

Add an `api-runtime/` entry as a sibling of `api-test/`, matching the surrounding box-drawing style and indentation:

```text
│   │   ├── api-runtime/             # 发布态运行时（Part B）
│   │   │   ├── published-router.ts  # 可热替换内层 OpenAPIHono + rebuild + /api/openapi
│   │   │   ├── definition-to-openapi.ts
│   │   │   ├── live-handler.ts
│   │   │   └── runtime-wiring.ts    # 共享 deps/services/repository + initPublishedRuntime
│   │   ├── api-test/
```

- [ ] **Step 3: Verify typecheck unaffected**

Run: `tsc -p tsconfig.json --noEmit`
Expected: clean (docs-only).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add server/domains/api-runtime to CLAUDE.md structure" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage** — mapped to tasks:
- §1 module layout → Tasks 1–6 (repository extensions, translator, live-handler, published-router, runtime-wiring, app.ts/project-api.route.ts wiring, CLAUDE.md).
- §2 dispatch/重建模型 → Task 4 (swappable inner app + rebuild) + Task 5 (outer delegation + startup init + save-triggered rebuild).
- §3 live handler (c.req.valid() merge → runWorkflow → HTTP map) → Task 3.
- §4 OpenAPI endpoint + translator → Tasks 2 (translator) + 4 (`app.doc('/api/openapi')`).
- §5 uniqueness + rebuild triggers → Task 1 (`isPathMethodUnique`) + Task 5 (409 on save + rebuild after save + startup rebuild).
- §6 edges/errors → Task 3 test (400 zod, 500 STEP_FAILED) + Task 4 test (404 unknown) + Task 5 test (409 collision).
- §7 testing → each task has tests; Task 5 adds the save-triggers-rebuild integration test.
- §8 deferred (auth, form body, 405, path params, persistence) → documented in spec; not implemented (correct).

**2. Placeholder scan** — the `as Parameters<typeof createRoute>[0]['request']` and `as Record<string, unknown>` casts are real type-smoothing, not placeholders. zod-openapi type uncertainties carry a concrete verify-note ("read `node_modules/@hono/zod-openapi/dist/index.d.ts` and adjust") with the intent stated — not a "TODO". No "TBD"/"implement later".

**3. Type consistency** — `buildRoute(def)` (Task 2) consumed by `registerPublishedRoute` (Task 4); `liveHandler(c, def, deps, services)` (Task 3) consumed by `registerPublishedRoute` (Task 4); `rebuildPublishedRouter(deps, services, repository)` (Task 4) called from `runtime-wiring.initPublishedRuntime` and `project-api.route.ts` (Task 5); `WorkflowDeps` / `GlobalVariableLoaderServices` shapes match Part A's (`{ knexRegistry, getDataSource, analyzer }` / `{ globalVariableService, projectVariableService }`); `repository.listPublished()` / `isPathMethodUnique()` (Task 1) used in Tasks 4/5. `runtimeDeps`/`runtimeServices`/`apiDefinitionRepository` exported from `runtime-wiring.ts` (Task 5) and imported by `project-api.route.ts`.
