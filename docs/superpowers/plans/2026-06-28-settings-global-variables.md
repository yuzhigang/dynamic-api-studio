# 系统设置 / 全局变量 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/settings` 系统设置页（左侧设置项导航 + 子路由），首版完整实现「全局变量」CRUD 管理，「基本设置」「自定义函数」为占位页。

**Architecture:** 镜像现有 `data-source` 模块的全栈分层 —— Zod schema/contract（前后端共享）→ Hono in-memory mock 后端（repository / service / route）→ 前端 `modules/settings`（services / hooks / pages / components）。`/settings` 用 TanStack Router 主从子路由，左侧 settings-nav 为页面内组件，选中态由 URL 反映。全局变量值全部按字符串存储，分 `single`（单值）与 `list`（一组值）两种形态。

**Tech Stack:** TypeScript, React 18, TanStack Router, TanStack Query, Hono, Zod, Tailwind, shadcn/ui, Vitest。

参考设计文档：[docs/superpowers/specs/2026-06-28-settings-global-variables-design.md](../specs/2026-06-28-settings-global-variables-design.md)

**约定（贯穿全程）：**
- 测试：`pnpm test`（vitest run）；类型：`pnpm typecheck`；lint：`pnpm lint`。
- 单测只覆盖后端 repository 与前端纯逻辑 util（镜像现有代码风格，组件不写单测）。
- 每个 Task 末尾提交一次。环境非 git 仓库时跳过 `git` 步骤，仅作逻辑分界。

---

## File Structure

**新建：**
- `src/shared/schemas/global-variable.schema.ts` — Zod schema + 类型
- `src/shared/contracts/global-variable.contract.ts` — 类型/schema 再导出
- `src/server/domains/global-variable/global-variable.repository.ts` — Map mock + 种子 + CRUD + 唯一性
- `src/server/domains/global-variable/global-variable.repository.test.ts` — repo 单测
- `src/server/domains/global-variable/global-variable.service.ts` — 薄 service
- `src/server/routes/global-variable.route.ts` — Hono 路由
- `src/modules/settings/services/global-variable.api.ts` — 前端 API client
- `src/modules/settings/services/global-variable-query-keys.ts` — query keys
- `src/modules/settings/hooks/use-global-variables-query.ts`
- `src/modules/settings/hooks/use-save-global-variable.ts`
- `src/modules/settings/hooks/use-delete-global-variable.ts`
- `src/modules/settings/utils/global-variable-draft.ts` — draft 工厂
- `src/modules/settings/utils/global-variable-draft.test.ts`
- `src/modules/settings/utils/string-list.ts` — list 编辑纯函数
- `src/modules/settings/utils/string-list.test.ts`
- `src/modules/settings/utils/variable-value-preview.ts` — list 预览纯函数
- `src/modules/settings/utils/variable-value-preview.test.ts`
- `src/modules/settings/pages/settings-page.tsx` — 主从壳
- `src/modules/settings/components/settings-nav/settings-nav-config.ts`
- `src/modules/settings/components/settings-nav/settings-nav.tsx`
- `src/modules/settings/components/placeholder/settings-placeholder.tsx`
- `src/modules/settings/components/global-variables/global-variables-section.tsx`
- `src/modules/settings/components/global-variables/global-variables-table.tsx`
- `src/modules/settings/components/global-variables/variable-kind-badge.tsx`
- `src/modules/settings/components/global-variables/global-variable-dialog.tsx`
- `src/modules/settings/components/global-variables/string-list-editor.tsx`
- `src/modules/settings/components/global-variables/delete-global-variable-dialog.tsx`
- `src/routes/_app/settings/index.tsx`
- `src/routes/_app/settings/general.tsx`
- `src/routes/_app/settings/global-variables.tsx`
- `src/routes/_app/settings/functions.tsx`

**修改：**
- `src/server/app.ts` — 注册 `/global-variables` 路由
- `src/app/router.tsx` — 注册 settings 子路由树

---

## Task 1: 共享 Schema 与 Contract

**Files:**
- Create: `src/shared/schemas/global-variable.schema.ts`
- Create: `src/shared/contracts/global-variable.contract.ts`

- [ ] **Step 1: 创建 schema**

`src/shared/schemas/global-variable.schema.ts`：

```ts
import { z } from 'zod'

export const globalVariableKindSchema = z.enum(['single', 'list'])

export type GlobalVariableKind = z.infer<typeof globalVariableKindSchema>

export const globalVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  kind: globalVariableKindSchema,
  value: z.string(),
  items: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type GlobalVariable = z.infer<typeof globalVariableSchema>

export const globalVariableDraftSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, '请输入变量名')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '变量名须以字母或下划线开头，仅含字母、数字、下划线'),
  label: z.string().min(1, '请输入显示名'),
  kind: globalVariableKindSchema,
  value: z.string(),
  items: z.array(z.string()),
})

export type GlobalVariableDraft = z.infer<typeof globalVariableDraftSchema>
```

- [ ] **Step 2: 创建 contract（再导出）**

`src/shared/contracts/global-variable.contract.ts`：

