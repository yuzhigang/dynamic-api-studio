# API Execution Engine (Part A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable API execution engine under `server/workflow/` that turns an `ApiDefinitionDraft` + request params into a response, with the test-run panel as its first consumer.

**Architecture:** Sequential `WorkflowRunner` dispatches each step by `kind` to a typed executor (`SqlExecutor` / `JsTransformExecutor`); results land in the `local` scope; a single `role="assemble"` step's output becomes the response. Reads autocommit per step (cross-datasource allowed); write steps must share one `datasourceId` and run in one knex transaction. The engine never touches Hono req/res — consumers (test panel now, published dispatch in Part B) are thin.

**Tech Stack:** TypeScript, Hono, Knex (pg/mysql2/oracledb/mssql), node-sql-parser, Zod, vitest. Co-located `*.test.ts`. Path alias `@/` → `src/`.

## Global Constraints

- Run a single test file: `pnpm test -- <path/to/file.test.ts>` (vitest). Full output (TDD red/green visible).
- Type check: `pnpm typecheck`. Lint: `pnpm lint`.
- New modules live under `src/server/workflow/` (executors + helpers). `server/domains/api-test/` is a thin consumer.
- JS transform runtime: `new Function`, sync, no network. Scripts use bare local names + `input.`/`global.` objects; `$`-shorthand is only for `condition`/local-var expressions (existing `expression-evaluator`).
- Reads: autocommit, cross-datasource allowed. Writes: all write steps must share one `datasourceId` (validated), run in one knex transaction (commit on success, rollback on failure).
- One `role="assemble"` step per workflow (frontend guarantees; backend validates defensively), always last; its `outputVariable` value is the response.
- Engine returns a `WorkflowRunResult` with `status` — never throws for expected failures. `error.code` maps to HTTP: `INVALID_INPUT`→400, others→500.
- Every task ends with a commit using Conventional Commits. End commit messages with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

New files (all under `src/server/workflow/` unless noted):

| File | Responsibility |
| ---- | -------------- |
| `src/server/workflow/variable-binder.ts` | Extract raw `{input, global, local}` values from `VariableContext` for `renderFromPlan`; owns `extractRawValues`. |
| `src/server/workflow/input-validator.ts` | Validate `inputValues` against `requestParams` (required + scalar type). |
| `src/server/workflow/global-variable-loader.ts` | Load + merge platform globals and project variables into a flat `Record<string, unknown>`. |
| `src/server/workflow/datasource-config.ts` | `toKnexConfig(dataSource)`, `dialectToKnexClient`, `mapParserDialect` (extracted from `api-test.service.ts`). |
| `src/server/workflow/normalize-result.ts` | `normalizeResult(raw, client)` → `unknown[]` across knex clients. |
| `src/server/workflow/plan-cache.ts` | LRU `CompiledSqlPlan` cache keyed by `stepId + sourceHash`, schemaHash invalidation. |
| `src/server/workflow/transaction-manager.ts` | `openTransaction`/`commit`/`rollback` over knex. |
| `src/server/workflow/js-transform-executor.ts` | Run a js-transform step's script via `new Function` named-param injection. |
| `src/server/workflow/sql-executor.ts` | Compile+bind+render+execute one sql-query step; normalize rows; honor `multipleRows`. |
| `src/server/workflow/result-assembler.ts` | Locate the assemble step, return its output, lightweight responseSchema validation. |
| `src/server/workflow/workflow-runner.ts` | Orchestration loop (rewrite of existing skeleton). |
| `src/server/workflow/workflow-symbols.ts` | `buildWorkflowSymbols(api, globalNames)` — input/global/local names + defaults for `analyze`. |
| `src/server/domains/api-test/api-test.service.ts` | Thin consumer (rewrite). |
| `src/server/domains/api-test/api-test.service.test.ts` | New test for the consumer. |
| `src/server/workflow/workflow-runner.test.ts` | Rewrite for new contract. |
| `CLAUDE.md` | Update structure description (executors under `server/workflow/`). |

Modified:
- `src/server/expression/expression-evaluator.ts` — import `extractRawValues` from `variable-binder` (remove local copy).
- `src/server/analyzer/index.ts` — add `getStatementType`.

---

### Task 1: variable-binder (and extractRawValues refactor)

**Files:**
- Create: `src/server/workflow/variable-binder.ts`
- Create: `src/server/workflow/variable-binder.test.ts`
- Modify: `src/server/expression/expression-evaluator.ts` (import `extractRawValues` from variable-binder; delete its local `extractRawValues`)

**Interfaces:**
- Consumes: `VariableContext`, `VariableScope` from `@/server/analyzer/types`.
- Produces: `extractRawValues(context, scope): Record<string, unknown>`; `bindVariableValues(context): { input, global, local }`.

- [ ] **Step 1: Write the failing test**

`src/server/workflow/variable-binder.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'
import { bindVariableValues, extractRawValues } from '@/server/workflow/variable-binder'

describe('variable-binder', () => {
  it('extracts raw values by scope', () => {
    const ctx = createVariableContext()
    ctx.set('input', 'id', { value: 42, type: 'integer' })
    ctx.set('global', 'tenant', { value: 't-1', type: 'string' })
    ctx.set('local', 'orders', { value: [{ id: 1 }], type: 'array' })

    expect(extractRawValues(ctx, 'input')).toEqual({ id: 42 })
    expect(extractRawValues(ctx, 'global')).toEqual({ tenant: 't-1' })
    expect(extractRawValues(ctx, 'local')).toEqual({ orders: [{ id: 1 }] })
  })

  it('binds all three scopes for renderFromPlan', () => {
    const ctx = createVariableContext()
    ctx.set('input', 'id', { value: 42, type: 'integer' })
    ctx.set('global', 'tenant', { value: 't-1', type: 'string' })
    ctx.set('local', 'orders', { value: [], type: 'array' })

    expect(bindVariableValues(ctx)).toEqual({
      input: { id: 42 },
      global: { tenant: 't-1' },
      local: { orders: [] },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/variable-binder.test.ts`
Expected: FAIL — "Cannot find module '@/server/workflow/variable-binder'".

- [ ] **Step 3: Write minimal implementation**

`src/server/workflow/variable-binder.ts`:

```ts
import type { VariableContext, VariableScope } from '@/server/analyzer/types'

export type BoundScopes = {
  input: Record<string, unknown>
  global: Record<string, unknown>
  local: Record<string, unknown>
}

/** Extract raw values for one scope from a VariableContext. */
export function extractRawValues(context: VariableContext, scope: VariableScope): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const name of context.keys(scope)) {
    result[name] = context.get(scope, name)?.value
  }
  return result
}

/** Build the {input, global, local} record expected by renderFromPlan. */
export function bindVariableValues(context: VariableContext): BoundScopes {
  return {
    input: extractRawValues(context, 'input'),
    global: extractRawValues(context, 'global'),
    local: extractRawValues(context, 'local'),
  }
}
```

Then update `src/server/expression/expression-evaluator.ts`: replace its local `extractRawValues` function with an import. Delete lines 48-54 (the local `extractRawValues` function) and add the import at the top:

```ts
import { extractRawValues } from '@/server/workflow/variable-binder'
import type { VariableContext, VariableScope } from '@/server/analyzer/types'
```

(Remove the now-unused `VariableScope` import only if `evalExpressionFromContext` no longer references it — it still does, via the `scopeValues: Record<VariableScope, ...>` annotation, so keep the `VariableScope` import.)

- [ ] **Step 4: Run tests to verify pass (incl. existing expression-evaluator regression)**

Run: `pnpm test -- src/server/workflow/variable-binder.test.ts src/server/expression/expression-evaluator.test.ts`
Expected: PASS — variable-binder tests pass; expression-evaluator tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/variable-binder.ts src/server/workflow/variable-binder.test.ts src/server/expression/expression-evaluator.ts
git commit -m "refactor(workflow): extract variable-binder and share extractRawValues" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: input-validator

**Files:**
- Create: `src/server/workflow/input-validator.ts`
- Create: `src/server/workflow/input-validator.test.ts`

**Interfaces:**
- Consumes: `ApiDefinitionDraft`, `RequestParam` from `@/shared/schemas/api-definition.schema`.
- Produces: `validateInput(api, inputValues): { ok: true } | { ok: false; errors: Array<{ name: string; message: string }> }`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { validateInput } from '@/server/workflow/input-validator'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function buildApi(requestParams: ApiDefinitionDraft['requestParams']): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'draft', name: 'a', path: '/a', method: 'POST',
    tags: [], permissions: [], bodyContentType: 'json',
    requestParams, responseSchema: [], localVariables: [], workflowSteps: [],
  } as ApiDefinitionDraft
}

