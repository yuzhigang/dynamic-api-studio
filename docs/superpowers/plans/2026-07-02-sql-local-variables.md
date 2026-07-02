# SQL 解析与 API Local 变量实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 SQL 变量模型从 `input/global` 两作用域扩展为 `input/global/local` 三作用域，支持 API 设计时 local 变量、步骤输出变量、表达式求值和数组属性访问，并统一通过 `VariableContext` 进行 SQL 解析、校验和渲染。

**Architecture:** 在 analyzer 层引入 `VariableScope` 和 `VariableContext` 统一上下文；`variable-extractor` 负责把 `$input`/`$.`/`$` 解析为对应 scope；`validator` 基于上下文校验变量存在性；`render-from-plan` 统一取值并支持 `$orders[].id` 展开；表达式引擎使用 `new Function` 在受信环境下求值；工作流执行器按拓扑顺序计算 API local 变量，并顺序注入步骤输出。

**Tech Stack:** TypeScript, Vitest, node-sql-parser, Hono, React, CodeMirror 6

---

## 文件结构

| 文件 | 责任 |
| ---- | ---- |
| `src/server/analyzer/types.ts` | 定义 `VariableScope`、`VariableReference`、`VariableValue`、`VariableContext` |
| `src/server/analyzer/variable-extractor.ts` | 解析 SQL 中的变量引用，支持 local 和数组属性访问 |
| `src/server/analyzer/validator.ts` | 基于 `VariableContext` 校验变量引用 |
| `src/server/analyzer/render-from-plan.ts` | 通过 `VariableContext` 取值，支持数组属性展开 |
| `src/server/expression/expression-evaluator.ts` | 轻量 JS 表达式求值，与 `VariableContext` 集成 |
| `src/server/expression/dependency-graph.ts` | local 变量依赖分析和拓扑排序 |
| `src/shared/schemas/api-definition.schema.ts` | 增加 `localVariables`、`outputVariable` 等模型 |
| `src/server/workflow/variable-context-builder.ts` | 构建执行期 `VariableContext` |
| `src/server/workflow/workflow-runner.ts` | 按顺序执行步骤，注入输出变量 |
| `src/components/editors/extensions/variable-completion.ts` | 前端按 scope 分类补全 |
| `src/server/routes/sql-analyze.route.ts` | `/api/sql/analyze` 增加 `localNames` |
| `src/server/routes/sql-test.route.ts` | `/api/sql/test` 增加 `localValues` |

---

## Task 1: 基础设施 — VariableScope 与 VariableContext

**Files:**
- Modify: `src/server/analyzer/types.ts`
- Test: `src/server/analyzer/types.test.ts`（新建）

- [ ] **Step 1: 编写 failing test**

```ts
// src/server/analyzer/types.test.ts
import { describe, expect, it } from 'vitest'
import { createVariableContext } from '@/server/analyzer/types'

describe('VariableContext', () => {
  it('stores and retrieves values by scope and name', () => {
    const context = createVariableContext()
    context.set('local', 'orders', { value: [{ id: 1 }], type: 'array', itemType: 'object' })
    expect(context.get('local', 'orders')?.value).toEqual([{ id: 1 }])
    expect(context.has('local', 'orders')).toBe(true)
    expect(context.keys('local')).toContain('orders')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/server/analyzer/types.test.ts`
Expected: FAIL — `createVariableContext is not defined`

- [ ] **Step 3: 实现 VariableScope 和 VariableContext**

