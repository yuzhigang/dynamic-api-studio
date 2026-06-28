# 定时任务（Scheduled Tasks）页面设计

- 日期：2026-06-28
- 状态：已与用户确认，待生成实现计划
- 路由：`/tasks`

## 1. 背景与目标

左侧菜单已有「定时任务」入口（`/tasks`），但页面未实现。本设计补齐该页面：

- 左侧展示**所有定时任务**列表，默认选中第一个
- 点击某个任务，右侧显示该任务的**设置**与**运行日志**

任务的语义：到点自动**执行一段 SQL**。触发方式同时支持 **Cron 表达式**与**固定间隔**两种模式。数据由 **Hono mock 后端**提供（与「调用日志」一致），便于联调与测试。

> 范围说明（YAGNI）：本期**不实现真实调度引擎**，也不真正连库执行 SQL。「立即运行」与种子运行日志用于模拟执行。Cron 表达式仅做轻量校验 + 人类可读摘要，不引入完整解析器。

## 2. 选型决策

**路由驱动选择（采用）**，与既有 `/projects/$projectId` 工作台一致：

- `/tasks` → 重定向到第一个任务
- `/tasks/$taskId` → 设置标签页
- `/tasks/$taskId/logs` → 运行日志标签页

理由：任务可深链、刷新安全，复用代码库已有的 master-detail + Tabs 模式。备选「本地 `useState` 选择」代码略少，但破坏深链且与全局约定不一致，不采用。

## 3. 数据模型

新增 `shared/schemas/scheduled-task.schema.ts`（Zod）与 `shared/contracts/scheduled-task.contract.ts`（再导出类型 + schema），沿用 `project` 的组织方式。

### 3.1 触发器 Trigger（可辨识联合）

```ts
// mode: 'cron'
{ mode: 'cron'; expression: string }            // 如 "0 2 * * *"
// mode: 'interval'
{ mode: 'interval'; every: number; unit: 'minute' | 'hour' | 'day' }
```

### 3.2 ScheduledTask

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 任务 ID |
| `name` | string | 任务名称（必填） |
| `description` | string? | 描述 |
| `enabled` | boolean | 是否启用 |
| `dataSourceId` | string | 目标数据源（来自 mock 数据源列表） |
| `sql` | string | 到点执行的 SQL |
| `trigger` | Trigger | 见 3.1 |
| `lastRunAt` | string? | 最近一次运行时间（ISO） |
| `nextRunAt` | string? | 下次预计运行时间（ISO，mock 计算） |
| `createdAt` / `updatedAt` | string | ISO 时间戳 |

`ScheduledTaskDraft`：用于创建/保存，`id` 可选，省略 `lastRunAt/nextRunAt/createdAt/updatedAt`（由后端补全），与 `ProjectDraft` 思路一致。

### 3.3 TaskRunLog（运行日志）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 日志 ID |
| `taskId` | string | 所属任务 |
| `startedAt` | string | 开始时间（ISO） |
| `trigger` | `'auto' \| 'manual'` | 自动调度 / 手动「立即运行」 |
| `status` | `'success' \| 'failed' \| 'running'` | 执行状态 |
| `durationMs` | number | 耗时 |
| `affectedRows` | number? | 影响行数（成功时） |
| `error` | string? | 错误信息（失败时） |

### 3.4 数据源（mock）

`/datasources` 模块尚未建立。为支持设置表单的「数据源」下拉，在 scheduled-task 后端旁提供一个最小 mock 数据源列表（3 个，与首页指标 `datasourceCount: 3` 对齐）：`MockDataSource { id, name, dialect }`。后续接入真实数据源模块时替换。

## 4. 后端（Hono mock）

新增 `src/server/routes/task.route.ts`，内存仓储 `TaskRepository`（仿 `ProjectRepository`，`Map` + 种子数据），并在 `src/server/app.ts` 注册 `.route('/tasks', taskRoute)`。

种子数据：约 4 个任务（混合 cron / interval、启用 / 停用），每个任务若干条运行日志。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/tasks` | 任务列表 |
| GET | `/api/tasks/datasources` | mock 数据源列表 |
| GET | `/api/tasks/:id` | 任务详情 |
| POST | `/api/tasks` | 新建任务（zValidator + draft schema） |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| GET | `/api/tasks/:id/logs?page&pageSize` | 运行日志（分页，与调用日志返回结构一致：`{ items, total, page, pageSize }`） |
| POST | `/api/tasks/:id/run` | 立即运行 → 追加一条 `trigger: 'manual'` 运行日志，更新 `lastRunAt` |

> 路由顺序注意：`/datasources` 须在 `/:id` 之前注册，避免被参数路由吞掉。

校验：`taskDraftSchema`（Zod）共享给前端表单与后端 `zValidator`。Cron 模式校验表达式非空且为 5 段；interval 模式校验 `every >= 1`。

## 5. 前端模块结构

新增 `src/modules/scheduled-task/`，沿用既有模块形态：

```
src/modules/scheduled-task/
├── index.ts
├── model/scheduled-task.types.ts        # 再导出 contract 类型 + 视图辅助类型
├── services/
│   ├── scheduled-task.api.ts            # apiFetch 封装（list/get/save/delete/run/logs/datasources）
│   └── scheduled-task-query-keys.ts
├── hooks/
│   ├── use-task-query.ts                # 列表 / 详情 query
│   ├── use-task-logs-query.ts           # 运行日志分页 query
│   ├── use-save-task.ts                 # 保存 mutation（含失效查询）
│   ├── use-run-task.ts                  # 立即运行 mutation
│   └── use-data-sources-query.ts        # mock 数据源列表
├── utils/
│   ├── describe-trigger.ts              # Trigger → 中文摘要（"每 5 分钟" / cron 原样 + 校验）
│   └── create-empty-task.ts             # 新建任务默认草稿
├── pages/
│   └── task-workspace-page.tsx          # 顶层：拉列表 + 默认选中 + 布局，仿 ProjectDetailPage
└── components/task-workspace/
    ├── task-sidebar.tsx                 # 左侧列表（搜索 + 新建 + 列表 + 选中态）
    ├── task-list-item.tsx               # 单个任务行：名称 / 触发摘要 / 启用状态点
    ├── task-main-panel.tsx              # 右侧：头部（名称 + 启用开关 + 立即运行）+ Tabs
    ├── task-settings-tab.tsx            # 设置表单
    ├── task-trigger-fields.tsx          # Cron ↔ 固定间隔切换字段
    └── task-run-log-tab.tsx            # 运行日志表格（分页）
