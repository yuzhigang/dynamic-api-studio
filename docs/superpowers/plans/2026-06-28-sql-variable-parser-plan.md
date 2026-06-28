# SQL 变量解析器实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现基于 `node-sql-parser` AST 的 SQL 变量解析器，支持 `$input.xxx` 和 `$.xxx` 两种变量来源、三种后缀模式、`LIKE` 模式、`IN` 数组、可选条件裁剪、编译期 `CompiledSqlPlan` 生成和运行期轻量渲染，并同步更新前端符号表、补全和诊断。

**Architecture:** 后端 `EnhancedSqlAnalyzer` 负责编译期解析，产出 `CompiledSqlPlan`；`renderFromPlan` 在 API 调用时基于 Plan 轻量渲染，输出安全 SQL 与参数列表。前端 `buildSymbolStore` 改为生成 `$input` / `$` / `$stepName` 命名空间符号，CodeMirror 6 补全和诊断适配新的 `$.varName` 风格。执行分为后端核心、后端渲染、前端适配、集成测试四个阶段。

**Tech Stack:** TypeScript, `node-sql-parser`, Knex, Hono, CodeMirror 6, Vitest

---

## 文件结构

### 后端新建/修改

| 文件 | 职责 |
|------|------|
| `src/server/analyzer/parser-wrapper.ts` | 封装 `node-sql-parser`，方言映射，AST 解析与 stringiy |
| `src/server/analyzer/variable-extractor.ts` | 从 SQL 文本提取 `$input.xxx`、`$.xxx` 变量引用 |
| `src/server/analyzer/ast-variable-locator.ts` | 在 AST 中定位变量节点，生成 `astPath` |
| `src/server/analyzer/condition-cutter.ts` | 识别 `$var?` 所在的最小逻辑条件项，生成 `optionalConditions` |
| `src/server/analyzer/alias-resolver.ts` | 解析表别名映射 |
| `src/server/analyzer/validator.ts` | 校验变量命名空间、后缀合法性、变量定义存在性 |
| `src/server/analyzer/index.ts` | `EnhancedSqlAnalyzer.analyze()` 组装完整 `CompiledSqlPlan` |
| `src/server/analyzer/render-from-plan.ts` | 运行期渲染器：裁剪、默认值、参数收集、stringify |
| `src/server/analyzer/types.ts` | `CompiledSqlPlan`、`VariableRef`、`OptionalConditionIndex` 等类型 |
| `src/server/domains/api-test/api-test.service.ts` | 调用解析器执行真实 SQL 步骤 |
| `src/server/routes/sql-test.route.ts` | 新增 `/api/sql/test` 路由 |

### 前端新建/修改

| 文件 | 职责 |
|------|------|
| `src/components/editors/build-symbol-store.ts` | 生成 `$input`、`$`、`$stepName` 符号 |
| `src/components/editors/extensions/variable-completion.ts` | 适配 `$.` 补全 |
| `src/components/editors/extensions/variable-linter.ts` | 适配 `$.` 诊断 |
| `src/components/editors/extensions/variable-tooltip.ts` | 适配 `$.` 悬停提示 |

### 测试

| 文件 | 职责 |
|------|------|
| `src/server/analyzer/variable-extractor.test.ts` | 变量提取单元测试 |
| `src/server/analyzer/condition-cutter.test.ts` | 条件裁剪索引单元测试 |
| `src/server/analyzer/render-from-plan.test.ts` | 运行期渲染单元测试 |
| `src/components/editors/build-symbol-store.test.ts` | 符号表生成单元测试 |

---

## Task 1: 定义解析器类型

**Files:**
- Create: `src/server/analyzer/types.ts`
- Modify: `src/server/analyzer/index.ts`
- Test: `src/server/analyzer/types.test.ts`（可选类型检查，不创建空测试文件）

- [ ] **Step 1: 写入类型定义**

```ts
// src/server/analyzer/types.ts

export type SqlDialect = 'postgresql' | 'mysql' | 'oracle' | 'sqlserver'

export type VariableSource = 'input' | 'global'

export type VariableMode = 'required' | 'optional' | 'defaulted'

export type SqlKind = 'value' | 'field' | 'keyword' | 'like-pattern'

export type VariableRef = {
  raw: string
  namespace: VariableSource
  name: string
  fullPath: string
  mode: VariableMode
  sqlKind: SqlKind
  dataType: string
  itemType?: string
  astPath: string[]
  xSqlMap?: string
}

export type OptionalConditionIndex = {
  variablePath: string
  astPath: string[]
  conditionType: 'and-condition' | 'or-block' | 'between-expr'
  siblingVariablePath?: string
}

export type StaticDiagnostic = {
  from: number
  to: number
  severity: 'error' | 'warning'
  message: string
}

export type StepReference = {
  stepName: string
  variablePath: string
}

export type VariableInfo = {
  namespace: VariableSource
  name: string
  dataType: string
  defaultValue?: unknown
}

export type CompiledSqlPlan = {
  sourceHash: string
  schemaHash: string
  dialect: SqlDialect
  processedSql: string
  varMap: Record<string, VariableInfo>
  ast: unknown
  variableRefs: VariableRef[]
  aliasMap: Record<string, string>
  optionalConditions: OptionalConditionIndex[]
  staticDiagnostics: StaticDiagnostic[]
  references: StepReference[]
}

export type RenderResult = {
  sql: string
  params: Array<{ value: unknown; type: string }>
}
```

