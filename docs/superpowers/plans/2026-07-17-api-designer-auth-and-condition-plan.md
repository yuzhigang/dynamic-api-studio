# API Designer Auth Toggle & Step Condition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 API 设计器中为 API 定义增加「需要鉴权」开关，并为每个工作流步骤增加可折叠的「执行条件」表达式输入。

**Architecture:** 仅扩展前端状态管理与 UI 组件。`requireAuth` 与 `condition` 字段已在 schema、repository、workflow runner 中完整支持，无需改动后端。

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui (Checkbox, Textarea), custom reducer pattern.

## Global Constraints

- 不修改后端 schema、repository、service 或迁移。
- 保持现有 reducer/action 命名风格。
- `condition` 空值保存为 `undefined`，不发送空字符串。
- 新建 API/步骤默认值沿用现有 schema default。

---

### Task 1: 扩展状态管理支持 `setRequireAuth`

**Files:**
- Modify: `src/modules/project-management/state/api-designer-types.ts:15-23`
- Modify: `src/modules/project-management/state/api-designer-actions.ts:10-25`
- Modify: `src/modules/project-management/state/api-designer-reducer.ts:148-163`

**Interfaces:**
- Consumes: existing `ApiDesignerAction` union, `ApiDefinitionDraft`
- Produces: new `set-require-auth` action handled by reducer

- [ ] **Step 1: 添加 action 类型**

  在 `api-designer-types.ts` 的 `ApiDesignerAction` union 中，于 `set-permissions` 之后插入：
  ```typescript
  | { type: 'set-require-auth'; value: boolean }
  ```

- [ ] **Step 2: 添加 action creator**

  在 `api-designer-actions.ts` 中，于 `setPermissions` 之后插入：
  ```typescript
  setRequireAuth(value: boolean): ApiDesignerAction {
    return { type: 'set-require-auth', value }
  },
  ```

- [ ] **Step 3: 添加 reducer 处理分支**

  在 `api-designer-reducer.ts` 中，于 `set-permissions` 分支之后插入：
  ```typescript
  case 'set-require-auth':
    return {
      ...state,
      apiDefinition: {
        ...state.apiDefinition,
        requireAuth: action.value,
      },
    }
  ```

- [ ] **Step 4: 验证类型检查**

  Run: `pnpm typecheck`
  Expected: 无错误。

---

### Task 2: 在 API 基本信息增加「需要鉴权」开关

**Files:**
- Modify: `src/modules/project-management/components/basic-info/api-basic-info-section.tsx:1-80`

**Interfaces:**
- Consumes: `apiDesignerActions.setRequireAuth`, `api.requireAuth`
- Produces: UI control that updates `requireAuth`

- [ ] **Step 1: 导入 Checkbox**

  在文件顶部导入：
  ```typescript
  import { Checkbox } from '@/components/ui/checkbox'
  ```

- [ ] **Step 2: 在「所需权限」下方增加鉴权开关**

  在 `PermissionSelect` 所在的 `CompactField` 之后、注释掉的 description 字段之前插入：
  ```tsx
  <CompactField htmlFor="api-require-auth" label="鉴权">
    <div className="flex items-center gap-2 pt-1.5">
      <Checkbox
        id="api-require-auth"
        checked={api.requireAuth}
        onCheckedChange={(checked) =>
          dispatch(apiDesignerActions.setRequireAuth(checked === true))
        }
      />
      <label htmlFor="api-require-auth" className="text-xs text-slate-700">
        需要鉴权
      </label>
    </div>
  </CompactField>
  ```

- [ ] **Step 3: 验证 UI 渲染**

  Run: `pnpm dev`（或请用户手工打开 API 设计器）
  Expected: API 基本信息卡片中出现「需要鉴权」Checkbox，且默认勾选。

---

### Task 3: 在工作流步骤卡片增加可折叠「执行条件」面板

**Files:**
- Modify: `src/modules/project-management/components/workflow/workflow-step-card.tsx:1-34`

**Interfaces:**
- Consumes: `WorkflowStep` (now including `condition`), `apiDesignerActions.updateWorkflowStep`
- Produces: collapsible condition editor rendered inside each step card