```

### 5.1 顶层页面 `task-workspace-page.tsx`

- `useTaskListQuery()` 拉全部任务
- 路由参数 `taskId`（`useParams({ strict: false })`）；若无或不存在，`useEffect` 内 `navigate(..., { replace: true })` 跳到 `tasks[0].id`（仿 `ProjectDetailPage`）
- 渲染 `AppPage` → flex 行：`TaskSidebar` + `TaskMainPanel`
- 当前标签页由 pathname 是否以 `/logs` 结尾决定（仿 `getActiveTab`）

### 5.2 左侧 `task-sidebar.tsx`

- 复用 `ProjectApiSidebar` 的结构：搜索框（按名称过滤）、「新建任务」按钮、滚动列表、可选分页
- 每行 `task-list-item`：名称、`describeTrigger(trigger)` 摘要、启用状态圆点（启用=绿，停用=灰）
- 选中态高亮；点击 → `navigate({ to: '/tasks/$taskId', params })`

### 5.3 右侧 `task-main-panel.tsx`

- 头部：任务名 + 启用开关（切换即保存）+「立即运行」按钮（调用 `use-run-task`，成功后失效运行日志查询并切到日志标签）
- `Tabs`（value 由 activeTab 控制，onValueChange 触发 navigate）：
  - **设置** `task-settings-tab`
  - **运行日志** `task-run-log-tab`
- 复用 `ProjectApiMainPanel` 的 Tabs 样式类

### 5.4 设置表单 `task-settings-tab.tsx`

字段：名称（Input）、描述（Textarea）、数据源（Select，来自 `use-data-sources-query`）、SQL（复用 `@/modules/api-management/editors` 的 `SqlEditor`）、触发方式（`task-trigger-fields`）、启用（开关）。本地草稿状态（`useState`/`useReducer`），「保存」走 `use-save-task` mutation；脏状态校验沿用 `shared/state` 现有工具（若适用）。

### 5.5 触发字段 `task-trigger-fields.tsx`

- 模式切换（Cron / 固定间隔），用 RadioGroup 或 Tabs
- Cron：单个 Input + 实时摘要/校验提示
- 固定间隔：数字 Input（`every`） + 单位 Select（分钟/小时/天）

### 5.6 运行日志 `task-run-log-tab.tsx`

- 专用表格（列：开始时间、触发方式、状态徽标、耗时(ms)、影响行数、错误信息）
- 复用 `Table` 组件与 `InvocationLogPagination` 同款分页
- 加载/空态/错误态与调用日志一致

## 6. 路由注册

新增 `src/routes/_app/tasks/` 路由组件：

- `tasks.tsx`（`/tasks` 容器，`<Outlet/>`，并在无子路由时由顶层页面重定向到首个任务）
- `$taskId/index.tsx` → 设置
- `$taskId/logs.tsx` → 运行日志

在 `src/app/router.tsx` 仿 `projects` 子树注册：`tasksRoute`（path `tasks`）→ `taskWorkspaceRoute`（path `$taskId`）→ `taskLogsRoute`（path `$taskId/logs`）。`/tasks` 自身重定向到第一个任务（顶层页面负责，或空列表时显示空态）。

> 说明：顶层页面同时承载「设置」与「运行日志」（共享左侧列表 + 右侧面板），故三个路由均渲染同一个 `TaskWorkspacePage`，由 pathname 决定激活标签，避免重复布局。

## 7. 测试

- `task.route.test.ts`：列表、详情、创建/更新校验、运行日志分页、立即运行追加日志、`/datasources` 不被 `/:id` 吞掉、非法 trigger 返回 400（仿 `home-overview.route.test.ts`）
- `describe-trigger.test.ts`：interval/cron 各模式摘要输出
- 表单/组件层测试按既有覆盖度补关键路径（如设置表单保存、空列表态）

## 8. 验收标准

1. 访问 `/tasks` 自动选中第一个任务并展示其设置
2. 左侧列出所有任务，含触发摘要与启用状态；点击切换右侧内容并更新 URL
3. 设置标签可编辑并保存（名称/描述/数据源/SQL/触发方式/启用）
4. 运行日志标签分页展示历史；「立即运行」追加一条手动日志并刷新
5. `pnpm typecheck`、`pnpm lint`、`pnpm test` 全绿

## 9. 非目标（本期不做）

- 真实 cron 调度器 / 后台定时执行
- 真正连库执行 SQL
- 任务并发控制、超时/重试策略、告警
- 真实数据源模块（用 mock 列表占位）