```ts
export type {
  GlobalVariable,
  GlobalVariableDraft,
  GlobalVariableKind,
} from '@/shared/schemas/global-variable.schema'

export {
  globalVariableDraftSchema,
  globalVariableKindSchema,
  globalVariableSchema,
} from '@/shared/schemas/global-variable.schema'
```

- [ ] **Step 3: 类型检查**

Run: `pnpm typecheck`
Expected: PASS（无新错误）

- [ ] **Step 4: 提交**

```bash
git add src/shared/schemas/global-variable.schema.ts src/shared/contracts/global-variable.contract.ts
git commit -m "feat(settings): add global variable schema and contract"
```

---

## Task 2: 后端 Repository（TDD）

**Files:**
- Create: `src/server/domains/global-variable/global-variable.repository.ts`
- Test: `src/server/domains/global-variable/global-variable.repository.test.ts`

- [ ] **Step 1: 写失败测试**

`src/server/domains/global-variable/global-variable.repository.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import type { GlobalVariableDraft } from '@/shared/contracts/global-variable.contract'

const singleDraft: GlobalVariableDraft = {
  name: 'tenant_id',
  label: '租户 ID',
  kind: 'single',
  value: 'acme',
  items: [],
}

const listDraft: GlobalVariableDraft = {
  name: 'allowed_status',
  label: '允许状态',
  kind: 'list',
  value: '',
  items: ['active', 'frozen'],
}

describe('GlobalVariableRepository', () => {
  it('seeds with at least one single and one list variable', () => {
    const repository = new GlobalVariableRepository()
    const all = repository.list()

    expect(all.some((variable) => variable.kind === 'single')).toBe(true)
    expect(all.some((variable) => variable.kind === 'list')).toBe(true)
  })

  it('creates a new variable with generated id and equal timestamps', () => {
    const repository = new GlobalVariableRepository()
    const before = repository.list().length

    const created = repository.save(singleDraft)

    expect(created.id).toBeTruthy()
    expect(created.name).toBe('tenant_id')
    expect(created.createdAt).toBe(created.updatedAt)
    expect(repository.list()).toHaveLength(before + 1)
  })

  it('updates an existing variable while preserving createdAt', () => {
    const repository = new GlobalVariableRepository()
    const created = repository.save(listDraft)

    const updated = repository.save({ ...listDraft, id: created.id, label: '改名后' })

    expect(updated.id).toBe(created.id)
    expect(updated.label).toBe('改名后')
    expect(updated.createdAt).toBe(created.createdAt)
  })

  it('rejects a duplicate name on create', () => {
    const repository = new GlobalVariableRepository()
    repository.save(singleDraft)

    expect(() => repository.save({ ...singleDraft })).toThrowError(/已存在/)
  })

  it('allows saving the same variable without triggering its own duplicate check', () => {
    const repository = new GlobalVariableRepository()
    const created = repository.save(singleDraft)

    expect(() => repository.save({ ...singleDraft, id: created.id })).not.toThrow()
  })

  it('removes a variable', () => {
    const repository = new GlobalVariableRepository()
    const created = repository.save(singleDraft)

    expect(repository.remove(created.id)).toBe(true)
    expect(repository.get(created.id)).toBeUndefined()
    expect(repository.remove(created.id)).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- global-variable.repository`
Expected: FAIL（无法解析 `GlobalVariableRepository` 模块）

- [ ] **Step 3: 实现 repository**

`src/server/domains/global-variable/global-variable.repository.ts`：