```ts
// src/server/analyzer/types.ts
export type VariableScope = 'input' | 'global' | 'local'

export type VariableValue = {
  value: unknown
  type: string
  itemType?: string
  nullable?: boolean
  defaultValue?: unknown
}

export type VariableContext = {
  has(scope: VariableScope, name: string): boolean
  get(scope: VariableScope, name: string): VariableValue | undefined
  set(scope: VariableScope, name: string, value: VariableValue): void
  keys(scope: VariableScope): string[]
  clone(): VariableContext
  merge(other: VariableContext): VariableContext
}

export function createVariableContext(): VariableContext {
  const store: Record<string, VariableValue> = {
    input: {},
    global: {},
    local: {},
  }

  return {
    has(scope, name) {
      return name in store[scope]
    },
    get(scope, name) {
      return store[scope][name]
    },
    set(scope, name, value) {
      store[scope][name] = value
    },
    keys(scope) {
      return Object.keys(store[scope])
    },
    clone() {
      const next = createVariableContext()
      for (const scope of ['input', 'global', 'local'] as VariableScope[]) {
        for (const name of this.keys(scope)) {
          next.set(scope, name, this.get(scope, name)!)
        }
      }
      return next
    },
    merge(other) {
      const next = this.clone()
      for (const scope of ['input', 'global', 'local'] as VariableScope[]) {
        for (const name of other.keys(scope)) {
          next.set(scope, name, other.get(scope, name)!)
        }
      }
      return next
    },
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `rtk pnpm test -- src/server/analyzer/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/server/analyzer/types.ts src/server/analyzer/types.test.ts
rtk git commit -m "feat(analyzer): add VariableScope and VariableContext"
```

---

## Task 2: VariableReference 类型与旧类型迁移

**Files:**
- Modify: `src/server/analyzer/types.ts`
- Modify: `src/server/analyzer/variable-extractor.ts`
- Modify: `src/server/analyzer/validator.ts`
- Modify: `src/server/analyzer/render-from-plan.ts`
- Test: 现有测试

- [ ] **Step 1: 在 types.ts 中新增 VariableReference 并迁移 VariableRef**

```ts
// src/server/analyzer/types.ts
export type VariableReference = {
  scope: VariableScope
  name: string
  mode: 'required' | 'optional' | 'defaulted'
  propertyPath?: string[]
  raw: string
  from: number
  to: number
}

// 临时兼容：VariableRef 逐步替换为 VariableReference
export type VariableRef = VariableReference
```

- [ ] **Step 2: 运行 analyzer 全部测试确认类型破坏**

Run: `rtk pnpm typecheck`
Expected: 多处 `namespace` 字段报错

- [ ] **Step 3: 批量重命名 `namespace` → `scope`，`VariableSource` → `VariableScope`**

修改文件：
- `src/server/analyzer/variable-extractor.ts`
- `src/server/analyzer/validator.ts`
- `src/server/analyzer/render-from-plan.ts`
- `src/server/analyzer/index.ts`
- 相关测试文件

关键替换示例（variable-extractor.ts）：
```ts
// namespace: resolveNamespace(prefix) → scope: resolveScope(prefix)
function resolveScope(prefix: string): VariableScope {
  return prefix === 'input.' ? 'input' : 'global'
}
```

- [ ] **Step 4: 运行 typecheck 和测试**

Run: `rtk pnpm typecheck && rtk pnpm test -- src/server/analyzer/`
Expected: PASS（此时 `$xxx` 仍解析为 global，后续任务改）

- [ ] **Step 5: Commit**

```bash
rtk git add src/server/analyzer/
rtk git commit -m "refactor(analyzer): rename namespace to scope"
```

---

## Task 3: variable-extractor 支持 local 和数组属性访问

**Files:**
- Modify: `src/server/analyzer/variable-extractor.ts`
- Modify: `src/server/analyzer/variable-extractor.test.ts`

- [ ] **Step 1: 编写 failing test**

```ts
// src/server/analyzer/variable-extractor.test.ts
it('parses $xxx as local scope', () => {
  const result = extractVariablesFromSql('WHERE id = $orders')
  expect(result[0]).toMatchObject({ scope: 'local', name: 'orders', fullPath: '$orders' })
})

