# API 设计器增加鉴权开关与步骤条件配置设计

## 目标

在 API 设计器（API Designer）中为 API 定义增加两个可配置项：

1. **API 级别鉴权开关** `requireAuth`：控制调用该 API 时是否需要鉴权。
2. **步骤执行条件** `condition`：控制每个工作流步骤是否执行，支持 JavaScript 表达式。

## 范围

- **只改前端 UI 与状态管理**，不改后端服务、数据库 schema 或迁移。
- 原因：`requireAuth` 与 `condition` 字段已在 `apiDefinitionDraftSchema`、`api` 表、`ApiDefinitionRepository` 和 `WorkflowRunner` 中完整支持，当前缺口仅在 UI 上无法编辑。

## 当前现状

- `src/shared/schemas/api-definition.schema.ts` 已定义：
  - `requireAuth: z.boolean().default(true)`
  - `workflowStepSchema.condition: z.string().optional()`
- `src/server/infra/db/tables.ts` 中 `ApiTable.require_auth` 已存在。
- `src/server/domains/api-definition/api-definition.repository.ts` 已读写 `require_auth` 和 `workflow_steps`（含 condition）。
- `src/server/workflow/workflow-runner.ts:121` 已根据 `step.condition` 判断是否执行步骤。
- 前端 `ApiBasicInfoSection` 没有 `requireAuth` 编辑控件。
- 前端 `SqlQueryStepCard` / `JsTransformStepCard` 没有 `condition` 编辑控件。

## 设计方案（方案 2：推荐）

### 1. API 基本信息增加「需要鉴权」开关

位置：`src/modules/project-management/components/basic-info/api-basic-info-section.tsx`

- 在「所需权限」字段下方增加一个 Checkbox：
  - 标签：「需要鉴权」
  - 绑定 `api.requireAuth`
  - 变更时 dispatch `apiDesignerActions.setRequireAuth(checked)`
- 新增 action：`set-require-auth`（boolean）
- 在 `api-designer-types.ts`、`api-designer-actions.ts`、`api-designer-reducer.ts` 中注册并处理。

### 2. 工作流步骤增加可折叠「执行条件」面板

位置：`src/modules/project-management/components/workflow/workflow-step-card.tsx`

- 在步骤卡片 header 与内容之间增加一个可折叠区域：
  - 标题：「执行条件（可选）」
  - 默认折叠
  - 展开后显示一个 `Textarea`，用于输入 JavaScript 表达式
  - placeholder：例如 `条件为真时执行，如 $input.enabled || $.isAdmin`
- 当 `condition` 有值时，header 上显示一个小标签「有条件」，给用户明确反馈。
- 数据流：
  - `onChange` → `dispatch(apiDesignerActions.updateWorkflowStep(step.id, { condition: value || undefined }))`
  - 空字符串时保存为 `undefined`，避免发送空字符串到后端。

### 3. 默认值与空值处理

- 新建 API 时，`requireAuth` 默认为 `true`（schema default）。
- 新建步骤时，`condition` 为 `undefined`。
- 条件表达式为空时，UI 显示为空，保存时写回 `undefined`。

## 文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `src/modules/project-management/components/basic-info/api-basic-info-section.tsx` | 修改 | 增加「需要鉴权」Checkbox |
| `src/modules/project-management/components/workflow/workflow-step-card.tsx` | 修改 | 增加可折叠 condition 区域与条件标签 |
| `src/modules/project-management/state/api-designer-types.ts` | 修改 | 增加 `set-require-auth` action 类型 |
| `src/modules/project-management/state/api-designer-actions.ts` | 修改 | 增加 `setRequireAuth` action creator |
| `src/modules/project-management/state/api-designer-reducer.ts` | 修改 | 处理 `set-require-auth` action |
| `src/modules/project-management/components/workflow/sql-query-step-card.tsx` | 不修改 | 已有 `updateWorkflowStep` 机制，条件面板放到父级 `WorkflowStepCard` |
| `src/modules/project-management/components/workflow/js-transform-step-card.tsx` | 不修改 | 同上 |
| 后端文件 | 不修改 | 字段已完整支持 |

## 数据流

```
用户点击 Checkbox ──► apiDesignerActions.setRequireAuth(value)
                   ──► dispatch
                   ──► apiDesignerReducer 更新 state.apiDefinition.requireAuth
                   ──► useSaveApiDefinition 保存时随完整 Draft 提交
                   ──► ApiDefinitionRepository 写入 api.require_auth

用户在 Textarea 输入条件 ──► apiDesignerActions.updateWorkflowStep(step.id, { condition })
                         ──► dispatch
                         ──► apiDesignerReducer 更新对应 step.condition
                         ──► 保存时随 workflow_steps JSON 提交
                         ──► WorkflowRunner 执行时 evalExpressionFromContext 判断
```

## UI 草图

### API 基本信息卡片

```
API 名称        [________________]
路径            [________________]
请求方式        [GET ▼]
标签            [tag1] [tag2]
所需权限        [权限A ▼] [权限B ▼]
☑ 需要鉴权
```

### 工作流步骤卡片

```
┌─ 步骤 1 - 查询订单主表                [⋮]
│  执行条件（可选） ▼                    ← 折叠面板，默认收起
├─ 数据源 [___▼]  变量名称 [result]
│  ☑ 多行返回值
│  ┌─ SQL 语句 ──────────────────┐
│  │ SELECT ...                  │
│  └─────────────────────────────┘
```

当 condition 有值时，header 显示「有条件」标签：

```
┌─ 步骤 1 - 查询订单主表  [有条件]      [⋮]
```

## 测试计划

1. **类型检查**：`pnpm typecheck` 无错误。
2. **Lint**：`pnpm lint` 无错误。
3. **单元测试**：运行 `pnpm test`，确保现有测试不受影响。
4. **手工验证**：
   - 打开 API 设计器，确认「需要鉴权」Checkbox 显示正确，点击可切换。
   - 保存后刷新，确认 `requireAuth` 状态持久化。
   - 展开步骤的「执行条件」面板，输入表达式，保存后刷新，确认 `condition` 持久化。
   - 在测试面板执行，确认 condition 为 false 的步骤被跳过。

## 风险与回滚

- 风险：极低。仅新增 UI 控件，不修改后端数据格式。
- 回滚：删除新增控件与 action 即可，数据层无影响。