```ts
import type {
  GlobalVariable,
  GlobalVariableDraft,
} from '@/shared/contracts/global-variable.contract'

const now = '2026-06-28T00:00:00.000Z'

const seedGlobalVariables: GlobalVariable[] = [
  {
    id: 'gv_default_page_size',
    name: 'default_page_size',
    label: '默认分页大小',
    kind: 'single',
    value: '20',
    items: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'gv_valid_order_status',
    name: 'valid_order_status',
    label: '有效订单状态',
    kind: 'list',
    value: '',
    items: ['active', 'frozen', 'closed'],
    createdAt: now,
    updatedAt: now,
  },
]

export class GlobalVariableRepository {
  private variables = new Map(seedGlobalVariables.map((variable) => [variable.id, variable]))

  list() {
    return Array.from(this.variables.values())
  }

  get(variableId: string) {
    return this.variables.get(variableId)
  }

  save(draft: GlobalVariableDraft) {
    const timestamp = new Date().toISOString()
    const id = draft.id ?? `gv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const duplicate = Array.from(this.variables.values()).find(
      (variable) => variable.name === draft.name && variable.id !== id,
    )

    if (duplicate) {
      throw new Error(`变量名「${draft.name}」已存在`)
    }

    const existing = this.variables.get(id)
    const variable: GlobalVariable = {
      id,
      name: draft.name,
      label: draft.label,
      kind: draft.kind,
      value: draft.kind === 'single' ? draft.value : '',
      items: draft.kind === 'list' ? draft.items : [],
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }

    this.variables.set(id, variable)
    return variable
  }

  remove(variableId: string) {
    return this.variables.delete(variableId)
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `pnpm test -- global-variable.repository`
Expected: PASS（6 个用例全过）

- [ ] **Step 5: 提交**

```bash
git add src/server/domains/global-variable/
git commit -m "feat(settings): add global variable repository with uniqueness check"
```

---

## Task 3: 后端 Service + Route + 注册

**Files:**
- Create: `src/server/domains/global-variable/global-variable.service.ts`
- Create: `src/server/routes/global-variable.route.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: 实现 service**

`src/server/domains/global-variable/global-variable.service.ts`：

```ts
import type { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import type { GlobalVariableDraft } from '@/shared/contracts/global-variable.contract'

export class GlobalVariableService {
  constructor(private readonly repository: GlobalVariableRepository) {}

  list() {
    return this.repository.list()
  }

  get(variableId: string) {
    return this.repository.get(variableId)
  }

  save(draft: GlobalVariableDraft) {
    return this.repository.save(draft)
  }

  remove(variableId: string) {
    return this.repository.remove(variableId)
  }
}
```

- [ ] **Step 2: 实现 route**

`src/server/routes/global-variable.route.ts`：

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { GlobalVariableRepository } from '@/server/domains/global-variable/global-variable.repository'
import { GlobalVariableService } from '@/server/domains/global-variable/global-variable.service'
import { globalVariableDraftSchema } from '@/shared/contracts/global-variable.contract'

export const globalVariableRepository = new GlobalVariableRepository()

const service = new GlobalVariableService(globalVariableRepository)

export const globalVariableRoute = new Hono()
  .get('/', (context) => context.json(service.list()))
  .post('/', zValidator('json', globalVariableDraftSchema), (context) =>
    context.json(service.save(context.req.valid('json'))),
  )
  .get('/:variableId', (context) => {
    const variable = service.get(context.req.param('variableId'))

    return variable
      ? context.json(variable)
      : context.json({ message: 'GlobalVariable not found' }, 404)
  })
  .put('/:variableId', zValidator('json', globalVariableDraftSchema), (context) =>
    context.json(
      service.save({ ...context.req.valid('json'), id: context.req.param('variableId') }),
    ),
  )
  .delete('/:variableId', (context) => {
    const removed = service.remove(context.req.param('variableId'))

    return removed
      ? context.json({ success: true })
      : context.json({ message: 'GlobalVariable not found' }, 404)
  })
```

- [ ] **Step 3: 注册到 app.ts**

在 [src/server/app.ts](../../../src/server/app.ts) 顶部 import 区加入（与其他 route import 同组）：

```ts
import { globalVariableRoute } from '@/server/routes/global-variable.route'
```

在 `.route(...)` 链中，于 `.route('/datasources', dataSourceRoute)` 之后加入一行：

```ts
  .route('/global-variables', globalVariableRoute)
```

- [ ] **Step 4: 类型检查 + 测试**

Run: `pnpm typecheck && pnpm test -- global-variable`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/server/domains/global-variable/global-variable.service.ts src/server/routes/global-variable.route.ts src/server/app.ts
git commit -m "feat(settings): add global variable service, route, registration"
```

---

## Task 4: 前端 Services（API + Query Keys）+ Hooks

**Files:**
- Create: `src/modules/settings/services/global-variable.api.ts`
- Create: `src/modules/settings/services/global-variable-query-keys.ts`
- Create: `src/modules/settings/hooks/use-global-variables-query.ts`
- Create: `src/modules/settings/hooks/use-save-global-variable.ts`
- Create: `src/modules/settings/hooks/use-delete-global-variable.ts`

- [ ] **Step 1: API client**

`src/modules/settings/services/global-variable.api.ts`：

```ts
import { apiFetch } from '@/lib/api-fetch'
import type {
  GlobalVariable,
  GlobalVariableDraft,
} from '@/shared/contracts/global-variable.contract'

export function listGlobalVariables() {
  return apiFetch<GlobalVariable[]>('/api/global-variables')
}

export function saveGlobalVariable(draft: GlobalVariableDraft) {
  return apiFetch<GlobalVariable>(
    draft.id ? `/api/global-variables/${draft.id}` : '/api/global-variables',
    {
      method: draft.id ? 'PUT' : 'POST',
      body: JSON.stringify(draft),
    },
  )
}

export function deleteGlobalVariable(variableId: string) {
  return apiFetch<{ success: boolean }>(`/api/global-variables/${variableId}`, {
    method: 'DELETE',
  })
}
```

- [ ] **Step 2: Query keys**

`src/modules/settings/services/global-variable-query-keys.ts`：

```ts
export const globalVariableQueryKeys = {
  all: ['global-variable'] as const,
  globalVariables: () => [...globalVariableQueryKeys.all, 'global-variables'] as const,
}
```

- [ ] **Step 3: List query hook**

`src/modules/settings/hooks/use-global-variables-query.ts`：

```ts
import { useQuery } from '@tanstack/react-query'

import { listGlobalVariables } from '@/modules/settings/services/global-variable.api'
import { globalVariableQueryKeys } from '@/modules/settings/services/global-variable-query-keys'

export function useGlobalVariablesQuery() {
  return useQuery({
    queryKey: globalVariableQueryKeys.globalVariables(),
    queryFn: listGlobalVariables,
  })
}
```

- [ ] **Step 4: Save mutation hook**

`src/modules/settings/hooks/use-save-global-variable.ts`：

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { saveGlobalVariable } from '@/modules/settings/services/global-variable.api'
import { globalVariableQueryKeys } from '@/modules/settings/services/global-variable-query-keys'

export function useSaveGlobalVariable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveGlobalVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalVariableQueryKeys.globalVariables() })
    },
  })
}
```

- [ ] **Step 5: Delete mutation hook**

`src/modules/settings/hooks/use-delete-global-variable.ts`：

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteGlobalVariable } from '@/modules/settings/services/global-variable.api'
import { globalVariableQueryKeys } from '@/modules/settings/services/global-variable-query-keys'

export function useDeleteGlobalVariable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGlobalVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: globalVariableQueryKeys.globalVariables() })
    },
  })
}
```

- [ ] **Step 6: 类型检查**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/modules/settings/services/ src/modules/settings/hooks/
git commit -m "feat(settings): add global variable api client and query hooks"
```