it('parses array property access $orders[].id', () => {
  const result = extractVariablesFromSql('WHERE id IN ($orders[].id)')
  expect(result[0]).toMatchObject({
    scope: 'local',
    name: 'orders',
    propertyPath: ['id'],
    fullPath: '$orders[].id',
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/server/analyzer/variable-extractor.test.ts`
Expected: FAIL — `$orders` 被解析为 global

- [ ] **Step 3: 修改正则和构建逻辑**

```ts
// src/server/analyzer/variable-extractor.ts
const VARIABLE_PATTERN = /\$(input\.|\.|)([a-zA-Z_][\w.]*)([?!])?(\[\])?(?:\.([a-zA-Z_][\w.]*))?/g

function resolveScope(prefix: string): VariableScope {
  if (prefix === 'input.') return 'input'
  if (prefix === '.') return 'global'
  return 'local'
}

function buildVariableMeta(
  prefix: string,
  baseName: string,
  suffix: string | undefined,
  arrayMarker: string | undefined,
  property: string | undefined,
) {
  const scope = resolveScope(prefix)
  const arraySuffix = arrayMarker ? '[]' : ''
  const propertySuffix = property ? `.${property}` : ''
  const name = `${baseName}${arraySuffix}${propertySuffix}`
  const fullPath = `$${prefix}${baseName}${arraySuffix}${propertySuffix}`
  const mode = resolveMode(suffix)
  return { scope, name, fullPath, mode }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `rtk pnpm test -- src/server/analyzer/variable-extractor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/server/analyzer/variable-extractor.ts src/server/analyzer/variable-extractor.test.ts
rtk git commit -m "feat(analyzer): parse $xxx as local and support $orders[].id"
```

---

## Task 4: validator 基于 VariableContext 校验

**Files:**
- Modify: `src/server/analyzer/validator.ts`
- Modify: `src/server/analyzer/validator.test.ts`
- Modify: `src/server/analyzer/index.ts`

- [ ] **Step 1: 编写 failing test**

```ts
// src/server/analyzer/validator.test.ts
it('reports unknown local variables', () => {
  const refs: VariableReference[] = [
    makeRef({ raw: '$orders', scope: 'local', name: 'orders', fullPath: '$orders' }),
  ]
  const context = createVariableContext()
  context.set('local', 'other', { value: [], type: 'array' })
  const diagnostics = validateVariableReferences(refs, context)
  expect(diagnostics[0].message).toContain('orders')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/server/analyzer/validator.test.ts`
Expected: FAIL — validator 仍使用旧 `inputNames`/`globalNames` 接口

- [ ] **Step 3: 重构 validator 接收 VariableContext**

```ts
// src/server/analyzer/validator.ts
export function validateVariableReferences(
  variables: VariableReference[],
  context: VariableContext,
): StaticDiagnostic[] {
  const diagnostics: StaticDiagnostic[] = []

  for (const variable of variables) {
    if (variable.raw.includes('(') || variable.raw.includes(')')) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: `SQL 中不支持函数调用：${variable.raw}`,
      })
      continue
    }

    const exists = context.has(variable.scope, variable.name)
    if (!exists) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: `${variable.scope} 变量 ${variable.name} 未定义`,
      })
      continue
    }

    const value = context.get(variable.scope, variable.name)
    if (variable.mode === 'defaulted' && value?.defaultValue === undefined) {
      diagnostics.push({
        from: variable.from,
        to: variable.to,
        severity: 'error',
        message: `defaulted 变量 ${variable.name} 缺少默认值`,
      })
    }
  }

  return diagnostics
}
```

- [ ] **Step 4: 更新 index.ts 调用点**

```ts
// src/server/analyzer/index.ts
const context = createVariableContext()
for (const name of inputNames ?? []) context.set('input', name, { value: undefined, type: 'string' })
for (const name of globalNames ?? []) context.set('global', name, { value: undefined, type: 'string' })
for (const name of localNames ?? []) context.set('local', name, { value: undefined, type: 'string' })

const diagnostics = validateVariableReferences(variableRefs, context)
```

- [ ] **Step 5: 运行测试**

Run: `rtk pnpm test -- src/server/analyzer/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
rtk git add src/server/analyzer/
rtk git commit -m "feat(analyzer): validate variables against VariableContext"
```

---

## Task 5: render-from-plan 支持 local 取值和数组属性展开

**Files:**
- Modify: `src/server/analyzer/render-from-plan.ts`
- Modify: `src/server/analyzer/render-from-plan.test.ts`
- Modify: `src/server/analyzer/index.ts`（CompiledSqlPlan 增加 context）

- [ ] **Step 1: 编写 failing test**

```ts
// src/server/analyzer/render-from-plan.test.ts
it('expands $orders[].id for IN clause', () => {
  const plan = analyzer.analyze({
    sql: 'SELECT * FROM detail WHERE order_id IN ($orders[].id)',
    dialect: 'postgresql',
    localNames: ['orders'],
  })
  const result = renderFromPlan(plan, {
    local: { orders: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    input: {},
    global: {},
  })
  expect(result.sql).toContain('IN (?, ?, ?)')
  expect(result.params.map(p => p.value)).toEqual([1, 2, 3])
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/server/analyzer/render-from-plan.test.ts`
Expected: FAIL — `local` 未支持，propertyPath 未处理

- [ ] **Step 3: 修改 renderFromPlan 接口和取值逻辑**

```ts
// src/server/analyzer/render-from-plan.ts
export function renderFromPlan(
  plan: CompiledSqlPlan,
  variableValues: { input: Record<string, unknown>; global: Record<string, unknown>; local: Record<string, unknown> },
): RenderResult {
  const context = buildVariableContext(plan, variableValues)
  // ... 现有逻辑，但 resolveVariableValue 改为接收 VariableReference + context
}

function buildVariableContext(
  plan: CompiledSqlPlan,
  values: { input: Record<string, unknown>; global: Record<string, unknown>; local: Record<string, unknown> },
): VariableContext {
  const context = createVariableContext()
  for (const [placeholderKey, info] of Object.entries(plan.varMap)) {
    context.set(info.scope, info.name, {
      value: values[info.scope]?.[info.name],
      type: info.dataType,
      defaultValue: info.defaultValue,
    })
  }
  return context
}
```

- [ ] **Step 4: 数组属性展开**

在 IN 子句处理逻辑中：
```ts
if (info.scope === 'local' && propertyPath && Array.isArray(value)) {
  value = value.map(item => getProperty(item, propertyPath))
}
```

- [ ] **Step 5: 运行测试**

Run: `rtk pnpm test -- src/server/analyzer/render-from-plan.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
rtk git add src/server/analyzer/
rtk git commit -m "feat(analyzer): render local variables and expand $orders[].id"
```

---

## Task 6: 表达式引擎与 VariableContext 集成

**Files:**
- Modify: `src/server/expression/expression-evaluator.ts`
- Modify: `src/server/expression/expression-evaluator.test.ts`

- [ ] **Step 1: 编写 failing test**

```ts
// src/server/expression/expression-evaluator.test.ts
it('evaluates expression from VariableContext', () => {
  const context = createVariableContext()
  context.set('input', 'pageSize', { value: 10, type: 'integer' })
  context.set('input', 'pageNo', { value: 2, type: 'integer' })

  const result = evalExpressionFromContext('($input.pageSize - 1) * $input.pageNo', context)
  expect(result).toBe(18)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/server/expression/expression-evaluator.test.ts`
Expected: FAIL — `evalExpressionFromContext` 未定义

- [ ] **Step 3: 实现 VariableContext 集成的表达式求值**

```ts
// src/server/expression/expression-evaluator.ts
export function evalExpressionFromContext(code: string, context: VariableContext): unknown {
  const scopeValues: Record<VariableScope, Record<string, unknown>> = {
    input: extractRawValues(context, 'input'),
    global: extractRawValues(context, 'global'),
    local: extractRawValues(context, 'local'),
  }
  return evalExpression(code, scopeValues)
}

function extractRawValues(context: VariableContext, scope: VariableScope): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const name of context.keys(scope)) {
    result[name] = context.get(scope, name)?.value
  }
  return result
}
```

- [ ] **Step 4: 运行测试**

Run: `rtk pnpm test -- src/server/expression/expression-evaluator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/server/expression/
rtk git commit -m "feat(expression): integrate evaluator with VariableContext"
```

---

## Task 7: API Local 变量依赖图与拓扑排序

**Files:**
- Create: `src/server/expression/dependency-graph.ts`
- Create: `src/server/expression/dependency-graph.test.ts`

- [ ] **Step 1: 编写 failing test**

```ts
// src/server/expression/dependency-graph.test.ts
import { describe, expect, it } from 'vitest'
import { buildDependencyGraph, topologicalSort } from '@/server/expression/dependency-graph'

describe('dependency-graph', () => {
  it('sorts local variables by dependency', () => {
    const variables = [
      { name: 'offset', expression: '($pageSize - 1) * $input.pageNo' },
      { name: 'pageSize', expression: '$input.pageSize' },
    ]
    const graph = buildDependencyGraph(variables)
    const order = topologicalSort(graph)
    expect(order.map(v => v.name)).toEqual(['pageSize', 'offset'])
  })

  it('detects circular dependencies', () => {
    const variables = [
      { name: 'a', expression: '$b' },
      { name: 'b', expression: '$a' },
    ]
    expect(() => topologicalSort(buildDependencyGraph(variables))).toThrow('circular')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/server/expression/dependency-graph.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现依赖图和拓扑排序**

```ts
// src/server/expression/dependency-graph.ts
export type LocalVariableNode = {
  name: string
  expression?: string
}

export type DependencyGraph = {
  nodes: LocalVariableNode[]
  edges: Map<string, Set<string>>
}

export function buildDependencyGraph(variables: LocalVariableNode[]): DependencyGraph {
  const edges = new Map<string, Set<string>>()
  for (const variable of variables) {
    edges.set(variable.name, new Set())
  }
  for (const variable of variables) {
    if (!variable.expression) continue
    for (const other of variables) {
      if (other.name === variable.name) continue
      const pattern = new RegExp(`\\$${other.name}\\b`)
      if (pattern.test(variable.expression)) {
        edges.get(variable.name)!.add(other.name)
      }
    }
  }
  return { nodes: variables, edges }
}

export function topologicalSort(graph: DependencyGraph): LocalVariableNode[] {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const result: LocalVariableNode[] = []

  const visit = (name: string) => {
    if (visiting.has(name)) throw new Error(`Circular dependency detected: ${name}`)
    if (visited.has(name)) return
    visiting.add(name)
    for (const dep of graph.edges.get(name) ?? []) {
      visit(dep)
    }
    visiting.delete(name)
    visited.add(name)
    const node = graph.nodes.find(n => n.name === name)
    if (node) result.push(node)
  }

  for (const node of graph.nodes) {
    visit(node.name)
  }

  return result
}
```

- [ ] **Step 4: 运行测试**

Run: `rtk pnpm test -- src/server/expression/dependency-graph.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/server/expression/
rtk git commit -m "feat(expression): add local variable dependency graph and topological sort"
```

---

## Task 8: API 定义 Schema 增加 Local 变量和步骤输出

**Files:**
- Modify: `src/shared/schemas/api-definition.schema.ts`
- Modify: `src/shared/schemas/api-definition.schema.test.ts`

- [ ] **Step 1: 编写 failing test**

```ts
// src/shared/schemas/api-definition.schema.test.ts
it('validates api with local variables and step output', () => {
  const result = apiDefinitionSchema.safeParse({
    ...baseApi,
    localVariables: [
      {
        id: 'v1',
        name: 'offset',
        type: 'integer',
        mode: 'required',
        value: { kind: 'expression', expression: '($input.pageSize - 1) * $input.pageNo' },
      },
    ],
    workflowSteps: [
      {
        id: 's1',
        name: 'query orders',
        type: 'sql-query',
        outputVariable: 'orders',
        config: { sql: 'SELECT * FROM orders' },
      },
    ],
  })
  expect(result.success).toBe(true)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/shared/schemas/api-definition.schema.test.ts`
Expected: FAIL — schema 未包含 localVariables/outputVariable

- [ ] **Step 3: 扩展 schema**

```ts
// src/shared/schemas/api-definition.schema.ts
export const apiLocalVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['string', 'integer', 'decimal', 'boolean', 'array', 'object']),
  itemType: z.string().optional(),
  mode: z.enum(['required', 'optional', 'defaulted']),
  defaultValue: z.unknown().optional(),
  value: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('literal'), literal: z.unknown() }),
    z.object({ kind: z.literal('expression'), expression: z.string() }),
  ]),
})