- [ ] **Step 1: 导入所需组件与 hooks**

  替换现有 imports 为：
  ```typescript
  import { useState } from 'react'

  import { ChevronDown } from 'lucide-react'
  import { Textarea } from '@/components/ui/textarea'
  import { WorkflowStepToolbar } from '@/modules/project-management/components/workflow/workflow-step-toolbar'
  import { useApiDesigner } from '@/modules/project-management/hooks/use-api-designer'
  import { apiDesignerActions } from '@/modules/project-management/state/api-designer-actions'
  import type { WorkflowStep } from '@/shared/contracts/api-definition.contract'
  ```

- [ ] **Step 2: 修改组件签名并接入 condition**

  将 props 改为直接接收 `step`：
  ```typescript
  type WorkflowStepCardProps = PropsWithChildren<{
    step: WorkflowStep
    index: number
  }>
  ```

  组件内部解构：
  ```typescript
  export function WorkflowStepCard({ step, index, children }: WorkflowStepCardProps) {
    const { dispatch } = useApiDesigner()
    const [conditionExpanded, setConditionExpanded] = useState(Boolean(step.condition))
    const isAssemble = step.role === 'assemble'
    const hasCondition = Boolean(step.condition)
  ```

- [ ] **Step 3: 渲染 header 条件标签**

  在 header 标题之后、`isAssemble` 标签之前插入：
  ```tsx
  {hasCondition ? (
    <span className="shrink-0 rounded-sm bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600">
      有条件
    </span>
  ) : null}
  ```

- [ ] **Step 4: 在 header 与内容之间增加条件折叠面板**

  将 `children` 包装在 condition 面板内：
  ```tsx
  <div className="space-y-3 p-3">
    {isAssemble ? null : (
      <div className="rounded border border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={() => setConditionExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          <span>执行条件（可选）</span>
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform ${conditionExpanded ? 'rotate-180' : ''}`}
          />
        </button>
        {conditionExpanded ? (
          <div className="border-t border-slate-100 p-3">
            <Textarea
              id={`${step.id}-condition`}
              value={step.condition ?? ''}
              placeholder="条件为真时执行，如 $input.enabled || $.isAdmin"
              className="min-h-[60px] resize-y bg-white text-xs"
              onChange={(event) => {
                const value = event.target.value.trim()
                dispatch(
                  apiDesignerActions.updateWorkflowStep(step.id, {
                    condition: value || undefined,
                  }),
                )
              }}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              支持 JavaScript 表达式，可引用 $input、$global、$local 等变量。
            </p>
          </div>
        ) : null}
      </div>
    )}
    {children}
  </div>
  ```

- [ ] **Step 5: 更新调用方传入 step**

  修改 `src/modules/project-management/components/workflow/workflow-step-list.tsx:13-19`：
  ```tsx
  <WorkflowStepCard
    key={step.id}
    step={step}
    index={index}
  >
  ```

- [ ] **Step 6: 验证类型检查**

  Run: `pnpm typecheck`
  Expected: 无错误。

---

### Task 4: 全量验证

**Files:**
- 无新文件

- [ ] **Step 1: 类型检查**

  Run: `pnpm typecheck`
  Expected: 无错误。

- [ ] **Step 2: Lint 检查**

  Run: `pnpm lint`
  Expected: 无错误。

- [ ] **Step 3: 运行测试**

  Run: `pnpm test`
  Expected: 全部通过。

- [ ] **Step 4: 手工验证**

  Run: `pnpm dev`
  Expected:
  - API 基本信息页出现「需要鉴权」Checkbox，可切换并保存。
  - 工作流步骤卡片出现「执行条件（可选）」折叠面板。
  - 输入条件表达式后保存，刷新后条件保留。
  - 条件为 false 的步骤在测试执行时被跳过。

---

## Self-Review

**1. Spec coverage:**
- `requireAuth` UI：Task 1 + Task 2。
- `condition` UI：Task 3。
- 不改动后端：Global Constraint 明确。
- 验证：Task 4。
- 无 gaps。

**2. Placeholder scan:**
- 无 TODO/TBD。
- 所有步骤包含实际代码与命令。

**3. Type consistency:**
- `set-require-auth` action 在 types/actions/reducer 中一致。
- `WorkflowStepCard` props 从 `{stepId, title, role}` 改为 `{step, index}`，调用方同步更新。