---

## Task 5: 前端纯逻辑 Utils（TDD）

**Files:**
- Create: `src/modules/settings/utils/global-variable-draft.ts`
- Test: `src/modules/settings/utils/global-variable-draft.test.ts`
- Create: `src/modules/settings/utils/string-list.ts`
- Test: `src/modules/settings/utils/string-list.test.ts`
- Create: `src/modules/settings/utils/variable-value-preview.ts`
- Test: `src/modules/settings/utils/variable-value-preview.test.ts`

- [ ] **Step 1: 写失败测试 — draft 工厂**

`src/modules/settings/utils/global-variable-draft.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

import {
  createEmptyGlobalVariableDraft,
  toGlobalVariableDraft,
} from '@/modules/settings/utils/global-variable-draft'
import type { GlobalVariable } from '@/shared/contracts/global-variable.contract'

describe('global-variable-draft', () => {
  it('creates an empty single draft', () => {
    const draft = createEmptyGlobalVariableDraft()

    expect(draft).toEqual({ name: '', label: '', kind: 'single', value: '', items: [] })
  })

  it('maps a variable to an editable draft', () => {
    const variable: GlobalVariable = {
      id: 'gv_1',
      name: 'foo',
      label: '富',
      kind: 'list',
      value: '',
      items: ['a', 'b'],
      createdAt: 'x',
      updatedAt: 'y',
    }

    expect(toGlobalVariableDraft(variable)).toEqual({
      id: 'gv_1',
      name: 'foo',
      label: '富',
      kind: 'list',
      value: '',
      items: ['a', 'b'],
    })
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- global-variable-draft`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 draft 工厂**

`src/modules/settings/utils/global-variable-draft.ts`：

```ts
import type {
  GlobalVariable,
  GlobalVariableDraft,
} from '@/shared/contracts/global-variable.contract'

export function createEmptyGlobalVariableDraft(): GlobalVariableDraft {
  return { name: '', label: '', kind: 'single', value: '', items: [] }
}

export function toGlobalVariableDraft(variable: GlobalVariable): GlobalVariableDraft {
  return {
    id: variable.id,
    name: variable.name,
    label: variable.label,
    kind: variable.kind,
    value: variable.value,
    items: variable.items,
  }
}
```

- [ ] **Step 4: 写失败测试 — string-list**

`src/modules/settings/utils/string-list.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

import {
  addListItem,
  filterEmptyItems,
  removeListItem,
  updateListItem,
} from '@/modules/settings/utils/string-list'

describe('string-list', () => {
  it('appends an empty item', () => {
    expect(addListItem(['a'])).toEqual(['a', ''])
  })

  it('updates an item by index', () => {
    expect(updateListItem(['a', 'b'], 1, 'z')).toEqual(['a', 'z'])
  })

  it('removes an item by index', () => {
    expect(removeListItem(['a', 'b', 'c'], 1)).toEqual(['a', 'c'])
  })

  it('trims and drops empty/whitespace items', () => {
    expect(filterEmptyItems([' a ', '', '  ', 'b'])).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 5: 运行测试，确认失败**

Run: `pnpm test -- string-list`
Expected: FAIL（模块不存在）

- [ ] **Step 6: 实现 string-list**

`src/modules/settings/utils/string-list.ts`：

```ts
export function addListItem(items: string[]): string[] {
  return [...items, '']
}

export function updateListItem(items: string[], index: number, value: string): string[] {
  return items.map((item, currentIndex) => (currentIndex === index ? value : item))
}

export function removeListItem(items: string[], index: number): string[] {
  return items.filter((_, currentIndex) => currentIndex !== index)
}

export function filterEmptyItems(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0)
}
```

- [ ] **Step 7: 写失败测试 — value preview**

`src/modules/settings/utils/variable-value-preview.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