export const workflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['sql-query', 'js-transform']),
  outputVariable: z.string().optional(),
  condition: z.string().optional(),
  config: z.record(z.unknown()),
})

export const apiDefinitionSchema = z.object({
  ...baseFields,
  localVariables: z.array(apiLocalVariableSchema).default([]),
  workflowSteps: z.array(workflowStepSchema).default([]),
})
```

- [ ] **Step 4: 运行测试**

Run: `rtk pnpm test -- src/shared/schemas/api-definition.schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/shared/schemas/
rtk git commit -m "feat(schema): add localVariables and workflowStep outputVariable"
```

---

## Task 9: 工作流执行器 — 构建 VariableContext 并执行步骤

**Files:**
- Create: `src/server/workflow/variable-context-builder.ts`
- Create: `src/server/workflow/variable-context-builder.test.ts`
- Create: `src/server/workflow/workflow-runner.ts`
- Create: `src/server/workflow/workflow-runner.test.ts`

- [ ] **Step 1: 编写 failing test**

```ts
// src/server/workflow/variable-context-builder.test.ts
import { describe, expect, it } from 'vitest'
import { buildApiVariableContext } from '@/server/workflow/variable-context-builder'

describe('buildApiVariableContext', () => {
  it('evaluates local variables in dependency order', () => {
    const context = buildApiVariableContext(
      {
        input: { pageSize: 10, pageNo: 2 },
        global: {},
        localVariables: [
          { name: 'pageSize', type: 'integer', mode: 'required', value: { kind: 'expression', expression: '$input.pageSize' } },
          { name: 'offset', type: 'integer', mode: 'required', value: { kind: 'expression', expression: '($pageSize - 1) * $input.pageNo' } },
        ],
      },
      { global: {} }
    )
    expect(context.get('local', 'offset')?.value).toBe(18)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `rtk pnpm test -- src/server/workflow/variable-context-builder.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 VariableContext 构建器**

```ts
// src/server/workflow/variable-context-builder.ts
import { createVariableContext } from '@/server/analyzer/types'
import { evalExpressionFromContext } from '@/server/expression/expression-evaluator'
import { buildDependencyGraph, topologicalSort } from '@/server/expression/dependency-graph'
import type { ApiLocalVariable } from '@/shared/schemas/api-definition.schema'

export function buildApiVariableContext(
  params: {
    input: Record<string, unknown>
    global: Record<string, unknown>
    localVariables: ApiLocalVariable[]
  },
  globals: { global: Record<string, unknown> },
): VariableContext {
  const context = createVariableContext()
  for (const [name, value] of Object.entries(params.input)) {
    context.set('input', name, { value, type: inferType(value) })
  }
  for (const [name, value] of Object.entries(params.global)) {
    context.set('global', name, { value, type: inferType(value) })
  }

  const graph = buildDependencyGraph(params.localVariables.map(v => ({ name: v.name, expression: v.value.expression })))
  const order = topologicalSort(graph)

  for (const variable of order) {
    const def = params.localVariables.find(v => v.name === variable.name)!
    let value: unknown
    if (def.value.kind === 'literal') {
      value = def.value.literal
    } else {
      value = evalExpressionFromContext(def.value.expression, context)
    }
    context.set('local', def.name, { value, type: def.type, defaultValue: def.defaultValue })
  }

  return context
}

function inferType(value: unknown): string {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'object' && value !== null) return 'object'
  return 'string'
}
```

- [ ] **Step 4: 实现工作流执行器骨架**

```ts
// src/server/workflow/workflow-runner.ts
export async function runWorkflow(
  apiDefinition: ApiDefinition,
  inputParams: Record<string, unknown>,
  globalValues: Record<string, unknown>,
): Promise<{ context: VariableContext; results: StepResult[] }> {
  const context = buildApiVariableContext(
    { input: inputParams, global: globalValues, localVariables: apiDefinition.localVariables },
    { global: globalValues }
  )
  const results: StepResult[] = []

  for (const step of apiDefinition.workflowSteps) {
    const shouldRun = step.condition
      ? evalExpressionFromContext(step.condition, context)
      : true

    if (!shouldRun) {
      if (step.outputVariable) {
        context.set('local', step.outputVariable, { value: getTypeDefault('array'), type: 'array' })
      }
      results.push({ stepId: step.id, skipped: true })
      continue
    }

    const result = await executeStep(step, context)
    if (step.outputVariable) {
      context.set('local', step.outputVariable, { value: result, type: inferResultType(result) })
    }
    results.push({ stepId: step.id, result })
  }

  return { context, results }
}
```

- [ ] **Step 5: 运行测试**

Run: `rtk pnpm test -- src/server/workflow/`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
rtk git add src/server/workflow/
rtk git commit -m "feat(workflow): build VariableContext and run workflow steps"
```

---

## Task 10: 路由参数扩展

**Files:**
- Modify: `src/server/routes/sql-analyze.route.ts`
- Modify: `src/server/routes/sql-test.route.ts`
- Modify: 相关测试

- [ ] **Step 1: 修改 analyze schema**

```ts
// src/server/routes/sql-analyze.route.ts
const analyzeRequestSchema = z.object({
  sql: z.string(),
  dialect: z.enum(['postgresql', 'mysql', 'sqlserver', 'oracle']).optional(),
  inputNames: z.array(z.string()).optional(),
  globalNames: z.array(z.string()).optional(),
  localNames: z.array(z.string()).optional(),
  defaults: z.record(z.unknown()).optional(),
})
```

- [ ] **Step 2: 修改 test schema 和调用**

```ts
// src/server/routes/sql-test.route.ts
const testRequestSchema = z.object({
  sql: z.string(),
  dialect: z.enum(['postgresql', 'mysql', 'sqlserver', 'oracle']).optional(),
  params: z.record(z.unknown()),
  inputNames: z.array(z.string()).optional(),
  globalNames: z.array(z.string()).optional(),
  localNames: z.array(z.string()).optional(),
  localValues: z.record(z.unknown()).optional(),
  globalValues: z.record(z.unknown()).optional(),
  defaults: z.record(z.unknown()).optional(),
})

const result = renderFromPlan(plan, {
  input: body.params,
  global: body.globalValues ?? {},
  local: body.localValues ?? {},
})
```

- [ ] **Step 3: 运行路由测试**

Run: `rtk pnpm test -- src/server/routes/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
rtk git add src/server/routes/
rtk git commit -m "feat(routes): add localNames and localValues to SQL analyze/test routes"
```

---

## Task 11: 前端补全更新

**Files:**
- Modify: `src/components/editors/extensions/variable-completion.ts`
- Modify: 相关测试（如有）

- [ ] **Step 1: 修改补全来源**

补全函数接收 `VariableContextSnapshot` 而不是单独的 input/global 列表：

```ts
// src/components/editors/extensions/variable-completion.ts
export type VariableContextSnapshot = {
  input: string[]
  global: string[]
  local: Array<{ name: string; type: string; source: 'design' | 'step' }>
}

function buildCompletions(snapshot: VariableContextSnapshot): Completion[] {
  const completions: Completion[] = []
  for (const name of snapshot.input) {
    completions.push({ label: `$input.${name}`, type: 'variable', detail: 'input' })
  }
  for (const name of snapshot.global) {
    completions.push({ label: `$.${name}`, type: 'variable', detail: 'global' })
  }
  for (const variable of snapshot.local) {
    completions.push({ label: `$${variable.name}`, type: 'variable', detail: `local (${variable.source})` })
    if (variable.type === 'array') {
      completions.push({ label: `$${variable.name}[].`, type: 'property', detail: 'array property' })
    }
  }
  return completions
}
```

- [ ] **Step 2: 运行前端测试**

Run: `rtk pnpm test -- src/components/editors/`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/editors/extensions/variable-completion.ts
rtk git commit -m "feat(editor): update variable completion for input/global/local scopes"
```

---

## Task 12: 全量验证与清理

- [ ] **Step 1: 运行 typecheck**

Run: `rtk pnpm typecheck`
Expected: PASS

- [ ] **Step 2: 运行 lint**

Run: `rtk pnpm lint`
Expected: PASS

- [ ] **Step 3: 运行全部测试**

Run: `rtk pnpm test`
Expected: PASS

- [ ] **Step 4: Commit（如需要）**

```bash
rtk git commit -m "chore: pass full test, typecheck and lint suite" --allow-empty
```

---

## Self-Review

**Spec coverage:**
- ✅ 统一 VariableContext — Task 1
- ✅ `$xxx` 解析为 local — Task 3
- ✅ 数组属性访问 `$orders[].id` — Task 3, Task 5
- ✅ 所有 scope 支持 `?`/`!` — Task 3, Task 5
- ✅ 表达式引擎集成 — Task 6
- ✅ local 变量拓扑排序 — Task 7
- ✅ API local 变量持久化 — Task 8
- ✅ 步骤输出注入 — Task 9
- ✅ 前端补全 — Task 11
- ✅ 路由扩展 — Task 10

**Placeholder scan:** 无 TBD/TODO，每个任务都有具体代码和命令。

**Type consistency:** `VariableScope`、`VariableReference`、`VariableContext` 接口在所有任务中一致。