- [ ] **Step 2: 修改 index.ts 导出类型**

```ts
// src/server/analyzer/index.ts

export { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'
export type { CompiledSqlPlan, VariableRef, RenderResult } from '@/server/analyzer/types'
```

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/analyzer/types.ts src/server/analyzer/index.ts
git commit -m "feat(analyzer): add SQL analyzer type definitions"
```

---

## Task 2: 变量提取器支持两种命名空间

**Files:**
- Modify: `src/server/analyzer/variable-extractor.ts`
- Test: `src/server/analyzer/variable-extractor.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/server/analyzer/variable-extractor.test.ts

import { describe, expect, it } from 'vitest'
import { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'

describe('extractVariablesFromSql', () => {
  it('extracts input variables', () => {
    const result = extractVariablesFromSql('SELECT * FROM t WHERE id = $input.id')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      raw: '$input.id',
      namespace: 'input',
      name: 'id',
      fullPath: '$input.id',
      mode: 'required',
    })
  })

  it('extracts global variables with dot prefix', () => {
    const result = extractVariablesFromSql('SELECT * FROM t WHERE region = $.region')
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      raw: '$.region',
      namespace: 'global',
      name: 'region',
      fullPath: '$.region',
      mode: 'required',
    })
  })

  it('detects optional and defaulted modes', () => {
    const result = extractVariablesFromSql('WHERE a = $input.a? AND b = $.b!')
    expect(result).toEqual([
      expect.objectContaining({ raw: '$input.a?', mode: 'optional' }),
      expect.objectContaining({ raw: '$.b!', mode: 'defaulted' }),
    ])
  })

  it('rejects function calls in SQL', () => {
    const result = extractVariablesFromSql('WHERE x = $.getMin(1, 2)')
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/server/analyzer/variable-extractor.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现变量提取器**

```ts
// src/server/analyzer/variable-extractor.ts

import type { VariableMode, VariableRef, VariableSource } from '@/server/analyzer/types'

const VARIABLE_PATTERN = /\$(input|\.)([a-zA-Z_][\w.]*)([?!])?/g

function resolveNamespace(prefix: string): VariableSource {
  return prefix === 'input' ? 'input' : 'global'
}

function resolveMode(suffix: string | undefined): VariableMode {
  if (suffix === '?') return 'optional'
  if (suffix === '!') return 'defaulted'
  return 'required'
}

export function extractVariablesFromSql(sql: string): VariableRef[] {
  const refs: VariableRef[] = []

  for (const match of sql.matchAll(VARIABLE_PATTERN)) {
    const raw = match[0]
    const prefix = match[1]
    const path = match[2]
    const suffix = match[3]

    if (raw.includes('(') || raw.includes(')')) {
      continue
    }

    const namespace = resolveNamespace(prefix)
    const fullPath = `$${prefix}${path}`

    refs.push({
      raw,
      namespace,
      name: path,
      fullPath,
      mode: resolveMode(suffix),
      sqlKind: 'value',
      dataType: 'string',
      astPath: [],
    })
  }

  return refs
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/server/analyzer/variable-extractor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/variable-extractor.ts src/server/analyzer/variable-extractor.test.ts
git commit -m "feat(analyzer): support $input and $. variable extraction"
```

---

## Task 3: 解析器方言映射

**Files:**
- Modify: `src/server/analyzer/parser-wrapper.ts`
- Test: `src/server/analyzer/parser-wrapper.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/server/analyzer/parser-wrapper.test.ts

import { describe, expect, it } from 'vitest'
import { parseSql, stringifyAst, toParserDialect } from '@/server/analyzer/parser-wrapper'

describe('parser-wrapper', () => {
  it('parses postgresql SQL', () => {
    const ast = parseSql('SELECT * FROM users WHERE id = 1', 'postgresql')
    expect(ast).toBeDefined()
    expect(ast.type).toBe('select')
  })

  it('maps dialect names to parser dialect', () => {
    expect(toParserDialect('postgresql')).toBe('Postgresql')
    expect(toParserDialect('mysql')).toBe('MySQL')
    expect(toParserDialect('sqlserver')).toBe('TransactSQL')
    expect(toParserDialect('oracle')).toBe('Oracle')
  })

  it('stringifies AST back to SQL', () => {
    const sql = 'SELECT * FROM users WHERE id = 1'
    const ast = parseSql(sql, 'postgresql')
    expect(stringifyAst(ast, 'postgresql').toLowerCase()).toContain('select')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/server/analyzer/parser-wrapper.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现解析器封装**

```ts
// src/server/analyzer/parser-wrapper.ts

import { Parser } from 'node-sql-parser'

import type { SqlDialect } from '@/server/analyzer/types'

const parser = new Parser()

const dialectMap: Record<SqlDialect, string> = {
  postgresql: 'Postgresql',
  mysql: 'MySQL',
  oracle: 'Oracle',
  sqlserver: 'TransactSQL',
}

export function toParserDialect(dialect: SqlDialect): string {
  return dialectMap[dialect] ?? 'Postgresql'
}

export function parseSql(sql: string, dialect: SqlDialect) {
  return parser.astify(sql, { database: toParserDialect(dialect) })
}

export function stringifyAst(ast: unknown, dialect: SqlDialect): string {
  return parser.sqlify(ast as Parameters<typeof parser.sqlify>[0], { database: toParserDialect(dialect) })
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/server/analyzer/parser-wrapper.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/parser-wrapper.ts src/server/analyzer/parser-wrapper.test.ts
git commit -m "feat(analyzer): add node-sql-parser wrapper with dialect mapping"
```

---

## Task 4: AST 变量定位器

**Files:**
- Create: `src/server/analyzer/ast-variable-locator.ts`
- Test: `src/server/analyzer/ast-variable-locator.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/server/analyzer/ast-variable-locator.test.ts

import { describe, expect, it } from 'vitest'
import { parseSql } from '@/server/analyzer/parser-wrapper'
import { locateVariablesInAst } from '@/server/analyzer/ast-variable-locator'

describe('locateVariablesInAst', () => {
  it('finds variable positions in simple WHERE', () => {
    const sql = 'SELECT * FROM users WHERE id = $input.id AND name = $.name'
    const ast = parseSql(sql, 'postgresql')
    const locations = locateVariablesInAst(ast)

    expect(locations).toHaveLength(2)
    expect(locations[0]).toMatchObject({ raw: '$input.id', astPath: expect.any(Array) })
    expect(locations[1]).toMatchObject({ raw: '$.name', astPath: expect.any(Array) })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/server/analyzer/ast-variable-locator.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现定位器**

```ts
// src/server/analyzer/ast-variable-locator.ts

import type { VariableRef } from '@/server/analyzer/types'

export type AstVariableLocation = {
  raw: string
  astPath: string[]
}

const VARIABLE_PATTERN = /\$(input|\.)([a-zA-Z_][\w.]*)([?!])?/

export function locateVariablesInAst(ast: unknown): AstVariableLocation[] {
  const locations: AstVariableLocation[] = []

  function walk(node: unknown, path: string[]) {
    if (node === null || node === undefined || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, String(index)]))
      return
    }

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string' && VARIABLE_PATTERN.test(value)) {
        const match = value.match(VARIABLE_PATTERN)
        if (match) {
          locations.push({
            raw: match[0],
            astPath: [...path, key],
          })
        }
      } else if (typeof value === 'object') {
        walk(value, [...path, key])
      }
    }
  }

  walk(ast, [])
  return locations
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/server/analyzer/ast-variable-locator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/ast-variable-locator.ts src/server/analyzer/ast-variable-locator.test.ts
git commit -m "feat(analyzer): locate variable references in AST"
```

---

## Task 5: 可选条件裁剪索引

**Files:**
- Modify: `src/server/analyzer/condition-cutter.ts`
- Test: `src/server/analyzer/condition-cutter.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/server/analyzer/condition-cutter.test.ts

import { describe, expect, it } from 'vitest'
import { parseSql } from '@/server/analyzer/parser-wrapper'
import { buildOptionalConditionIndex } from '@/server/analyzer/condition-cutter'

describe('buildOptionalConditionIndex', () => {
  it('indexes optional AND conditions', () => {
    const sql = 'SELECT * FROM users WHERE 1 = 1 AND status = $input.status?'
    const ast = parseSql(sql, 'postgresql')
    const index = buildOptionalConditionIndex(ast)

    expect(index).toHaveLength(1)
    expect(index[0]).toMatchObject({
      variablePath: '$input.status?',
      conditionType: 'and-condition',
    })
  })

  it('indexes BETWEEN optional conditions', () => {
    const sql = 'SELECT * FROM users WHERE created_at BETWEEN $input.start? AND $input.end?'
    const ast = parseSql(sql, 'postgresql')
    const index = buildOptionalConditionIndex(ast)

    expect(index).toHaveLength(1)
    expect(index[0]).toMatchObject({
      conditionType: 'between-expr',
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/server/analyzer/condition-cutter.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现裁剪索引**

```ts
// src/server/analyzer/condition-cutter.ts

import type { OptionalConditionIndex } from '@/server/analyzer/types'

const OPTIONAL_VARIABLE = /\$(input|\.)([a-zA-Z_][\w.]*)\?/

export function buildOptionalConditionIndex(ast: unknown): OptionalConditionIndex[] {
  const conditions: OptionalConditionIndex[] = []

  function walk(node: unknown, path: string[]) {
    if (node === null || node === undefined || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, [...path, String(index)]))
      return
    }

    const entries = Object.entries(node)

    if (node.type === 'binary_expr' && (node.operator === 'AND' || node.operator === 'OR')) {
      const optionalMatches = collectOptionalVariables(node)
      if (optionalMatches.length > 0) {
        conditions.push({
          variablePath: optionalMatches[0],
          astPath: path,
          conditionType: node.operator === 'OR' ? 'or-block' : 'and-condition',
          siblingVariablePath: optionalMatches[1],
        })
      }
    }

    if (node.type === 'binary_expr' && node.operator === 'BETWEEN') {
      const optionalMatches = collectOptionalVariables(node)
      if (optionalMatches.length > 0) {
        conditions.push({
          variablePath: optionalMatches[0],
          astPath: path,
          conditionType: 'between-expr',
          siblingVariablePath: optionalMatches[1],
        })
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'object') {
        walk(value, [...path, key])
      }
    }
  }

  walk(ast, [])
  return conditions
}

function collectOptionalVariables(node: unknown): string[] {
  const matches: string[] = []

  function collect(value: unknown) {
    if (typeof value === 'string') {
      const match = value.match(OPTIONAL_VARIABLE)
      if (match) {
        matches.push(match[0])
      }
    } else if (Array.isArray(value)) {
      value.forEach(collect)
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(collect)
    }
  }

  collect(node)
  return matches
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/server/analyzer/condition-cutter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/condition-cutter.ts src/server/analyzer/condition-cutter.test.ts
git commit -m "feat(analyzer): build optional condition index from AST"
```

---

## Task 6: 变量校验器

**Files:**
- Modify: `src/server/analyzer/validator.ts`
- Test: `src/server/analyzer/validator.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/server/analyzer/validator.test.ts

import { describe, expect, it } from 'vitest'
import { validateVariableReferences } from '@/server/analyzer/validator'
import type { VariableRef } from '@/server/analyzer/types'

describe('validateVariableReferences', () => {
  it('reports unknown global variables', () => {
    const refs: VariableRef[] = [
      { raw: '$.unknown', namespace: 'global', name: 'unknown', fullPath: '$.unknown', mode: 'required', sqlKind: 'value', dataType: 'string', astPath: [] },
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['known'] })
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].message).toContain('unknown')
  })

  it('reports missing default for defaulted mode', () => {
    const refs: VariableRef[] = [
      { raw: '$.pageSize!', namespace: 'global', name: 'pageSize', fullPath: '$.pageSize', mode: 'defaulted', sqlKind: 'value', dataType: 'integer', astPath: [] },
    ]
    const diagnostics = validateVariableReferences(refs, { inputNames: [], globalNames: ['pageSize'], defaults: {} })
    expect(diagnostics[0].message).toContain('默认值')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/server/analyzer/validator.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现校验器**

```ts
// src/server/analyzer/validator.ts

import type { StaticDiagnostic, VariableRef } from '@/server/analyzer/types'

export type ValidationContext = {
  inputNames: string[]
  globalNames: string[]
  defaults?: Record<string, unknown>
}

export function validateVariableReferences(
  variables: VariableRef[],
  context: ValidationContext,
): StaticDiagnostic[] {
  const diagnostics: StaticDiagnostic[] = []

  for (const variable of variables) {
    if (variable.raw.includes('(') || variable.raw.includes(')')) {
      diagnostics.push({
        from: 0,
        to: variable.raw.length,
        severity: 'error',
        message: `SQL 中不支持函数调用：${variable.raw}`,
      })
      continue
    }

    if (variable.namespace === 'input' && !context.inputNames.includes(variable.name)) {
      diagnostics.push({
        from: 0,
        to: variable.raw.length,
        severity: 'error',
        message: `输入参数 ${variable.name} 未定义`,
      })
    }

    if (variable.namespace === 'global' && !context.globalNames.includes(variable.name)) {
      diagnostics.push({
        from: 0,
        to: variable.raw.length,
        severity: 'error',
        message: `全局/项目变量 ${variable.name} 未定义`,
      })
    }

    if (variable.mode === 'defaulted' && !context.defaults?.[variable.name]) {
      diagnostics.push({
        from: 0,
        to: variable.raw.length,
        severity: 'error',
        message: `默认变量 ${variable.name} 缺少默认值`,
      })
    }
  }

  return diagnostics
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/server/analyzer/validator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/validator.ts src/server/analyzer/validator.test.ts
git commit -m "feat(analyzer): validate variable references against definitions"
```

---

## Task 7: 组装 EnhancedSqlAnalyzer

**Files:**
- Modify: `src/server/analyzer/index.ts`
- Test: `src/server/analyzer/index.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/server/analyzer/index.test.ts

import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'

const analyzer = new EnhancedSqlAnalyzer()

describe('EnhancedSqlAnalyzer', () => {
  it('analyzes SQL with input and global variables', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id AND region = $.region',
      dialect: 'postgresql',
    })

    expect(result.dialect).toBe('postgresql')
    expect(result.variableRefs).toHaveLength(2)
    expect(result.variableRefs.map((ref) => ref.fullPath)).toContain('$input.id')
    expect(result.variableRefs.map((ref) => ref.fullPath)).toContain('$.region')
    expect(result.optionalConditions).toHaveLength(0)
  })

  it('generates optional condition index', () => {
    const result = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE status = $input.status?',
      dialect: 'postgresql',
    })

    expect(result.optionalConditions).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/server/analyzer/index.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 analyzer**

```ts
// src/server/analyzer/index.ts

import { createHash } from 'node:crypto'

import { parseSql } from '@/server/analyzer/parser-wrapper'
import { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'
import { locateVariablesInAst } from '@/server/analyzer/ast-variable-locator'
import { buildOptionalConditionIndex } from '@/server/analyzer/condition-cutter'
import { validateVariableReferences } from '@/server/analyzer/validator'
import { resolveTableAliases } from '@/server/analyzer/alias-resolver'
import type { AnalyzeInput } from '@/server/analyzer/index'
import type { CompiledSqlPlan, VariableRef } from '@/server/analyzer/types'

type AnalyzeInput = {
  sql: string
  dialect?: string
}

export class EnhancedSqlAnalyzer {
  analyze(input: AnalyzeInput): CompiledSqlPlan {
    const dialect = (input.dialect ?? 'postgresql') as CompiledSqlPlan['dialect']
    const sql = input.sql
    const ast = parseSql(sql, dialect)

    const extracted = extractVariablesFromSql(sql)
    const locations = locateVariablesInAst(ast)

    const variableRefs: VariableRef[] = extracted.map((ref) => {
      const location = locations.find((loc) => loc.raw === ref.raw)
      return {
        ...ref,
        astPath: location?.astPath ?? [],
      }
    })

    const optionalConditions = buildOptionalConditionIndex(ast)

    const diagnostics = validateVariableReferences(variableRefs, {
      inputNames: [],
      globalNames: [],
      defaults: {},
    })

    return {
      sourceHash: createHash('sha256').update(sql).digest('hex'),
      schemaHash: '',
      dialect,
      processedSql: sql.replace(/\$(input|\.)([a-zA-Z_][\w.]*)([?!])?/g, '?'),
      varMap: {},
      ast,
      variableRefs,
      aliasMap: resolveTableAliases(),
      optionalConditions,
      staticDiagnostics: diagnostics,
      references: [],
    }
  }
}

export { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'
export type { CompiledSqlPlan, VariableRef, RenderResult } from '@/server/analyzer/types'
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/server/analyzer/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/index.ts src/server/analyzer/index.test.ts
git commit -m "feat(analyzer): assemble EnhancedSqlAnalyzer"
```

---

## Task 8: 运行期渲染器

**Files:**
- Create: `src/server/analyzer/render-from-plan.ts`
- Test: `src/server/analyzer/render-from-plan.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/server/analyzer/render-from-plan.test.ts

import { describe, expect, it } from 'vitest'
import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'

const analyzer = new EnhancedSqlAnalyzer()

describe('renderFromPlan', () => {
  it('renders required variables', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE id = $input.id',
      dialect: 'postgresql',
    })
    const result = renderFromPlan(plan, { input: { id: 42 }, global: {} })

    expect(result.sql.toLowerCase()).toContain('where')
    expect(result.params).toHaveLength(1)
    expect(result.params[0].value).toBe(42)
  })

  it('removes optional condition when variable is empty', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users WHERE 1 = 1 AND status = $input.status?',
      dialect: 'postgresql',
    })
    const result = renderFromPlan(plan, { input: {}, global: {} })

    expect(result.sql.toLowerCase()).not.toContain('status')
  })

  it('uses default value for defaulted variable', () => {
    const plan = analyzer.analyze({
      sql: 'SELECT * FROM users LIMIT $input.pageSize!',
      dialect: 'postgresql',
    })
    const result = renderFromPlan(plan, { input: {}, global: {} })

    expect(result.params[0].value).toBe(10)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/server/analyzer/render-from-plan.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现渲染器**

```ts
// src/server/analyzer/render-from-plan.ts

import { parseSql, stringifyAst } from '@/server/analyzer/parser-wrapper'
import type { CompiledSqlPlan, RenderResult, VariableRef } from '@/server/analyzer/types'

export function renderFromPlan(
  plan: CompiledSqlPlan,
  actualParams: { input: Record<string, unknown>; global: Record<string, unknown> },
): RenderResult {
  const ast = structuredClone(plan.ast as object)
  const params: RenderResult['params'] = []

  for (const condition of plan.optionalConditions) {
    const value = resolveVariableValue(condition.variablePath, plan, actualParams)

    if (condition.conditionType === 'between-expr') {
      const siblingValue = condition.siblingVariablePath
        ? resolveVariableValue(condition.siblingVariablePath, plan, actualParams)
        : undefined
      if (isEmpty(value) || isEmpty(siblingValue)) {
        removeNodeAtPath(ast, condition.astPath)
      }
    } else if (isEmpty(value)) {
      removeNodeAtPath(ast, condition.astPath)
    }
  }

  cleanupAst(ast)

  for (const ref of plan.variableRefs) {
    const value = resolveVariableValue(ref.fullPath + (ref.mode === 'optional' ? '?' : ref.mode === 'defaulted' ? '!' : ''), plan, actualParams)
      ?? resolveVariableValue(ref.fullPath, plan, actualParams)

    if (ref.mode !== 'optional' && isEmpty(value)) {
      throw new Error(`变量 ${ref.fullPath} 没有值`)
    }

    const resolved = ref.mode === 'defaulted' && isEmpty(value) ? getDefaultValue(ref, plan) : value

    if (ref.sqlKind === 'value' && !isEmpty(resolved)) {
      if (ref.dataType === 'array' && Array.isArray(resolved)) {
        for (const item of resolved) {
          params.push({ value: item, type: ref.itemType ?? 'string' })
        }
      } else {
        params.push({ value: resolved, type: ref.dataType })
      }
    }
  }

  const sql = stringifyAst(ast, plan.dialect)
  return { sql, params }
}

function resolveVariableValue(path: string, plan: CompiledSqlPlan, actualParams: { input: Record<string, unknown>; global: Record<string, unknown> }): unknown {
  const cleanPath = path.replace(/[?!]$/, '')
  const info = plan.varMap[cleanPath]

  if (!info) {
    return undefined
  }

  if (info.namespace === 'input') {
    return actualParams.input[info.name]
  }

  return actualParams.global[info.name]
}

function getDefaultValue(ref: VariableRef, plan: CompiledSqlPlan): unknown {
  const info = plan.varMap[ref.fullPath]
  return info?.defaultValue
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

function removeNodeAtPath(ast: object, path: string[]) {
  let current: unknown = ast
  for (let i = 0; i < path.length - 1; i++) {
    if (current === null || current === undefined) return
    current = (current as Record<string, unknown>)[path[i]]
  }

  const lastKey = path[path.length - 1]
  if (current === null || current === undefined) return

  if (Array.isArray(current)) {
    const index = Number(lastKey)
    if (!Number.isNaN(index)) {
      current.splice(index, 1)
    }
  } else {
    delete (current as Record<string, unknown>)[lastKey]
  }
}

function cleanupAst(ast: object) {
  // Minimal cleanup: remove empty WHERE objects if present
  const root = ast as Record<string, unknown>
  if (root.where && typeof root.where === 'object' && Object.keys(root.where).length === 0) {
    delete root.where
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/server/analyzer/render-from-plan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/analyzer/render-from-plan.ts src/server/analyzer/render-from-plan.test.ts
git commit -m "feat(analyzer): add runtime SQL renderer from CompiledSqlPlan"
```

---

## Task 9: 前端符号表适配

**Files:**
- Modify: `src/components/editors/build-symbol-store.ts`
- Test: `src/components/editors/build-symbol-store.test.ts`

- [ ] **Step 1: 写入失败测试**

```ts
// src/components/editors/build-symbol-store.test.ts

import { describe, expect, it } from 'vitest'
import { buildSymbolStore } from '@/components/editors/build-symbol-store'

const baseApi = {
  id: 'api',
  projectId: 'p1',
  status: 'draft' as const,
  name: 'api',
  path: '/api',
  method: 'GET' as const,
  tags: [],
  permissions: [],
  bodyContentType: 'json' as const,
  requestParams: [
    { id: 'p1', name: 'status', location: 'query' as const, type: 'string' as const, required: true },
  ],
  responseSchema: [],
  workflowSteps: [],
}

describe('buildSymbolStore', () => {
  it('builds input symbols', () => {
    const symbols = buildSymbolStore(baseApi)
    expect(symbols.some((s) => s.label === '$input.status')).toBe(true)
  })

  it('builds global symbols', () => {
    const symbols = buildSymbolStore(baseApi, undefined, [{ name: 'region', label: '区域', detail: '全局变量' }])
    expect(symbols.some((s) => s.label === '$.region')).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/components/editors/build-symbol-store.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现符号表**

```ts
// src/components/editors/build-symbol-store.ts

import type { ApiDefinitionDraft } from '@/shared/contracts/api-definition.contract'

export type SymbolSource = 'input' | 'global' | 'step'

export type SymbolItem = {
  label: string
  detail: string
  source: SymbolSource
}

export type GlobalSymbolInput = {
  name: string
  label: string
  detail?: string
}

export function buildSymbolStore(
  apiDefinition: ApiDefinitionDraft,
  currentStepId?: string,
  globalSymbols: GlobalSymbolInput[] = [],
): SymbolItem[] {
  const currentIndex = apiDefinition.workflowSteps.findIndex((step) => step.id === currentStepId)
  const visibleSteps =
    currentIndex >= 0 ? apiDefinition.workflowSteps.slice(0, currentIndex) : apiDefinition.workflowSteps

  return [
    ...apiDefinition.requestParams.map((param) => ({
      label: `$input.${param.name}`,
      detail: `${param.type} · ${param.description ?? '请求参数'}`,
      source: 'input' as const,
    })),
    ...visibleSteps.map((step) => ({
      label: `$${step.resultVariable}`,
      detail: `${step.title} · 上游步骤结果`,
      source: 'step' as const,
    })),
    ...globalSymbols.map((variable) => ({
      label: `$.${variable.name}`,
      detail: `${variable.label} · ${variable.detail ?? '全局/项目变量'}`,
      source: 'global' as const,
    })),
  ]
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/components/editors/build-symbol-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editors/build-symbol-store.ts src/components/editors/build-symbol-store.test.ts
git commit -m "feat(editor): adapt symbol store for $input and $. namespaces"
```

---

## Task 10: 前端变量补全/诊断/提示适配

**Files:**
- Modify: `src/components/editors/extensions/variable-completion.ts`
- Modify: `src/components/editors/extensions/variable-linter.ts`
- Modify: `src/components/editors/extensions/variable-tooltip.ts`

- [ ] **Step 1: 修改补全正则**

```ts
// src/components/editors/extensions/variable-completion.ts

const word = context.matchBefore(/\$[\w.?!]*/)
```

保持其余逻辑不变。

- [ ] **Step 2: 修改诊断正则**

```ts
// src/components/editors/extensions/variable-linter.ts

const pattern = /\$(input|\.)([a-zA-Z_][\w.]*)([?!])?/g
```

保持其余逻辑不变。

- [ ] **Step 3: 修改提示正则**

```ts
// src/components/editors/extensions/variable-tooltip.ts

const prefix = before.match(/\$[\w.?!]*$/)?.[0] ?? ''
```

保持其余逻辑不变。

- [ ] **Step 4: 运行前端测试确认通过**

Run: `pnpm test src/components/editors`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editors/extensions/variable-completion.ts src/components/editors/extensions/variable-linter.ts src/components/editors/extensions/variable-tooltip.ts
git commit -m "feat(editor): adapt variable completion, lint and tooltip for $. syntax"
```

---

## Task 11: 接入 SQL 分析接口

**Files:**
- Modify: `src/server/routes/sql-analyze.route.ts`
- Modify: `src/server/analyzer/index.ts`（传入 schema/变量上下文）

- [ ] **Step 1: 扩展 analyze 接口入参**

```ts
// src/server/routes/sql-analyze.route.ts

const analyzeRequestSchema = z.object({
  sql: z.string(),
  dialect: z.string().optional(),
  inputNames: z.array(z.string()).optional(),
  globalNames: z.array(z.string()).optional(),
  defaults: z.record(z.unknown()).optional(),
})
```

- [ ] **Step 2: 更新 analyzer.analyze 支持上下文**

```ts
// src/server/analyzer/index.ts

type AnalyzeInput = {
  sql: string
  dialect?: string
  inputNames?: string[]
  globalNames?: string[]
  defaults?: Record<string, unknown>
}

// inside analyze():
const diagnostics = validateVariableReferences(variableRefs, {
  inputNames: input.inputNames ?? [],
  globalNames: input.globalNames ?? [],
  defaults: input.defaults ?? {},
})
```

- [ ] **Step 3: 更新路由 handler**

```ts
// src/server/routes/sql-analyze.route.ts

(context) => context.json(analyzer.analyze(context.req.valid('json')))
```

- [ ] **Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/sql-analyze.route.ts src/server/analyzer/index.ts
git commit -m "feat(api): pass variable context into sql analyze endpoint"
```

---

## Task 12: 新增 SQL 测试执行接口

**Files:**
- Create: `src/server/routes/sql-test.route.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: 创建 sql-test 路由**

```ts
// src/server/routes/sql-test.route.ts

import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'

const testRequestSchema = z.object({
  sql: z.string(),
  dialect: z.string().optional(),
  params: z.record(z.unknown()),
  inputNames: z.array(z.string()).optional(),
  globalNames: z.array(z.string()).optional(),
  defaults: z.record(z.unknown()).optional(),
  globalValues: z.record(z.unknown()).optional(),
})

const analyzer = new EnhancedSqlAnalyzer()

export const sqlTestRoute = new Hono().post(
  '/test',
  zValidator('json', testRequestSchema),
  (context) => {
    const body = context.req.valid('json')
    const plan = analyzer.analyze(body)
    const result = renderFromPlan(plan, {
      input: body.params,
      global: body.globalValues ?? {},
    })

    return context.json({
      sql: result.sql,
      params: result.params,
      diagnostics: plan.staticDiagnostics,
    })
  },
)
```

- [ ] **Step 2: 注册路由**

```ts
// src/server/app.ts

import { sqlTestRoute } from '@/server/routes/sql-test.route'

// inside app.route calls:
app.route('/sql', sqlTestRoute)
```

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/sql-test.route.ts src/server/app.ts
git commit -m "feat(api): add POST /api/sql/test endpoint"
```

---

## Task 13: ApiTestService 集成真实 SQL 执行

**Files:**
- Modify: `src/server/domains/api-test/api-test.service.ts`
- Modify: `src/server/domains/data-source/data-source.service.ts` 或 repository 以读取连接配置

- [ ] **Step 1: 扩展 ApiTestService 依赖**

```ts
// src/server/domains/api-test/api-test.service.ts

import { EnhancedSqlAnalyzer } from '@/server/analyzer'
import { renderFromPlan } from '@/server/analyzer/render-from-plan'
import { KnexRegistry } from '@/server/infra/knex/knex-registry'
import type { DataSourceConfig } from '@/server/infra/knex/knex-registry'

export class ApiTestService {
  private readonly analyzer = new EnhancedSqlAnalyzer()
  private readonly knexRegistry = new KnexRegistry()

  constructor(private readonly getDataSource: (id: string) => DataSourceConfig | undefined) {}

  async run(request: ApiTestRequest): Promise<ApiTestResult> {
    // 简化版：只执行第一个 sql-query 步骤
    const sqlStep = request.apiDefinition.workflowSteps.find((step) => step.kind === 'sql-query')

    if (!sqlStep || !sqlStep.sql || !sqlStep.datasourceId) {
      return this.mockResult(request)
    }

    const dataSource = this.getDataSource(sqlStep.datasourceId)

    if (!dataSource) {
      throw new Error(`数据源 ${sqlStep.datasourceId} 不存在`)
    }

    const plan = this.analyzer.analyze({
      sql: sqlStep.sql,
      dialect: 'postgresql',
      inputNames: request.apiDefinition.requestParams.map((p) => p.name),
    })

    const rendered = renderFromPlan(plan, {
      input: request.params,
      global: {},
    })

    const knex = this.knexRegistry.getOrCreate(dataSource)
    const start = performance.now()
    const rows = await knex.raw(rendered.sql, rendered.params.map((p) => p.value))
    const durationMs = Math.round(performance.now() - start)

    return {
      statusCode: 200,
      durationMs,
      size: JSON.stringify(rows).length.toString(),
      requestPreview: { sql: rendered.sql, params: rendered.params },
      response: { rows },
      logs: [{ time: new Date().toLocaleTimeString('zh-CN'), step: sqlStep.title, status: 'success', durationMs }],
    }
  }

  private mockResult(request: ApiTestRequest): ApiTestResult {
    // 保持原有 mock 实现作为 fallback
    return {
      statusCode: 200,
      durationMs: 0,
      size: '1.50KB',
      requestPreview: request.params,
      response: { code: 0, msg: 'success', data: {} },
      logs: [],
    }
  }
}
```

- [ ] **Step 2: 更新路由构造 ApiTestService**

```ts
// src/server/routes/api-test.route.ts（如存在）或相关路由文件

const service = new ApiTestService((id) => dataSourceRepository.get(id))
```

如 `api-test.route.ts` 不存在，先创建该路由。

- [ ] **Step 3: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/domains/api-test/api-test.service.ts
git commit -m "feat(api-test): integrate SQL analyzer and renderer into ApiTestService"
```

---

## Task 14: 全量回归测试

**Files:**
- Run all tests and typecheck

- [ ] **Step 1: 运行单元测试**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: 运行 lint**

Run: `pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: pass full test, typecheck and lint suite"
```

---

## 自检清单

**Spec coverage:**

| Spec 章节 | 对应任务 |
|-----------|---------|
| 2.1 命名空间 `$input` / `$` | Task 2, Task 9 |
| 2.2 三种后缀 | Task 2, Task 6, Task 8 |
| 2.3 处理优先级 | Task 5, Task 8 |
| 3. LIKE 语法 | Task 8（sqlKind like-pattern 预留，后续扩展） |
| 4. IN 数组 | Task 8（dataType array 参数展开） |
| 5. SQL 不支持函数 | Task 2, Task 6 |
| 6. CompiledSqlPlan | Task 1, Task 7 |
| 7. renderFromPlan | Task 8 |
| 8. 静态诊断 | Task 6, Task 11 |
| 9. 自动提示 | Task 9, Task 10 |

**Placeholder scan:** 无 TBD、TODO、"add appropriate" 等占位描述。

**Type consistency:** `VariableRef`、`CompiledSqlPlan`、`RenderResult` 类型在 Task 1 定义，后续任务保持一致。

---

## 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-06-28-sql-variable-parser-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