import { previewListItems } from '@/modules/settings/utils/variable-value-preview'

describe('previewListItems', () => {
  it('returns all items when under the limit', () => {
    expect(previewListItems(['a', 'b'], 3)).toEqual({ shown: ['a', 'b'], overflow: 0 })
  })

  it('caps shown items and reports overflow', () => {
    expect(previewListItems(['a', 'b', 'c', 'd', 'e'], 3)).toEqual({
      shown: ['a', 'b', 'c'],
      overflow: 2,
    })
  })

  it('handles empty list', () => {
    expect(previewListItems([], 3)).toEqual({ shown: [], overflow: 0 })
  })
})
```

- [ ] **Step 8: 运行测试，确认失败**

Run: `pnpm test -- variable-value-preview`
Expected: FAIL（模块不存在）

- [ ] **Step 9: 实现 value preview**

`src/modules/settings/utils/variable-value-preview.ts`：

```ts
export type ListPreview = {
  shown: string[]
  overflow: number
}

export function previewListItems(items: string[], maxItems: number): ListPreview {
  return {
    shown: items.slice(0, maxItems),
    overflow: Math.max(0, items.length - maxItems),
  }
}
```

- [ ] **Step 10: 运行全部 util 测试，确认通过**

Run: `pnpm test -- "global-variable-draft|string-list|variable-value-preview"`
Expected: PASS

- [ ] **Step 11: 提交**

```bash
git add src/modules/settings/utils/
git commit -m "feat(settings): add global variable draft and list utils with tests"
```

---

## Task 6: 设置页壳 + 左侧导航 + 占位页 + 路由注册

实现到本任务结束后，`/settings` 可访问，左侧三项可切换，基本设置/自定义函数显示占位，全局变量先显示简单标题（下个任务填充）。

**Files:**
- Create: `src/modules/settings/components/settings-nav/settings-nav-config.ts`
- Create: `src/modules/settings/components/settings-nav/settings-nav.tsx`
- Create: `src/modules/settings/components/placeholder/settings-placeholder.tsx`
- Create: `src/modules/settings/pages/settings-page.tsx`
- Create: `src/routes/_app/settings/index.tsx`
- Create: `src/routes/_app/settings/general.tsx`
- Create: `src/routes/_app/settings/global-variables.tsx`
- Create: `src/routes/_app/settings/functions.tsx`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: 导航配置**

`src/modules/settings/components/settings-nav/settings-nav-config.ts`：

```ts
export type SettingsNavItem = {
  label: string
  to: string
}

export const settingsNavItems: SettingsNavItem[] = [
  { label: '基本设置', to: '/settings/general' },
  { label: '全局变量', to: '/settings/global-variables' },
  { label: '自定义函数', to: '/settings/functions' },
]
```

- [ ] **Step 2: 左侧导航组件**

`src/modules/settings/components/settings-nav/settings-nav.tsx`：

```tsx
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/cn'
import { settingsNavItems } from '@/modules/settings/components/settings-nav/settings-nav-config'