describe('validateInput', () => {
  it('passes when required params are present and typed', () => {
    const api = buildApi([
      { id: 'r1', name: 'id', location: 'query', type: 'integer', required: true },
      { id: 'r2', name: 'name', location: 'query', type: 'string', required: false },
    ])
    const result = validateInput(api, { id: 7 })
    expect(result).toEqual({ ok: true })
  })

  it('fails when a required param is missing', () => {
    const api = buildApi([{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }])
    expect(validateInput(api, {})).toEqual({ ok: false, errors: [{ name: 'id', message: '缺少必填参数 id' }] })
  })

  it('fails when a param has the wrong scalar type', () => {
    const api = buildApi([{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }])
    expect(validateInput(api, { id: 'not-a-number' })).toEqual({
      ok: false,
      errors: [{ name: 'id', message: '参数 id 应为 integer' }],
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/input-validator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ApiDefinitionDraft, RequestParam } from '@/shared/schemas/api-definition.schema'

export type InputValidationResult = { ok: true } | { ok: false; errors: Array<{ name: string; message: string }> }

const SCALAR_TYPES = ['string', 'integer', 'decimal', 'boolean', 'object', 'array'] as const

export function validateInput(api: ApiDefinitionDraft, inputValues: Record<string, unknown>): InputValidationResult {
  const errors: Array<{ name: string; message: string }> = []

  for (const param of api.requestParams as RequestParam[]) {
    const value = inputValues[param.name]
    if (value === undefined || value === null) {
      if (param.required) errors.push({ name: param.name, message: `缺少必填参数 ${param.name}` })
      continue
    }
    if (!matchesScalarType(value, param.type)) {
      errors.push({ name: param.name, message: `参数 ${param.name} 应为 ${param.type}` })
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}

function matchesScalarType(value: unknown, type: (typeof SCALAR_TYPES)[number]): boolean {
  switch (type) {
    case 'string': return typeof value === 'string'
    case 'integer': return typeof value === 'number' && Number.isInteger(value)
    case 'decimal': return typeof value === 'number'
    case 'boolean': return typeof value === 'boolean'
    case 'array': return Array.isArray(value)
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/input-validator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/input-validator.ts src/server/workflow/input-validator.test.ts
git commit -m "feat(workflow): add input validator against requestParams" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: global-variable-loader

**Files:**
- Create: `src/server/workflow/global-variable-loader.ts`
- Create: `src/server/workflow/global-variable-loader.test.ts`

**Interfaces:**
- Consumes: `GlobalVariableService` (`list(): GlobalVariable[]`) and `ProjectVariableService` (`list(projectId): ProjectVariable[]`). Both variable types: `{ name, kind: 'single' | 'list', value, items }`.
- Produces: `loadGlobalValues(projectId, services): Record<string, unknown>` where project variables override platform globals on name collision; `single`→`.value`, `list`→`.items`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { loadGlobalValues } from '@/server/workflow/global-variable-loader'

function serviceReturning(vars: Array<{ name: string; kind: 'single' | 'list'; value: string; items: string[] }>) {
  return { list: () => vars } as unknown as Parameters<typeof loadGlobalValues>[1]['globalVariableService']
}

describe('loadGlobalValues', () => {
  it('loads single and list variables from platform globals', () => {
    const globalService = serviceReturning([
      { name: 'page', kind: 'single', value: '20', items: [] },
      { name: 'status', kind: 'list', value: '', items: ['active', 'closed'] },
    ])
    const projectService = { list: () => [] } as unknown as Parameters<typeof loadGlobalValues>[1]['projectVariableService']

    expect(loadGlobalValues('p1', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({
      page: '20',
      status: ['active', 'closed'],
    })
  })

  it('project variables override platform globals on name collision', () => {
    const globalService = serviceReturning([{ name: 'page', kind: 'single', value: '20', items: [] }])
    const projectService = {
      list: () => [{ name: 'page', kind: 'single', value: '50', items: [] }],
    } as unknown as Parameters<typeof loadGlobalValues>[1]['projectVariableService']

    expect(loadGlobalValues('p1', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({ page: '50' })
  })

  it('filters project variables by projectId', () => {
    const projectService = {
      list: (projectId: string) => projectId === 'p1'
        ? [{ name: 'region', kind: 'single', value: 'CN', items: [] }]
        : [],
    } as unknown as Parameters<typeof loadGlobalValues>[1]['projectVariableService']
    const globalService = serviceReturning([])

    expect(loadGlobalValues('p1', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({ region: 'CN' })
    expect(loadGlobalValues('p2', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/global-variable-loader.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import type { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'

type ScopedVariable = { name: string; kind: 'single' | 'list'; value: string; items: unknown[] }

export type GlobalVariableLoaderServices = {
  globalVariableService: GlobalVariableService
  projectVariableService: ProjectVariableService
}

/** Load platform globals + project variables into a flat record; project overrides platform on name collision. */
export function loadGlobalValues(projectId: string, services: GlobalVariableLoaderServices): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const variable of services.globalVariableService.list() as ScopedVariable[]) {
    result[variable.name] = variableValue(variable)
  }
  for (const variable of services.projectVariableService.list(projectId) as ScopedVariable[]) {
    result[variable.name] = variableValue(variable)
  }

  return result
}

function variableValue(variable: ScopedVariable): unknown {
  return variable.kind === 'list' ? variable.items : variable.value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/global-variable-loader.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/global-variable-loader.ts src/server/workflow/global-variable-loader.test.ts
git commit -m "feat(workflow): add global-variable loader (project overrides platform)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: datasource-config (extract from api-test.service)

**Files:**
- Create: `src/server/workflow/datasource-config.ts`
- Create: `src/server/workflow/datasource-config.test.ts`

**Interfaces:**
- Consumes: `DataSource`, `Dialect` from `@/shared/contracts/data-source.contract`; `DataSourceConfig`, `SqlDialect` from `@/server/infra/knex/knex-registry` and `@/server/analyzer/types`.
- Produces: `toKnexConfig(dataSource): DataSourceConfig`; `dialectToKnexClient`; `mapParserDialect(dialect): SqlDialect` (tdengine→postgresql).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { dialectToKnexClient, mapParserDialect, toKnexConfig } from '@/server/workflow/datasource-config'
import type { DataSource } from '@/shared/contracts/data-source.contract'

function ds(dialect: DataSource['dialect']): DataSource {
  return {
    id: 'ds1', name: 'n', dialect, host: 'h', port: 5432, database: 'd',
    username: 'u', password: 'p', createdAt: 't', updatedAt: 't',
  }
}

describe('datasource-config', () => {
  it('maps dialects to knex clients', () => {
    expect(dialectToKnexClient.postgresql).toBe('pg')
    expect(dialectToKnexClient.mysql).toBe('mysql2')
    expect(dialectToKnexClient.sqlserver).toBe('mssql')
    expect(dialectToKnexClient.oracle).toBe('oracledb')
  })

  it('maps tdengine to postgresql for the parser', () => {
    expect(mapParserDialect('tdengine')).toBe('postgresql')
    expect(mapParserDialect('mysql')).toBe('mysql')
  })

  it('builds a Knex DataSourceConfig', () => {
    expect(toKnexConfig(ds('postgresql'))).toEqual({
      id: 'ds1', client: 'pg', connection: { host: 'h', port: 5432, user: 'u', password: 'p', database: 'd' },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/datasource-config.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { DataSourceConfig } from '@/server/infra/knex/knex-registry'
import type { SqlDialect } from '@/server/analyzer/types'

export const dialectToKnexClient: Record<DataSource['dialect'], string> = {
  postgresql: 'pg',
  mysql: 'mysql2',
  oracle: 'oracledb',
  sqlserver: 'mssql',
  tdengine: 'tdengine',
}

/** Map a data-source dialect to the parser dialect (tdengine uses the postgresql parser). */
export function mapParserDialect(dialect: DataSource['dialect']): SqlDialect {
  if (dialect === 'tdengine') return 'postgresql'
  return dialect
}

export function toKnexConfig(dataSource: DataSource): DataSourceConfig {
  const client = dialectToKnexClient[dataSource.dialect]
  if (!client) throw new Error(`不支持的数据源方言：${dataSource.dialect}`)
  return {
    id: dataSource.id,
    client,
    connection: {
      host: dataSource.host,
      port: dataSource.port,
      user: dataSource.username,
      password: dataSource.password,
      database: dataSource.database,
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/datasource-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/datasource-config.ts src/server/workflow/datasource-config.test.ts
git commit -m "feat(workflow): extract datasource-config helpers" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: normalize-result

**Files:**
- Create: `src/server/workflow/normalize-result.ts`
- Create: `src/server/workflow/normalize-result.test.ts`

**Interfaces:**
- Consumes: knex raw result (shape varies by client) + knex `client` string.
- Produces: `normalizeResult(raw, client): unknown[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { normalizeResult } from '@/server/workflow/normalize-result'

describe('normalizeResult', () => {
  it('reads rows from a pg result', () => {
    expect(normalizeResult({ rows: [{ id: 1 }], rowCount: 1 }, 'pg')).toEqual([{ id: 1 }])
  })

  it('reads the first element of a mysql2 [rows, fields] result', () => {
    expect(normalizeResult([[{ id: 1 }, { id: 2 }], [{ name: 'id' }]], 'mysql2')).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('reads recordset from a mssql result', () => {
    expect(normalizeResult({ recordset: [{ id: 1 }] }, 'mssql')).toEqual([{ id: 1 }])
  })

  it('reads rows from an oracledb result', () => {
    expect(normalizeResult({ rows: [{ id: 1 }] }, 'oracledb')).toEqual([{ id: 1 }])
  })

  it('returns an array fallback for unknown clients/shapes', () => {
    expect(normalizeResult([{ id: 1 }], 'tdengine')).toEqual([{ id: 1 }])
    expect(normalizeResult(undefined, 'pg')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/normalize-result.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/** Normalize a knex.raw result into a row array across clients. */
export function normalizeResult(raw: unknown, client: string): unknown[] {
  if (raw === null || raw === undefined) return []

  if (client === 'pg' || client === 'oracledb') {
    return rowsOf((raw as { rows?: unknown[] }).rows)
  }
  if (client === 'mysql2') {
    return Array.isArray(raw) ? rowsOf(raw[0] as unknown) : []
  }
  if (client === 'mssql') {
    const recordset = (raw as { recordset?: unknown[] }).recordset
    if (Array.isArray(recordset)) return recordset
  }
  return Array.isArray(raw) ? raw : []
}

function rowsOf(rows: unknown): unknown[] {
  return Array.isArray(rows) ? rows : []
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/normalize-result.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/normalize-result.ts src/server/workflow/normalize-result.test.ts
git commit -m "feat(workflow): add knex raw result normalization" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: analyzer getStatementType

**Files:**
- Modify: `src/server/analyzer/index.ts` (add `getStatementType` method)
- Create: `src/server/analyzer/get-statement-type.test.ts`

**Interfaces:**
- Consumes: `CompiledSqlPlan` (`.ast: unknown`) from `@/server/analyzer/types`.
- Produces: `EnhancedSqlAnalyzer.getStatementType(plan): 'select' | 'insert' | 'update' | 'delete' | 'other'`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'

const analyzer = new EnhancedSqlAnalyzer()

function planFor(sql: string) {
  return analyzer.analyze({ sql, dialect: 'postgresql', inputNames: [], globalNames: [], localNames: [] })
}

describe('EnhancedSqlAnalyzer.getStatementType', () => {
  it('detects select', () => {
    expect(analyzer.getStatementType(planFor('SELECT 1'))).toBe('select')
  })

  it('detects insert', () => {
    expect(analyzer.getStatementType(planFor('INSERT INTO t (a) VALUES (1)'))).toBe('insert')
  })

  it('detects update', () => {
    expect(analyzer.getStatementType(planFor('UPDATE t SET a = 1'))).toBe('update')
  })

  it('detects delete', () => {
    expect(analyzer.getStatementType(planFor('DELETE FROM t'))).toBe('delete')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/analyzer/get-statement-type.test.ts`
Expected: FAIL — `analyzer.getStatementType is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add the method to `EnhancedSqlAnalyzer` in `src/server/analyzer/index.ts` (inside the class body, after `analyze`):

```ts
  getStatementType(plan: CompiledSqlPlan): 'select' | 'insert' | 'update' | 'delete' | 'other' {
    const node = Array.isArray(plan.ast) ? plan.ast[0] : plan.ast
    const type = (node as { type?: string } | undefined)?.type
    if (type === 'select' || type === 'insert' || type === 'update' || type === 'delete') return type
    return 'other'
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/analyzer/get-statement-type.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/index.ts src/server/analyzer/get-statement-type.test.ts
git commit -m "feat(analyzer): add getStatementType for write/read detection" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: plan-cache

**Files:**
- Create: `src/server/workflow/plan-cache.ts`
- Create: `src/server/workflow/plan-cache.test.ts`

**Interfaces:**
- Consumes: `WorkflowStep` from `@/shared/schemas/api-definition.schema`; `EnhancedSqlAnalyzer`, `CompiledSqlPlan`, `AnalyzeInput` from `@/server/analyzer`; `DataSource` from `@/shared/contracts/data-source.contract`; `mapParserDialect` from `@/server/workflow/datasource-config`; `WorkflowSymbols` (define inline here, or import from `workflow-symbols`).
- Produces: `PlanCache` class with `getOrCompile(step, symbols, ctx)` and `invalidate(stepId)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { PlanCache } from '@/server/workflow/plan-cache'
import type { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { CompiledSqlPlan } from '@/server/analyzer/types'
import type { DataSource } from '@/shared/contracts/data-source.contract'

const pg: DataSource = {
  id: 'ds1', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd',
  username: 'u', password: 'p', createdAt: 't', updatedAt: 't',
}
const symbols = { inputNames: [], globalNames: [], localNames: [], defaults: {} }

function fakePlan(sourceHash: string, schemaHash = 'sh'): CompiledSqlPlan {
  return {
    sourceHash, schemaHash, dialect: 'postgresql', processedSql: 'SELECT 1', varMap: {},
    ast: { type: 'select' }, variableRefs: [], aliasMap: {}, optionalConditions: [],
    staticDiagnostics: [], references: [],
  }
}

function analyzerReturning(plan: CompiledSqlPlan) {
  return { analyze: vi.fn(() => plan), getStatementType: vi.fn() } as unknown as EnhancedSqlAnalyzer
}

const step = { id: 's1', kind: 'sql-query' as const, title: 'q', outputVariable: 'rows', sql: 'SELECT 1' }

describe('PlanCache', () => {
  it('compiles on first access and reuses on second', () => {
    const analyzer = analyzerReturning(fakePlan('h1'))
    const cache = new PlanCache(analyzer)
    const ctx = { dataSource: pg }

    const a = cache.getOrCompile(step, symbols, ctx)
    const b = cache.getOrCompile(step, symbols, ctx)
    expect(analyzer.analyze).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
  })

  it('recompiles when the SQL changes (new sourceHash)', () => {
    let plan = fakePlan('h1')
    const analyzer = analyzerReturning(plan)
    const cache = new PlanCache(analyzer)

    cache.getOrCompile(step, symbols, { dataSource: pg })
    plan = fakePlan('h2')
    ;(analyzer.analyze as unknown as ReturnType<typeof vi.fn>).mockReturnValue(plan)
    const stepChanged = { ...step, sql: 'SELECT 2' }
    cache.getOrCompile(stepChanged, symbols, { dataSource: pg })

    expect(analyzer.analyze).toHaveBeenCalledTimes(2)
  })

  it('recompiles when schemaHash changes for the same SQL', () => {
    const analyzer = analyzerReturning(fakePlan('h1', 'sh1'))
    const cache = new PlanCache(analyzer)
    const ctx = { dataSource: pg }

    cache.getOrCompile(step, symbols, ctx)
    ;(analyzer.analyze as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fakePlan('h1', 'sh2'))
    const changedSymbols = { ...symbols, inputNames: ['newParam'] }
    cache.getOrCompile(step, changedSymbols, ctx)

    expect(analyzer.analyze).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/plan-cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/server/workflow/plan-cache.ts`:

```ts
import { createHash } from 'node:crypto'

import type { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { AnalyzeInput, CompiledSqlPlan } from '@/server/analyzer/types'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import { mapParserDialect } from '@/server/workflow/datasource-config'

export type WorkflowSymbols = {
  inputNames: string[]
  globalNames: string[]
  localNames: string[]
  defaults: Record<string, unknown>
}

export type PlanCompileContext = { dataSource: DataSource }

type CacheEntry = { plan: CompiledSqlPlan; sourceHash: string; schemaHash: string }

const DEFAULT_MAX = 1000

export class PlanCache {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly max: number

  constructor(private readonly analyzer: EnhancedSqlAnalyzer, max = DEFAULT_MAX) {
    this.max = max
  }

  getOrCompile(step: WorkflowStep, symbols: WorkflowSymbols, ctx: PlanCompileContext): CompiledSqlPlan {
    const sourceHash = sha256(step.sql ?? '')
    const key = `${step.id}:${sourceHash}`
    const cached = this.entries.get(key)

    if (cached && cached.schemaHash === currentSchemaHash(symbols)) {
      this.touch(key)
      return cached.plan
    }

    const plan = this.compile(step, symbols, ctx)
    this.entries.set(key, { plan, sourceHash, schemaHash: plan.schemaHash })
    this.evictIfNeeded()
    return plan
  }

  invalidate(stepId: string): void {
    for (const key of Array.from(this.entries.keys())) {
      if (key.startsWith(`${stepId}:`)) this.entries.delete(key)
    }
  }

  private compile(step: WorkflowStep, symbols: WorkflowSymbols, ctx: PlanCompileContext): CompiledSqlPlan {
    const input: AnalyzeInput = {
      sql: step.sql ?? '',
      dialect: mapParserDialect(ctx.dataSource.dialect),
      inputNames: symbols.inputNames,
      globalNames: symbols.globalNames,
      localNames: symbols.localNames,
      defaults: symbols.defaults,
    }
    return this.analyzer.analyze(input)
  }

  private touch(key: string): void {
    const entry = this.entries.get(key)
    if (!entry) return
    this.entries.delete(key)
    this.entries.set(key, entry)
  }

  private evictIfNeeded(): void {
    while (this.entries.size > this.max) {
      const oldest = this.entries.keys().next().value
      if (oldest === undefined) break
      this.entries.delete(oldest)
    }
  }
}

function currentSchemaHash(symbols: WorkflowSymbols): string {
  return sha256(JSON.stringify({
    inputNames: symbols.inputNames,
    globalNames: symbols.globalNames,
    localNames: symbols.localNames,
    defaults: symbols.defaults,
  }))
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/plan-cache.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/plan-cache.ts src/server/workflow/plan-cache.test.ts
git commit -m "feat(workflow): add CompiledSqlPlan LRU cache with schemaHash invalidation" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: transaction-manager

**Files:**
- Create: `src/server/workflow/transaction-manager.ts`
- Create: `src/server/workflow/transaction-manager.test.ts`

**Interfaces:**
- Consumes: `Knex` from `knex`.
- Produces: `openTransaction(knex): Promise<Knex.Transaction>`; `commit(trx)`; `rollback(trx)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Knex } from 'knex'
import { commit, openTransaction, rollback } from '@/server/workflow/transaction-manager'

function fakeKnex(trx: Partial<Knex.Transaction>) {
  const knex = { transaction: vi.fn() } as unknown as Knex
  ;(knex.transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation((cb?: (t: Knex.Transaction) => unknown) => {
    if (cb) return cb(trx as Knex.Transaction)
    return Promise.resolve(trx)
  })
  return knex
}

describe('transaction-manager', () => {
  it('opens a transaction via knex.transaction', async () => {
    const trx = { commit: vi.fn(), rollback: vi.fn() } as unknown as Knex.Transaction
    const knex = fakeKnex(trx)
    const opened = await openTransaction(knex)
    expect(opened).toBe(trx)
  })

  it('commits a transaction', async () => {
    const trx = { commit: vi.fn().mockResolvedValue(undefined), rollback: vi.fn() } as unknown as Knex.Transaction
    await commit(trx)
    expect(trx.commit).toHaveBeenCalledTimes(1)
    expect(trx.rollback).not.toHaveBeenCalled()
  })

  it('rolls back a transaction', async () => {
    const trx = { commit: vi.fn(), rollback: vi.fn().mockResolvedValue(undefined) } as unknown as Knex.Transaction
    await rollback(trx)
    expect(trx.rollback).toHaveBeenCalledTimes(1)
    expect(trx.commit).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/transaction-manager.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Knex } from 'knex'

/** Open a knex transaction for the given datasource pool. */
export async function openTransaction(knex: Knex): Promise<Knex.Transaction> {
  return knex.transaction()
}

export async function commit(trx: Knex.Transaction): Promise<void> {
  await trx.commit()
}

export async function rollback(trx: Knex.Transaction): Promise<void> {
  await trx.rollback()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/transaction-manager.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/transaction-manager.ts src/server/workflow/transaction-manager.test.ts
git commit -m "feat(workflow): add transaction manager" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: js-transform-executor

**Files:**
- Create: `src/server/workflow/js-transform-executor.ts`
- Create: `src/server/workflow/js-transform-executor.test.ts`

**Interfaces:**
- Consumes: `WorkflowStep` from `@/shared/schemas/api-definition.schema`; `VariableContext` from `@/server/analyzer/types`; `extractRawValues` from `@/server/workflow/variable-binder`.
- Produces: `executeJsTransform(step, context): Promise<unknown>`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'
import { executeJsTransform } from '@/server/workflow/js-transform-executor'

function ctxWith({ input = {}, global = {}, local = {} }: { input?: Record<string, unknown>; global?: Record<string, unknown>; local?: Record<string, unknown> }) {
  const c = createVariableContext()
  for (const [k, v] of Object.entries(input)) c.set('input', k, { value: v, type: 'string' })
  for (const [k, v] of Object.entries(global)) c.set('global', k, { value: v, type: 'string' })
  for (const [k, v] of Object.entries(local)) c.set('local', k, { value: v, type: 'array' })
  return c
}

describe('executeJsTransform', () => {
  it('runs a script using bare local names and returns its value', async () => {
    const ctx = ctxWith({ local: { orders: [{ id: 1 }, { id: 2 }] } })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return orders.map(o => o.id)' }
    await expect(executeJsTransform(step, ctx)).resolves.toEqual([1, 2])
  })

  it('exposes input and global as objects', async () => {
    const ctx = ctxWith({ input: { name: '张三' }, global: { prefix: 'Hi' } })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return global.prefix + " " + input.name' }
    await expect(executeJsTransform(step, ctx)).resolves.toBe('Hi 张三')
  })

  it('awaits an async IIFE', async () => {
    const ctx = ctxWith({ local: { n: 5 } })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return (async () => n * 2)()' }
    await expect(executeJsTransform(step, ctx)).resolves.toBe(10)
  })

  it('throws a JsTransformError wrapping the original message', async () => {
    const ctx = ctxWith({})
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'throw new Error("boom")' }
    await expect(executeJsTransform(step, ctx)).rejects.toThrow(/js-transform 步骤 s1 执行失败/)
  })

  it('rejects a local name that shadows input/global', async () => {
    const ctx = ctxWith({ input: { x: 1 }, local: { input: 2 } as unknown as Record<string, unknown> })
    const step = { id: 's1', kind: 'js-transform' as const, title: 't', outputVariable: 'data', script: 'return 1' }
    await expect(executeJsTransform(step, ctx)).rejects.toThrow(/非法变量名/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/js-transform-executor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { VariableContext } from '@/server/analyzer/types'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'
import { extractRawValues } from '@/server/workflow/variable-binder'

const RESERVED = new Set(['input', 'global'])
const IDENT = /^[A-Za-z_$][\w$]*$/
const JS_RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield', 'await', 'enum', 'implements', 'interface', 'package', 'private',
  'protected', 'public', 'static', 'null', 'true', 'false',
])

export class JsTransformError extends Error {
  constructor(stepId: string, scriptSnippet: string, message: string) {
    super(`js-transform 步骤 ${stepId} 执行失败：${message}`)
    this.name = 'JsTransformError'
    void scriptSnippet
  }
}

/** Execute a js-transform step's script via named-parameter injection. */
export async function executeJsTransform(step: WorkflowStep, context: VariableContext): Promise<unknown> {
  const input = extractRawValues(context, 'input')
  const global = extractRawValues(context, 'global')
  const local = extractRawValues(context, 'local')
  const localNames = Object.keys(local)

  guardValidIdentifiers(localNames)

  const fn = new Function('input', 'global', ...localNames, step.script ?? '')
  try {
    return await fn(input, global, ...localNames.map((name) => local[name]))
  } catch (error) {
    throw new JsTransformError(step.id, step.script ?? '', error instanceof Error ? error.message : String(error))
  }
}

function guardValidIdentifiers(names: string[]): void {
  for (const name of names) {
    if (!IDENT.test(name) || JS_RESERVED.has(name) || RESERVED.has(name)) {
      throw new Error(`非法变量名：${name}`)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/js-transform-executor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/js-transform-executor.ts src/server/workflow/js-transform-executor.test.ts
git commit -m "feat(workflow): add js-transform executor with named-param injection" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: sql-executor

**Files:**
- Create: `src/server/workflow/sql-executor.ts`
- Create: `src/server/workflow/sql-executor.test.ts`

**Interfaces:**
- Consumes: `WorkflowStep`, `ApiDefinitionDraft` (only for symbols plumbing is external) from `@/shared/schemas/api-definition.schema`; `VariableContext` from `@/server/analyzer/types`; `Knex`, `Knex.Transaction` from `knex`; `KnexRegistry` from `@/server/infra/knex/knex-registry`; `DataSource` from `@/shared/contracts/data-source.contract`; `renderFromPlan` from `@/server/analyzer/render-from-plan`; `CompiledSqlPlan` from `@/server/analyzer/types`; `PlanCache`, `WorkflowSymbols` from `@/server/workflow/plan-cache`; `bindVariableValues` from `@/server/workflow/variable-binder`; `toKnexConfig` from `@/server/workflow/datasource-config`; `normalizeResult` from `@/server/workflow/normalize-result`.
- Produces: `executeSql(step, context, deps, { symbols, planCache, trx? }): Promise<unknown>`; plus a `buildWorkflowSymbols(api, globalNames)` helper exported from a new `workflow-symbols.ts` (created here to avoid an extra task).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Knex } from 'knex'
import { createVariableContext } from '@/server/analyzer/types'
import { executeSql } from '@/server/workflow/sql-executor'
import type { PlanCache, WorkflowSymbols } from '@/server/workflow/plan-cache'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'

const pg: DataSource = {
  id: 'ds1', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd',
  username: 'u', password: 'p', createdAt: 't', updatedAt: 't',
}
const symbols: WorkflowSymbols = { inputNames: [], globalNames: [], localNames: [], defaults: {} }

function ctxWith(localRows: unknown[]) {
  const c = createVariableContext()
  c.set('local', 'rows', { value: localRows, type: 'array' })
  return c
}

function fakePlanCache() {
  return { getOrCompile: vi.fn(() => ({ sql: 'SELECT 1', params: [] })) } as unknown as PlanCache
}

function knexReturning(rawResult: unknown) {
  const raw = vi.fn().mockResolvedValue(rawResult)
  const knex = { raw } as unknown as Knex
  return { knex, raw }
}

const step = (overrides: Partial<WorkflowStep> = {}): WorkflowStep => ({
  id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'rows', datasourceId: 'ds1', sql: 'SELECT 1', ...overrides,
})

describe('executeSql', () => {
  it('renders, executes via knex.raw, and returns the row array (multipleRows default)', async () => {
    const { knex, raw } = knexReturning({ rows: [{ id: 1 }, { id: 2 }] })
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step(), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })

    expect(raw).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('returns the first row when multipleRows is false', async () => {
    const { knex } = knexReturning({ rows: [{ id: 1 }, { id: 2 }] })
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step({ multipleRows: false }), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })

    expect(result).toEqual({ id: 1 })
  })

  it('returns null when multipleRows is false and there are no rows', async () => {
    const { knex } = knexReturning({ rows: [] })
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step({ multipleRows: false }), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })

    expect(result).toBeNull()
  })

  it('uses trx.raw when a transaction is provided', async () => {
    const { knex } = knexReturning({ rows: [{ id: 1 }] })
    const trxRaw = vi.fn().mockResolvedValue({ rows: [{ id: 9 }] })
    const trx = { raw: trxRaw } as unknown as Knex.Transaction
    const getDataSource = vi.fn(() => pg)
    const knexRegistry = { getOrCreate: vi.fn(() => knex) } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    const result = await executeSql(step(), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache(), trx })

    expect(trxRaw).toHaveBeenCalledTimes(1)
    expect(knex.raw as unknown).not.toHaveBeenCalled()
    expect(result).toEqual([{ id: 9 }])
  })

  it('throws when the data source is missing', async () => {
    const getDataSource = vi.fn(() => undefined)
    const knexRegistry = { getOrCreate: vi.fn() } as unknown as Parameters<typeof executeSql>[2]['knexRegistry']

    await expect(executeSql(step(), ctxWith([]), { knexRegistry, getDataSource }, { symbols, planCache: fakePlanCache() })).rejects.toThrow(/数据源/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/sql-executor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`src/server/workflow/sql-executor.ts`:

```ts
import type { Knex } from 'knex'

import type { VariableContext } from '@/server/analyzer/types'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { KnexRegistry } from '@/server/infra/knex/knex-registry'
import { bindVariableValues } from '@/server/workflow/variable-binder'
import { toKnexConfig } from '@/server/workflow/datasource-config'
import { normalizeResult } from '@/server/workflow/normalize-result'
import type { PlanCache, WorkflowSymbols } from '@/server/workflow/plan-cache'

const DEFAULT_TIMEOUT_MS = 30_000

export type SqlExecutorDeps = {
  knexRegistry: KnexRegistry
  getDataSource: (id: string) => DataSource | undefined
}

export type SqlExecutorOptions = {
  symbols: WorkflowSymbols
  planCache: PlanCache
  trx?: Knex.Transaction
}

export async function executeSql(
  step: WorkflowStep,
  context: VariableContext,
  deps: SqlExecutorDeps,
  options: SqlExecutorOptions,
): Promise<unknown> {
  const dataSource = deps.getDataSource(step.datasourceId ?? '')
  if (!dataSource) throw new Error(`数据源 ${step.datasourceId ?? ''} 不存在`)

  const plan = options.planCache.getOrCompile(step, options.symbols, { dataSource })
  const rendered = renderFromPlan(plan, bindVariableValues(context))
  const paramValues = rendered.params.map((p) => p.value) as Knex.RawBinding[]

  const knex = deps.knexRegistry.getOrCreate(toKnexConfig(dataSource))
  const executor = options.trx ?? knex
  const raw = await (executor as Knex).raw(rendered.sql, paramValues).timeout(DEFAULT_TIMEOUT_MS, { cancel: true })

  const client = toKnexConfig(dataSource).client
  const rows = normalizeResult(raw, client)

  return step.multipleRows === false ? (rows[0] ?? null) : rows
}
```

Also create `src/server/workflow/workflow-symbols.ts` (consumed by the runner later):

```ts
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'
import type { WorkflowSymbols } from '@/server/workflow/plan-cache'

/** Build the symbol table (names + defaults) the analyzer needs for one API run. */
export function buildWorkflowSymbols(api: ApiDefinitionDraft, globalNames: string[]): WorkflowSymbols {
  return {
    inputNames: api.requestParams.map((p) => p.name),
    globalNames,
    localNames: [...api.localVariables.map((v) => v.name), ...api.workflowSteps.map((s) => s.outputVariable)],
    defaults: Object.fromEntries(
      api.localVariables
        .filter((v) => v.mode === 'defaulted' && v.defaultValue !== undefined)
        .map((v) => [v.name, v.defaultValue]),
    ),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/sql-executor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/sql-executor.ts src/server/workflow/sql-executor.test.ts src/server/workflow/workflow-symbols.ts
git commit -m "feat(workflow): add sql executor with render/normalize/multipleRows" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: result-assembler

**Files:**
- Create: `src/server/workflow/result-assembler.ts`
- Create: `src/server/workflow/result-assembler.test.ts`

**Interfaces:**
- Consumes: `ApiDefinitionDraft`, `SchemaField` from `@/shared/schemas/api-definition.schema`; `VariableContext` from `@/server/analyzer/types`.
- Produces: `assembleResponse(api, context): { response: unknown; diagnostics: ResponseDiagnostic[] }`; throws `AssembleStepMissingError`-style error if no/many assemble steps.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'
import { assembleResponse } from '@/server/workflow/result-assembler'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'

function api(steps: WorkflowStep[], responseSchema: ApiDefinitionDraft['responseSchema'] = []): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'draft', name: 'a', path: '/a', method: 'POST',
    tags: [], permissions: [], bodyContentType: 'json', requestParams: [],
    responseSchema, localVariables: [], workflowSteps: steps,
  } as ApiDefinitionDraft
}

describe('assembleResponse', () => {
  it('returns the assemble step outputVariable value', () => {
    const ctx = createVariableContext()
    ctx.set('local', 'data', { value: { list: [1, 2] }, type: 'object' })
    const steps = [{ id: 's1', kind: 'js-transform' as const, title: 'assemble', outputVariable: 'data', role: 'assemble' }]
    const { response, diagnostics } = assembleResponse(api(steps), ctx)
    expect(response).toEqual({ list: [1, 2] })
    expect(diagnostics).toEqual([])
  })

  it('records a diagnostic when a required top-level field is missing', () => {
    const ctx = createVariableContext()
    ctx.set('local', 'data', { value: { list: [1] }, type: 'object' })
    const steps = [{ id: 's1', kind: 'js-transform' as const, title: 'assemble', outputVariable: 'data', role: 'assemble' }]
    const schema = [{ id: 'f1', name: 'total', type: 'integer' as const, required: true }]
    const { diagnostics } = assembleResponse(api(steps, schema), ctx)
    expect(diagnostics).toContainEqual({ field: 'total', message: '缺少必填字段 total' })
  })

  it('throws when there is no assemble step', () => {
    const ctx = createVariableContext()
    const steps = [{ id: 's1', kind: 'sql-query' as const, title: 'q', outputVariable: 'rows' }]
    expect(() => assembleResponse(api(steps), ctx)).toThrow(/assemble/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/result-assembler.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { ApiDefinitionDraft, SchemaField } from '@/shared/schemas/api-definition.schema'
import type { VariableContext } from '@/server/analyzer/types'

export type ResponseDiagnostic = { field: string; message: string }

export type AssembleResult = { response: unknown; diagnostics: ResponseDiagnostic[] }

/** Locate the assemble step, return its output, validate against responseSchema (v1: validate + passthrough). */
export function assembleResponse(api: ApiDefinitionDraft, context: VariableContext): AssembleResult {
  const assembleSteps = api.workflowSteps.filter((s) => s.role === 'assemble')
  if (assembleSteps.length !== 1) {
    throw new Error(`工作流必须包含且仅包含一个 role="assemble" 步骤，当前为 ${assembleSteps.length} 个`)
  }

  const assembleStep = assembleSteps[0]
  const response = context.get('local', assembleStep.outputVariable)?.value
  const diagnostics = validateResponseShape(response, api.responseSchema as SchemaField[])
  return { response, diagnostics }
}

function validateResponseShape(response: unknown, schema: SchemaField[]): ResponseDiagnostic[] {
  const diagnostics: ResponseDiagnostic[] = []
  if (response === null || response === undefined || typeof response !== 'object' || Array.isArray(response)) {
    return diagnostics
  }
  const record = response as Record<string, unknown>
  for (const field of schema) {
    if (field.required && record[field.name] === undefined) {
      diagnostics.push({ field: field.name, message: `缺少必填字段 ${field.name}` })
    }
  }
  return diagnostics
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/result-assembler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/result-assembler.ts src/server/workflow/result-assembler.test.ts
git commit -m "feat(workflow): add result assembler with lightweight schema validation" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: workflow-runner rewrite (+ test update)

**Files:**
- Modify: `src/server/workflow/workflow-runner.ts` (rewrite to new contract)
- Modify: `src/server/workflow/workflow-runner.test.ts` (rewrite for new contract)

**Interfaces:**
- Consumes: everything from Tasks 1, 2, 7, 8, 9, 10, 11; `buildApiVariableContext` from existing `variable-context-builder`; `evalExpressionFromContext` from `expression-evaluator`; `getTypeDefaultValue` from `variable-context-builder`.
- Produces: `runWorkflow(api, inputValues, globalValues, deps?, options?): Promise<WorkflowRunResult>`; types `WorkflowDeps`, `WorkflowRunResult`, `StepResult`, `WorkflowErrorCode`, `StepKind`, and `classifyStep` default + `StatementClassification`.

- [ ] **Step 1: Write the failing test (replace the whole test file)**

`src/server/workflow/workflow-runner.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { Knex } from 'knex'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'
import { runWorkflow } from '@/server/workflow/workflow-runner'

function buildApi(definition: Partial<ApiDefinitionDraft> & { workflowSteps: ApiDefinitionDraft['workflowSteps'] }): ApiDefinitionDraft {
  return {
    projectId: 'p1', status: 'draft', name: 'Test API', path: '/test', method: 'POST',
    tags: [], permissions: [], bodyContentType: 'json', requestParams: [], responseSchema: [],
    localVariables: [], ...definition,
  } as ApiDefinitionDraft
}

const noopDeps = { knexRegistry: {}, getDataSource: () => undefined, analyzer: {} } as never
const trxTestDeps = {
  getDataSource: () => ({ id: 'dsA', name: 'pg', dialect: 'postgresql', host: 'h', port: 5432, database: 'd', username: 'u', password: 'p', createdAt: 't', updatedAt: 't' }),
  knexRegistry: { getOrCreate: () => ({}) },
  analyzer: {},
} as never

describe('runWorkflow', () => {
  it('returns INVALID_INPUT when a required param is missing', async () => {
    const api = buildApi({
      requestParams: [{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }],
      workflowSteps: [],
    })
    const result = await runWorkflow(api, {}, {}, noopDeps)
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('INVALID_INPUT')
  })

  it('dispatches each step to executeStep and writes the output to local scope', async () => {
    const s1: WorkflowStep = { id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'orders' }
    const s2: WorkflowStep = { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' }
    const api = buildApi({ workflowSteps: [s1, s2] })
    const stub = vi.fn().mockResolvedValue([{ id: 1 }])

    const result = await runWorkflow(api, {}, {}, noopDeps, { executeStep: stub })

    expect(result.status).toBe('success')
    expect(stub).toHaveBeenCalledWith(s1, expect.any(Object), noopDeps)
    expect(result.context.get('local', 'orders')?.value).toEqual([{ id: 1 }])
    expect(result.context.get('local', 'orders')?.type).toBe('array')
  })

  it('skips a step whose condition is false and writes the default value', async () => {
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'orders', condition: '$input.enabled' },
        { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockResolvedValue('ok')
    const result = await runWorkflow(api, { enabled: false }, {}, noopDeps, { executeStep: stub })
    expect(stub).toHaveBeenCalledTimes(1)
    expect(result.context.get('local', 'orders')?.value).toEqual([])
    expect(result.stepResults[0]).toMatchObject({ stepId: 's1', status: 'skipped' })
    expect(result.stepResults[1]).toMatchObject({ stepId: 's2', status: 'success' })
  })

  it('returns the assemble step output as response', async () => {
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockResolvedValue({ list: [1] })
    const result = await runWorkflow(api, {}, {}, noopDeps, { executeStep: stub })
    expect(result.response).toEqual({ list: [1] })
  })

  it('returns ASSEMBLE_MISSING when no assemble step exists', async () => {
    const api = buildApi({ workflowSteps: [{ id: 's1', kind: 'sql-query', title: 'q', outputVariable: 'rows' }] })
    const stub = vi.fn().mockResolvedValue([])
    const result = await runWorkflow(api, {}, {}, noopDeps, { executeStep: stub })
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('ASSEMBLE_MISSING')
  })

  it('returns WRITE_ACROSS_DATASOURCES when write steps target different sources', async () => {
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q1', outputVariable: 'a', datasourceId: 'dsA' },
        { id: 's2', kind: 'sql-query', title: 'q2', outputVariable: 'b', datasourceId: 'dsB' },
        { id: 's3', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn()
    const result = await runWorkflow(api, {}, {}, noopDeps, {
      executeStep: stub,
      classifyStep: () => 'write',
    })
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('WRITE_ACROSS_DATASOURCES')
  })

  it('opens one transaction for write steps sharing a datasource and commits on success', async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    const rollback = vi.fn()
    const trx = { commit, rollback } as unknown as Knex.Transaction
    const openTransaction = vi.fn().mockResolvedValue(trx)
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q1', outputVariable: 'a', datasourceId: 'dsA' },
        { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockResolvedValue(1)
    const result = await runWorkflow(api, {}, {}, trxTestDeps, {
      executeStep: stub,
      classifyStep: (s) => (s.kind === 'sql-query' ? 'write' : 'read'),
      openTransaction,
    })
    expect(openTransaction).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(rollback).not.toHaveBeenCalled()
    expect(result.status).toBe('success')
  })

  it('rolls back and returns STEP_FAILED when a step throws', async () => {
    const rollback = vi.fn().mockResolvedValue(undefined)
    const trx = { commit: vi.fn(), rollback } as unknown as Knex.Transaction
    const openTransaction = vi.fn().mockResolvedValue(trx)
    const api = buildApi({
      workflowSteps: [
        { id: 's1', kind: 'sql-query', title: 'q1', outputVariable: 'a', datasourceId: 'dsA' },
        { id: 's2', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble' },
      ],
    })
    const stub = vi.fn().mockRejectedValue(new Error('boom'))
    const result = await runWorkflow(api, {}, {}, trxTestDeps, {
      executeStep: stub,
      classifyStep: (s) => (s.kind === 'sql-query' ? 'write' : 'read'),
      openTransaction,
    })
    expect(result.status).toBe('failed')
    expect(result.error?.code).toBe('STEP_FAILED')
    expect(result.error?.stepId).toBe('s1')
    expect(rollback).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/workflow/workflow-runner.test.ts`
Expected: FAIL — `runWorkflow(api, {}, {}, noopDeps)` either type or behavior mismatch (old contract returns `{context, results}`).

- [ ] **Step 3: Write minimal implementation**

Replace the entire contents of `src/server/workflow/workflow-runner.ts`:

```ts
import type { Knex } from 'knex'

import { evalExpressionFromContext } from '@/server/expression/expression-evaluator'
import type { EnhancedSqlAnalyzer } from '@/server/analyzer'
import type { VariableContext } from '@/server/analyzer/types'
import type { KnexRegistry } from '@/server/infra/knex/knex-registry'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { ApiDefinitionDraft, WorkflowStep } from '@/shared/schemas/api-definition.schema'
import { buildApiVariableContext, getTypeDefaultValue } from '@/server/workflow/variable-context-builder'
import { validateInput } from '@/server/workflow/input-validator'
import { buildWorkflowSymbols } from '@/server/workflow/workflow-symbols'
import { PlanCache } from '@/server/workflow/plan-cache'
import { commit as commitTrx, openTransaction, rollback as rollbackTrx } from '@/server/workflow/transaction-manager'
import { executeSql } from '@/server/workflow/sql-executor'
import { executeJsTransform } from '@/server/workflow/js-transform-executor'
import { assembleResponse, type ResponseDiagnostic } from '@/server/workflow/result-assembler'

export type WorkflowDeps = {
  knexRegistry: KnexRegistry
  getDataSource: (id: string) => DataSource | undefined
  analyzer: EnhancedSqlAnalyzer
}

export type WorkflowErrorCode = 'INVALID_INPUT' | 'WRITE_ACROSS_DATASOURCES' | 'ASSEMBLE_MISSING' | 'STEP_FAILED'

export type StepResult = {
  stepId: string
  kind: WorkflowStep['kind']
  status: 'success' | 'skipped' | 'failed'
  durationMs: number
  error?: string
}

export type WorkflowRunResult = {
  status: 'success' | 'failed'
  context: VariableContext
  stepResults: StepResult[]
  response: unknown
  diagnostics?: ResponseDiagnostic[]
  logs: Array<{ time: string; step: string; status: 'success' | 'failed'; durationMs: number }>
  error?: { code: WorkflowErrorCode; message: string; stepId?: string; details?: unknown }
}

export type StatementClassification = 'read' | 'write'

export type WorkflowOptions = {
  /** Test seam: override per-step execution. Default dispatches by `step.kind`. */
  executeStep?: (step: WorkflowStep, context: VariableContext, deps: WorkflowDeps) => Promise<unknown>
  /** Test seam: override read/write classification. Default compiles the plan and reads statement type. */
  classifyStep?: (step: WorkflowStep) => StatementClassification
  /** Test seam: override transaction open (default uses knex.transaction). */
  openTransaction?: (knex: import('knex').Knex) => Promise<import('knex').Knex.Transaction>
  onLog?: (log: { time: string; step: string; status: 'success' | 'failed'; durationMs: number }) => void
}

/**
 * Execute an API workflow. Returns a structured result; never throws for expected failures.
 */
export async function runWorkflow(
  apiDefinition: ApiDefinitionDraft,
  inputValues: Record<string, unknown>,
  globalValues: Record<string, unknown>,
  deps?: WorkflowDeps,
  options: WorkflowOptions = {},
): Promise<WorkflowRunResult> {
  const inputValidation = validateInput(apiDefinition, inputValues)
  if (!inputValidation.ok) {
    return {
      status: 'failed', context: buildApiVariableContext({ input: inputValues, global: globalValues, localVariables: [] }),
      stepResults: [], response: undefined, logs: [],
      error: { code: 'INVALID_INPUT', message: '输入参数校验失败', details: inputValidation.errors },
    }
  }

  const assembleSteps = apiDefinition.workflowSteps.filter((s) => s.role === 'assemble')
  if (assembleSteps.length !== 1 || assembleSteps[0] !== apiDefinition.workflowSteps[apiDefinition.workflowSteps.length - 1]) {
    return {
      status: 'failed', context: buildApiVariableContext({ input: inputValues, global: globalValues, localVariables: apiDefinition.localVariables }),
      stepResults: [], response: undefined, logs: [],
      error: { code: 'ASSEMBLE_MISSING', message: '工作流必须包含且仅包含一个 role="assemble" 步骤且为最后一步' },
    }
  }

  const context = buildApiVariableContext({ input: inputValues, global: globalValues, localVariables: apiDefinition.localVariables })
  const symbols = buildWorkflowSymbols(apiDefinition, Object.keys(globalValues))
  const planCache = new PlanCache(deps?.analyzer ?? ({} as EnhancedSqlAnalyzer))

  const sqlSteps = apiDefinition.workflowSteps.filter((s) => s.kind === 'sql-query')
  const classify = options.classifyStep ?? ((step) => classifySqlStep(step, deps, symbols, planCache))
  const writeSteps = sqlSteps.filter((s) => classify(s) === 'write')

  let trx: Knex.Transaction | undefined
  if (writeSteps.length > 0) {
    const datasourceIds = new Set(writeSteps.map((s) => s.datasourceId))
    if (datasourceIds.size > 1) {
      return {
        status: 'failed', context, stepResults: [], response: undefined, logs: [],
        error: { code: 'WRITE_ACROSS_DATASOURCES', message: '写步骤必须共用同一数据源', details: Array.from(datasourceIds) },
      }
    }
    if (deps) {
      const dataSource = deps.getDataSource(writeSteps[0].datasourceId ?? '')
      if (dataSource) {
        const knex = deps.knexRegistry.getOrCreate(toKnexConfigLazy(dataSource))
        trx = await (options.openTransaction ?? openTransaction)(knex)
      }
    }
  }

  const execute = options.executeStep ?? ((step, ctx, d) => dispatchStep(step, ctx, d, { symbols, planCache, trx }))

  const stepResults: StepResult[] = []
  const logs: WorkflowRunResult['logs'] = []

  for (const [index, step] of apiDefinition.workflowSteps.entries()) {
    const shouldRun = step.condition ? Boolean(evalExpressionFromContext(step.condition, context)) : true
    if (!shouldRun) {
      const outputType = inferOutputVariableType(apiDefinition.localVariables, step.outputVariable)
      context.set('local', step.outputVariable, { value: getTypeDefaultValue(outputType), type: outputType })
      stepResults.push({ stepId: step.id, kind: step.kind, status: 'skipped', durationMs: 0 })
      continue
    }

    const start = performance.now()
    try {
      const result = await execute(step, context, deps as WorkflowDeps)
      const durationMs = Math.round(performance.now() - start)
      context.set('local', step.outputVariable, { value: result, type: inferResultType(result) })
      stepResults.push({ stepId: step.id, kind: step.kind, status: 'success', durationMs })
      pushLog(logs, options, index, step, 'success', durationMs)
    } catch (error) {
      const durationMs = Math.round(performance.now() - start)
      const message = error instanceof Error ? error.message : String(error)
      stepResults.push({ stepId: step.id, kind: step.kind, status: 'failed', durationMs, error: message })
      pushLog(logs, options, index, step, 'failed', durationMs)
      if (trx) await safeRollback(trx)
      const assembled = assembleResponse(apiDefinition, context)
      return {
        status: 'failed', context, stepResults, response: assembled.response, logs,
        error: { code: 'STEP_FAILED', message, stepId: step.id, details: errorDetails(step, error) },
      }
    }
  }

  if (trx) await safeCommit(trx)

  const { response, diagnostics } = assembleResponse(apiDefinition, context)
  return { status: 'success', context, stepResults, response, logs, diagnostics }
}

async function dispatchStep(
  step: WorkflowStep,
  context: VariableContext,
  deps: WorkflowDeps,
  execOptions: { symbols: ReturnType<typeof buildWorkflowSymbols>; planCache: PlanCache; trx?: Knex.Transaction },
): Promise<unknown> {
  if (step.kind === 'sql-query') {
    return executeSql(step, context, deps, { symbols: execOptions.symbols, planCache: execOptions.planCache, trx: execOptions.trx })
  }
  return executeJsTransform(step, context)
}

function classifySqlStep(
  step: WorkflowStep,
  deps: WorkflowDeps | undefined,
  symbols: ReturnType<typeof buildWorkflowSymbols>,
  planCache: PlanCache,
): StatementClassification {
  if (!deps || !step.datasourceId) return 'read'
  const dataSource = deps.getDataSource(step.datasourceId)
  if (!dataSource) return 'read'
  const plan = planCache.getOrCompile(step, symbols, { dataSource })
  const type = deps.analyzer.getStatementType(plan)
  return type === 'insert' || type === 'update' || type === 'delete' ? 'write' : 'read'
}

function pushLog(
  logs: WorkflowRunResult['logs'],
  options: WorkflowOptions,
  index: number,
  step: WorkflowStep,
  status: 'success' | 'failed',
  durationMs: number,
): void {
  const log = { time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), step: `步骤 ${index + 1} - ${step.title}`, status, durationMs }
  logs.push(log)
  options.onLog?.(log)
}

function inferResultType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object' && value !== null) return 'object'
  return 'string'
}

function inferOutputVariableType(localVariables: ApiDefinitionDraft['localVariables'], outputVariable: string): string {
  const declared = localVariables.find((v) => v.name === outputVariable)
  return declared?.type ?? 'array'
}

function errorDetails(step: WorkflowStep, error: unknown): unknown {
  if (step.kind === 'sql-query') return { sql: step.sql, datasourceId: step.datasourceId }
  return { scriptSnippet: step.script?.slice(0, 200) }
}

async function safeCommit(trx: Knex.Transaction): Promise<void> {
  try { await commitTrx(trx) } catch { await safeRollback(trx) }
}

async function safeRollback(trx: Knex.Transaction): Promise<void> {
  try { await rollbackTrx(trx) } catch { /* ignore rollback errors */ }
}

// Re-exported for the write-group knex lookup without importing toKnexConfig twice.
function toKnexConfigLazy(dataSource: DataSource) {
  // local import to keep this file's top-level imports focused
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { toKnexConfig } = require('@/server/workflow/datasource-config') as typeof import('@/server/workflow/datasource-config')
  return toKnexConfig(dataSource)
}
```

Note: replace the `require` call with a normal top-level `import { toKnexConfig } from '@/server/workflow/datasource-config'` instead — the `require` shim above is only to illustrate; in the actual file use a top-level ESM import and call `toKnexConfig(dataSource)` directly. (The project is ESM; do not use `require`.)

So the real top of the file adds: `import { toKnexConfig } from '@/server/workflow/datasource-config'` and the body calls `deps.knexRegistry.getOrCreate(toKnexConfig(dataSource))` directly. Remove the `toKnexConfigLazy` function entirely.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/server/workflow/workflow-runner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/workflow/workflow-runner.ts src/server/workflow/workflow-runner.test.ts
git commit -m "feat(workflow): rewrite runner with deps/result contract, write-txn, assemble" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: api-test.service thin consumer (+ test)

**Files:**
- Modify: `src/server/domains/api-test/api-test.service.ts` (rewrite to thin consumer)
- Create: `src/server/domains/api-test/api-test.service.test.ts`

**Interfaces:**
- Consumes: `runWorkflow`, `loadGlobalValues`, `GlobalVariableService`, `ProjectVariableService`, `KnexRegistry`, `EnhancedSqlAnalyzer`, `DataSourceRepository`.
- Produces: `ApiTestService.run(request): Promise<ApiTestResult>` using the engine.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import type { ApiDefinitionDraft } from '@/shared/schemas/api-definition.schema'

function api(): ApiDefinitionDraft {
  return {
    projectId: 'project_order', status: 'draft', name: 'a', path: '/a', method: 'POST',
    tags: [], permissions: [], bodyContentType: 'json', requestParams: [],
    responseSchema: [],
    localVariables: [],
    workflowSteps: [{ id: 's1', kind: 'js-transform', title: 'assemble', outputVariable: 'data', role: 'assemble', script: 'return { ok: true }' }],
  } as ApiDefinitionDraft
}

describe('ApiTestService', () => {
  it('runs the workflow and packages an ApiTestResult', async () => {
    const getDataSource = vi.fn()
    const globalVariableService = { list: () => [] } as never
    const projectVariableService = { list: () => [] } as never
    const service = new ApiTestService(getDataSource, { globalVariableService, projectVariableService })

    const result = await service.run({ apiDefinition: api(), params: {} })

    expect(result.statusCode).toBe(200)
    expect(result.response).toEqual({ ok: true })
    expect(result.logs).toHaveLength(1)
    expect(result.logs[0]).toMatchObject({ status: 'success' })
  })

  it('returns a 400-shaped result on INVALID_INPUT', async () => {
    const apiWithRequired: ApiDefinitionDraft = {
      ...api(),
      requestParams: [{ id: 'r1', name: 'id', location: 'query', type: 'integer', required: true }],
    }
    const service = new ApiTestService(vi.fn(), {
      globalVariableService: { list: () => [] } as never,
      projectVariableService: { list: () => [] } as never,
    })

    const result = await service.run({ apiDefinition: apiWithRequired, params: {} })
    expect(result.statusCode).toBe(400)
    expect(result.response).toMatchObject({ code: 'INVALID_INPUT' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/server/domains/api-test/api-test.service.test.ts`
Expected: FAIL — `ApiTestService` constructor signature mismatch (old: `(getDataSource)`; new requires services).

- [ ] **Step 3: Write minimal implementation**

Replace `src/server/domains/api-test/api-test.service.ts`:

```ts
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { runWorkflow } from '@/server/workflow/workflow-runner'
import { loadGlobalValues } from '@/server/workflow/global-variable-loader'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import type { DataSource } from '@/shared/contracts/data-source.contract'
import type { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import type { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import type { ApiTestRequest, ApiTestResult, ExecutionLog } from '@/shared/contracts/api-definition.contract'

export type ApiTestServiceDeps = {
  globalVariableService: GlobalVariableService
  projectVariableService: ProjectVariableService
}

export class ApiTestService {
  private readonly analyzer = new EnhancedSqlAnalyzer()
  private readonly knexRegistry = new KnexRegistry()

  constructor(
    private readonly getDataSource: (id: string) => DataSource | undefined,
    private readonly services: ApiTestServiceDeps,
  ) {}

  async run(request: ApiTestRequest): Promise<ApiTestResult> {
    const { apiDefinition, params } = request
    const globalValues = loadGlobalValues(apiDefinition.projectId, this.services)

    const start = performance.now()
    const run = await runWorkflow(apiDefinition, params, globalValues, {
      knexRegistry: this.knexRegistry,
      getDataSource: this.getDataSource,
      analyzer: this.analyzer,
    })
    const durationMs = Math.round(performance.now() - start)

    if (run.status === 'failed') {
      const statusCode = run.error?.code === 'INVALID_INPUT' ? 400 : 500
      return {
        statusCode,
        durationMs,
        size: '0',
        requestPreview: params,
        response: { code: run.error?.code, message: run.error?.message, details: run.error?.details },
        logs: run.logs as ExecutionLog[],
      }
    }

    return {
      statusCode: 200,
      durationMs,
      size: JSON.stringify(run.response).length.toString(),
      requestPreview: params,
      response: run.response,
      logs: run.logs as ExecutionLog[],
    }
  }
}
```

Update the two call sites that construct `ApiTestService` to pass services:
- `src/server/routes/api-test.route.ts`: construct `GlobalVariableService`/`ProjectVariableService` and pass them.
- `src/server/routes/project-api.route.ts`: same.

`src/server/routes/api-test.route.ts` becomes:

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { DataSourceRepository } from '@/server/domains/data-source/data-source.repository'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { ProjectVariableService } from '@/server/domains/project-variable/project-variable.service'
import { ProjectVariableRepository } from '@/server/domains/project-variable/project-variable.repository'
import { apiTestRequestSchema } from '@/shared/contracts/api-definition.contract'

const dataSourceRepository = new DataSourceRepository()
const service = new ApiTestService(
  (id) => dataSourceRepository.get(id),
  {
    globalVariableService: new GlobalVariableService(new GlobalVariableRepository()),
    projectVariableService: new ProjectVariableService(new ProjectVariableRepository()),
  },
)

export const apiTestRoute = new Hono().post(
  '/run',
  zValidator('json', apiTestRequestSchema),
  async (context) => context.json(await service.run(context.req.valid('json'))),
)
```

In `src/server/routes/project-api.route.ts`, replace the `apiTestService` construction (lines ~16) with the same services-bearing constructor:

```ts
const apiTestService = new ApiTestService(
  (id) => dataSourceRepository.get(id),
  {
    globalVariableService: new GlobalVariableService(new GlobalVariableRepository()),
    projectVariableService: new ProjectVariableService(new ProjectVariableRepository()),
  },
)
```

- [ ] **Step 4: Run tests to verify pass (service + route regressions + typecheck)**

Run: `pnpm test -- src/server/domains/api-test/api-test.service.test.ts src/routes/task.route.test.ts` then `pnpm typecheck`
Expected: PASS (service test passes; typecheck clean).

- [ ] **Step 5: Commit**

```bash
git add src/server/domains/api-test/api-test.service.ts src/server/domains/api-test/api-test.service.test.ts src/server/routes/api-test.route.ts src/server/routes/project-api.route.ts
git commit -m "refactor(api-test): thin consumer over runWorkflow + global loader" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: update CLAUDE.md structure description

**Files:**
- Modify: `CLAUDE.md` — under the `modules/api-management` editor tree, the design note, and the `server/` tree, reflect that execution executors live under `server/workflow/` (not `domains/api-test/`).

- [ ] **Step 1: Locate the structure section in `CLAUDE.md`**

Open `CLAUDE.md` and find the `server/domains/api-test/` subtree in the Project Structure block (the one listing `api-test.service.ts`, `workflow-runner.ts`, `sql-executor.ts`, `variable-binder.ts`, `result-assembler.ts` under `domains/api-test`).

- [ ] **Step 2: Edit the structure**

Remove `workflow-runner.ts`, `sql-executor.ts`, `variable-binder.ts`, `result-assembler.ts` etc. from the `domains/api-test/` subtree (leave `api-test.service.ts` there as the thin consumer). Add a `server/workflow/` subtree entry:

```text
│   ├── workflow/                    # 执行引擎（可复用，被试运行与发布态调用复用）
│   │   ├── workflow-runner.ts       # 编排循环 + 写事务 + assemble
│   │   ├── variable-context-builder.ts
│   │   ├── variable-binder.ts       # 提取 {input,global,local} 原始值
│   │   ├── input-validator.ts       # 按 requestParams 校验输入
│   │   ├── global-variable-loader.ts
│   │   ├── datasource-config.ts     # DataSource → Knex 配置 + 方言映射
│   │   ├── normalize-result.ts      # knex.raw 结果归一化
│   │   ├── plan-cache.ts            # CompiledSqlPlan LRU
│   │   ├── transaction-manager.ts
│   │   ├── sql-executor.ts
│   │   ├── js-transform-executor.ts
│   │   ├── result-assembler.ts
│   │   └── workflow-symbols.ts
```

Also update the "Key Architecture Decisions" note that references execution: add a one-line pointer that the engine is under `server/workflow/` and is shared by the test panel and (future) published dispatch.

- [ ] **Step 3: Verify markdown renders and typecheck unaffected**

Run: `pnpm typecheck`
Expected: PASS (docs-only change; typecheck clean).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: move execution engine to server/workflow in CLAUDE.md structure" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage** — mapped to tasks:
- Module layout (spec §1) → Tasks 1–14 create every listed file; Task 14 updates CLAUDE.md.
- Engine/consumer contract (§2) → Task 12 (`runWorkflow` + `WorkflowRunResult`), Task 2 (`validateInput`), Task 3 (`loadGlobalValues`).
- WorkflowRunner + TransactionManager (§3) → Task 12 (loop, write pre-scan, trx), Task 8 (txn manager).
- SqlExecutor + binder + globals + PlanCache (§4) → Tasks 1, 3, 4, 5, 7, 10.
- JsTransformExecutor + ResultAssembler (§5) → Tasks 9, 11.
- Error handling + logging (§6) → Task 12 (`status`/`error.code`, `logs`, `onLog`), Task 13 (HTTP mapping).
- Testing strategy (§7) → every task has unit tests; Task 12 integration tests cover grouping/txn/abort.
- Deferred + Part B contract (§8) → documented in spec; engine contract (Task 12) is the Part B seam.

**2. Placeholder scan** — the Task 12 `require` shim is explicitly called out and instructed to be replaced with a top-level ESM import; no other TBD/TODO. Commit messages, file paths, and test commands are concrete.

**3. Type consistency** — `WorkflowSymbols` defined in Task 7 (`plan-cache.ts`) and re-used in Tasks 10, 12; `WorkflowDeps`, `WorkflowRunResult`, `StepResult`, `WorkflowErrorCode` defined in Task 12 and consumed in Task 13; `extractRawValues` defined in Task 1, consumed in Tasks 9, 10; `toKnexConfig`/`mapParserDialect` defined in Task 4, consumed in Tasks 7, 10, 12; `PlanCache.getOrCompile(step, symbols, { dataSource })` signature consistent across Tasks 7, 10, 12. The `StatementClassification` seam (`classifyStep`) is defined in Task 12 and used in the runner tests.