export function SettingsNav() {
  return (
    <aside className="flex min-h-0 w-[clamp(200px,18vw,260px)] shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-2">
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        系统设置
      </p>
      <nav className="space-y-1">
        {settingsNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
              'text-slate-600 hover:bg-white hover:text-slate-900',
            )}
            activeProps={{ className: 'bg-white font-medium text-slate-900 shadow-sm' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: 占位组件**

`src/modules/settings/components/placeholder/settings-placeholder.tsx`：

```tsx
type SettingsPlaceholderProps = {
  title: string
}

export function SettingsPlaceholder({ title }: SettingsPlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="rounded-md border border-dashed border-slate-300 bg-white px-8 py-10 text-center">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">该设置项正在建设中，敬请期待。</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 设置页主从壳**

`src/modules/settings/pages/settings-page.tsx`：

```tsx
import { Outlet } from '@tanstack/react-router'

import { SettingsNav } from '@/modules/settings/components/settings-nav/settings-nav'

export function SettingsPage() {
  return (
    <div className="flex h-full min-h-0">
      <SettingsNav />
      <div className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 路由包装组件**

`src/routes/_app/settings/index.tsx`：

```tsx
import { Navigate } from '@tanstack/react-router'

export function SettingsIndexRouteComponent() {
  return <Navigate to="/settings/global-variables" replace />
}
```

`src/routes/_app/settings/general.tsx`：

```tsx
import { SettingsPlaceholder } from '@/modules/settings/components/placeholder/settings-placeholder'

export function SettingsGeneralRouteComponent() {
  return <SettingsPlaceholder title="基本设置" />
}
```

`src/routes/_app/settings/functions.tsx`：

```tsx
import { SettingsPlaceholder } from '@/modules/settings/components/placeholder/settings-placeholder'

export function SettingsFunctionsRouteComponent() {
  return <SettingsPlaceholder title="自定义函数" />
}
```

`src/routes/_app/settings/global-variables.tsx`（本任务临时占位，下个任务替换内容）：

```tsx
import { SettingsPlaceholder } from '@/modules/settings/components/placeholder/settings-placeholder'

export function SettingsGlobalVariablesRouteComponent() {
  return <SettingsPlaceholder title="全局变量" />
}
```

- [ ] **Step 6: 注册路由树**

修改 [src/app/router.tsx](../../../src/app/router.tsx)：

在 import 区加入：

```ts
import { SettingsPage } from '@/modules/settings/pages/settings-page'
import { SettingsIndexRouteComponent } from '@/routes/_app/settings'
import { SettingsGeneralRouteComponent } from '@/routes/_app/settings/general'
import { SettingsGlobalVariablesRouteComponent } from '@/routes/_app/settings/global-variables'
import { SettingsFunctionsRouteComponent } from '@/routes/_app/settings/functions'
```

在 `dataSourceDetailRoute` 定义块之后加入 settings 路由定义：

```ts
const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'settings',
  component: SettingsPage,
})

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: SettingsIndexRouteComponent,
})

const settingsGeneralRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'general',
  component: SettingsGeneralRouteComponent,
})

const settingsGlobalVariablesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'global-variables',
  component: SettingsGlobalVariablesRouteComponent,
})

const settingsFunctionsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'functions',
  component: SettingsFunctionsRouteComponent,
})
```

在 `routeTree` 的 `appRoute.addChildren([...])` 数组中，于 `dataSourcesRoute.addChildren([...])` 一行之后加入：

```ts
    settingsRoute.addChildren([
      settingsIndexRoute,
      settingsGeneralRoute,
      settingsGlobalVariablesRoute,
      settingsFunctionsRoute,
    ]),
```

- [ ] **Step 7: 类型检查 + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 8: 手动验证（可选）**

Run: `pnpm dev`，浏览器访问 `/settings` → 应重定向到 `/settings/global-variables`；左侧三项可点击切换，基本设置/自定义函数显示占位。

- [ ] **Step 9: 提交**

```bash
git add src/modules/settings/components/settings-nav/ src/modules/settings/components/placeholder/ src/modules/settings/pages/ src/routes/_app/settings/ src/app/router.tsx
git commit -m "feat(settings): add settings page shell, nav and route registration"
```

---

## Task 7: 全局变量表格 + 类型徽章 + 删除确认

**Files:**
- Create: `src/modules/settings/components/global-variables/variable-kind-badge.tsx`
- Create: `src/modules/settings/components/global-variables/delete-global-variable-dialog.tsx`
- Create: `src/modules/settings/components/global-variables/global-variables-table.tsx`
- Create: `src/modules/settings/components/global-variables/global-variables-section.tsx`
- Modify: `src/routes/_app/settings/global-variables.tsx`

> 说明：本任务先让「新建/编辑」按钮调用一个占位回调（`onEdit`），dialog 在 Task 8 接入。表格、删除、空态、加载态在本任务完成。

- [ ] **Step 1: 类型徽章**

`src/modules/settings/components/global-variables/variable-kind-badge.tsx`：

```tsx
import { Badge } from '@/components/ui/badge'
import type { GlobalVariableKind } from '@/shared/contracts/global-variable.contract'

const KIND_LABELS: Record<GlobalVariableKind, string> = {
  single: '单值',
  list: '枚举值',
}

export function VariableKindBadge({ kind }: { kind: GlobalVariableKind }) {
  return <Badge variant={kind === 'list' ? 'secondary' : 'outline'}>{KIND_LABELS[kind]}</Badge>
}
```

- [ ] **Step 2: 删除确认弹窗**

`src/modules/settings/components/global-variables/delete-global-variable-dialog.tsx`：

```tsx
import { Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDeleteGlobalVariable } from '@/modules/settings/hooks/use-delete-global-variable'
import type { GlobalVariable } from '@/shared/contracts/global-variable.contract'

type DeleteGlobalVariableDialogProps = {
  variable: GlobalVariable
}

export function DeleteGlobalVariableDialog({ variable }: DeleteGlobalVariableDialogProps) {
  const mutation = useDeleteGlobalVariable()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={mutation.isPending}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">删除</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除全局变量</AlertDialogTitle>
          <AlertDialogDescription>
            确认删除变量「{variable.label}」（{variable.name}）？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => mutation.mutate(variable.id)}
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3: 表格组件**

`src/modules/settings/components/global-variables/global-variables-table.tsx`：

```tsx
import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteGlobalVariableDialog } from '@/modules/settings/components/global-variables/delete-global-variable-dialog'
import { VariableKindBadge } from '@/modules/settings/components/global-variables/variable-kind-badge'
import { previewListItems } from '@/modules/settings/utils/variable-value-preview'
import type { GlobalVariable } from '@/shared/contracts/global-variable.contract'

type GlobalVariablesTableProps = {
  variables: GlobalVariable[]
  onEdit: (variable: GlobalVariable) => void
}

function ValueCell({ variable }: { variable: GlobalVariable }) {
  if (variable.kind === 'single') {
    return <span className="font-mono text-sm text-slate-700">{variable.value || '—'}</span>
  }

  const { shown, overflow } = previewListItems(variable.items, 3)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700"
        >
          {item}
        </span>
      ))}
      {overflow > 0 ? <span className="text-xs text-slate-400">+{overflow}</span> : null}
      {shown.length === 0 ? <span className="text-sm text-slate-400">—</span> : null}
    </div>
  )
}

export function GlobalVariablesTable({ variables, onEdit }: GlobalVariablesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">变量名</TableHead>
          <TableHead className="w-[160px]">显示名</TableHead>
          <TableHead className="w-[100px]">类型</TableHead>
          <TableHead>值</TableHead>
          <TableHead className="w-[120px] text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variables.map((variable) => (
          <TableRow key={variable.id}>
            <TableCell className="font-mono text-sm text-slate-900">{variable.name}</TableCell>
            <TableCell className="text-sm text-slate-700">{variable.label}</TableCell>
            <TableCell>
              <VariableKindBadge kind={variable.kind} />
            </TableCell>
            <TableCell>
              <ValueCell variable={variable} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(variable)}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">编辑</span>
                </Button>
                <DeleteGlobalVariableDialog variable={variable} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 4: Section 容器（表格 + 标题 + 状态，onEdit 暂为空实现）**

`src/modules/settings/components/global-variables/global-variables-section.tsx`：

```tsx
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { GlobalVariablesTable } from '@/modules/settings/components/global-variables/global-variables-table'
import { useGlobalVariablesQuery } from '@/modules/settings/hooks/use-global-variables-query'

export function GlobalVariablesSection() {
  const query = useGlobalVariablesQuery()
  const variables = query.data ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">全局变量</h2>
          <p className="text-xs text-slate-500">定义可在全局复用的变量，支持单值或一组枚举值。</p>
        </div>
        <Button type="button" disabled>
          <Plus aria-hidden="true" className="h-4 w-4" />
          新建变量
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        {query.isLoading ? (
          <p className="text-sm text-slate-500">加载全局变量中…</p>
        ) : variables.length === 0 ? (
          <div className="grid min-h-[180px] place-items-center rounded-md border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">暂无全局变量，点击右上角「新建变量」。</p>
          </div>
        ) : (
          <GlobalVariablesTable variables={variables} onEdit={() => undefined} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 接入路由组件**

替换 `src/routes/_app/settings/global-variables.tsx` 全部内容：

```tsx
import { GlobalVariablesSection } from '@/modules/settings/components/global-variables/global-variables-section'

export function SettingsGlobalVariablesRouteComponent() {
  return <GlobalVariablesSection />
}
```

- [ ] **Step 6: 类型检查 + lint + 测试**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/modules/settings/components/global-variables/ src/routes/_app/settings/global-variables.tsx
git commit -m "feat(settings): add global variables table, kind badge, delete dialog"
```

---

## Task 8: 新建/编辑弹窗 + 字符串列表编辑器

接入 dialog，完成新建与编辑闭环。

**Files:**
- Create: `src/modules/settings/components/global-variables/string-list-editor.tsx`
- Create: `src/modules/settings/components/global-variables/global-variable-dialog.tsx`
- Modify: `src/modules/settings/components/global-variables/global-variables-section.tsx`

- [ ] **Step 1: 字符串列表编辑器**

`src/modules/settings/components/global-variables/string-list-editor.tsx`：

```tsx
import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  addListItem,
  removeListItem,
  updateListItem,
} from '@/modules/settings/utils/string-list'

type StringListEditorProps = {
  items: string[]
  onChange: (items: string[]) => void
}

export function StringListEditor({ items, onChange }: StringListEditorProps) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">暂无枚举项，点击下方「添加一项」。</p>
      ) : null}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            autoComplete="off"
            placeholder={`枚举项 ${index + 1}`}
            onChange={(event) => onChange(updateListItem(items, index, event.target.value))}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(removeListItem(items, index))}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">删除此项</span>
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(addListItem(items))}>
        <Plus className="mr-1.5 h-4 w-4" />
        添加一项
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 新建/编辑弹窗**

`src/modules/settings/components/global-variables/global-variable-dialog.tsx`：

```tsx
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StringListEditor } from '@/modules/settings/components/global-variables/string-list-editor'
import { useSaveGlobalVariable } from '@/modules/settings/hooks/use-save-global-variable'
import { createEmptyGlobalVariableDraft } from '@/modules/settings/utils/global-variable-draft'
import { filterEmptyItems } from '@/modules/settings/utils/string-list'
import type {
  GlobalVariableDraft,
  GlobalVariableKind,
} from '@/shared/contracts/global-variable.contract'

type GlobalVariableDialogProps = {
  open: boolean
  draft: GlobalVariableDraft | null
  onOpenChange: (open: boolean) => void
}

export function GlobalVariableDialog({ open, draft, onOpenChange }: GlobalVariableDialogProps) {
  const save = useSaveGlobalVariable()
  const [form, setForm] = useState<GlobalVariableDraft>(createEmptyGlobalVariableDraft())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(draft ?? createEmptyGlobalVariableDraft())
      setError(null)
    }
  }, [open, draft])

  const isEdit = Boolean(form.id)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const payload: GlobalVariableDraft =
      form.kind === 'list'
        ? { ...form, value: '', items: filterEmptyItems(form.items) }
        : { ...form, items: [] }

    save.mutate(payload, {
      onSuccess: () => onOpenChange(false),
      onError: (mutationError) =>
        setError(mutationError instanceof Error ? mutationError.message : '保存失败'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑全局变量' : '新建全局变量'}</DialogTitle>
          <DialogDescription>变量值统一按字符串保存。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="gv-name">变量名</Label>
            <Input
              id="gv-name"
              autoComplete="off"
              value={form.name}
              placeholder="例如 default_page_size"
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gv-label">显示名</Label>
            <Input
              id="gv-label"
              autoComplete="off"
              value={form.label}
              placeholder="例如 默认分页大小"
              onChange={(event) => setForm({ ...form, label: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gv-kind">类型</Label>
            <Select
              value={form.kind}
              onValueChange={(value) => setForm({ ...form, kind: value as GlobalVariableKind })}
            >
              <SelectTrigger id="gv-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">单值</SelectItem>
                <SelectItem value="list">枚举值（一组值）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.kind === 'single' ? (
            <div className="space-y-1.5">
              <Label htmlFor="gv-value">值</Label>
              <Input
                id="gv-value"
                autoComplete="off"
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>枚举项</Label>
              <StringListEditor
                items={form.items}
                onChange={(items) => setForm({ ...form, items })}
              />
            </div>
          )}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={save.isPending}>
              保存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Section 接入 dialog 状态**

替换 `src/modules/settings/components/global-variables/global-variables-section.tsx` 全部内容：

```tsx
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { GlobalVariableDialog } from '@/modules/settings/components/global-variables/global-variable-dialog'
import { GlobalVariablesTable } from '@/modules/settings/components/global-variables/global-variables-table'
import { useGlobalVariablesQuery } from '@/modules/settings/hooks/use-global-variables-query'
import { toGlobalVariableDraft } from '@/modules/settings/utils/global-variable-draft'
import type {
  GlobalVariable,
  GlobalVariableDraft,
} from '@/shared/contracts/global-variable.contract'

export function GlobalVariablesSection() {
  const query = useGlobalVariablesQuery()
  const variables = query.data ?? []
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDraft, setEditingDraft] = useState<GlobalVariableDraft | null>(null)

  const handleCreate = () => {
    setEditingDraft(null)
    setDialogOpen(true)
  }

  const handleEdit = (variable: GlobalVariable) => {
    setEditingDraft(toGlobalVariableDraft(variable))
    setDialogOpen(true)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">全局变量</h2>
          <p className="text-xs text-slate-500">定义可在全局复用的变量，支持单值或一组枚举值。</p>
        </div>
        <Button type="button" onClick={handleCreate}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          新建变量
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        {query.isLoading ? (
          <p className="text-sm text-slate-500">加载全局变量中…</p>
        ) : variables.length === 0 ? (
          <div className="grid min-h-[180px] place-items-center rounded-md border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">暂无全局变量，点击右上角「新建变量」。</p>
          </div>
        ) : (
          <GlobalVariablesTable variables={variables} onEdit={handleEdit} />
        )}
      </div>
      <GlobalVariableDialog
        open={dialogOpen}
        draft={editingDraft}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
```

- [ ] **Step 4: 类型检查 + lint + 测试**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS

- [ ] **Step 5: 手动验证（可选）**

Run: `pnpm dev`，访问 `/settings/global-variables`：
- 「新建变量」→ 填 single → 保存 → 列表出现新行。
- 切换 kind 为「枚举值」→ 添加多项 → 保存 → 表格值列显示前 3 项 + 余量。
- 行「编辑」→ 回填 → 改 label → 保存生效。
- 重名新建 → 弹窗显示「变量名「…」已存在」错误。
- 行「删除」→ 确认 → 行消失。

- [ ] **Step 6: 提交**

```bash
git add src/modules/settings/components/global-variables/
git commit -m "feat(settings): add global variable create/edit dialog with list editor"
```

---

## Self-Review 备注

- **Spec coverage：** 路由结构（Task 6）、数据模型（Task 1）、后端 mock（Task 2-3）、前端模块 services/hooks（Task 4）/utils（Task 5）/components（Task 6-8）、占位页（Task 6）、CRUD + 重名校验（Task 2/8）、值预览（Task 5/7）、测试（Task 2/5）均有对应任务。
- **命名一致性：** `globalVariableQueryKeys.globalVariables()`、`useSaveGlobalVariable`、`useDeleteGlobalVariable`、`createEmptyGlobalVariableDraft` / `toGlobalVariableDraft`、`previewListItems`、`addListItem/updateListItem/removeListItem/filterEmptyItems` 全程一致。
- **前提依赖：** 复用现有 `@/lib/api-fetch`（`apiFetch`）、`@/lib/cn`、shadcn `alert-dialog/dialog/select/table/badge/button/input/label`，均已存在于代码库。
```

