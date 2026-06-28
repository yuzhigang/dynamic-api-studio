# 系统设置 `/settings` — 设计文档

日期：2026-06-28

## 目标

完善 `/settings` 路由，进入系统设置界面：左侧为设置项列表（基本设置、全局变量、自定义函数），右侧渲染对应设置内容。首版重点实现**全局变量**模块（存储 + 管理界面），基本设置与自定义函数先做占位页。整体镜像现有 `data-source` 模块的全栈分层。

## 范围决策

- 数据来源：前端 + 薄后端 in-memory mock（镜像 `data-source` / `project` 域）。
- 设置项：基本设置（占位）、全局变量（完整）、自定义函数（占位）。
- 路由：主从单页 + URL 反映选中的设置项（Approach A，子路由）。
- 全局变量值：**全部按字符串存储**，不声明数据类型。
- 全局变量两种形态：`single`（单值标量）/ `list`（持有一组值，整体作为一个变量被引用）。`list` 是纯字符串数组，**非** key→value 映射。
- 管理字段：`name`（唯一 key）+ `label`（显示名）+ 值。无描述、无分组。
- 全局变量未来可在 SQL/API 的 `$变量` 体系中被引用；本期**只做存储与管理界面**，不实现 SQL 集成。
- 全局变量操作：完整 CRUD（新建 / 编辑 / 删除）。

## 路由结构

在 [src/app/router.tsx](../../../src/app/router.tsx) 手动注册，与 `dataSourcesRoute` 主从结构同构：

```
/settings                       → 父路由，渲染 <SettingsPage>（左 settings-nav 常驻 + <Outlet/>）
  index '/'                     → Navigate 到 /settings/global-variables（replace）
  general                       → <SettingsPlaceholder title="基本设置">（敬请期待）
  global-variables              → <GlobalVariablesSection>
  functions                     → <SettingsPlaceholder title="自定义函数">（敬请期待）
```

- `nav-config.ts` 中 `/settings` 已存在，无需改动。
- 左侧 settings-nav 是 **页面内组件**（非全局 `app-sidebar`），三项写死在 `settings-nav-config.ts`，通过 `<Link>` + active 态切换子路由。
- 路由组件包装文件放在 `src/routes/_app/settings/`，与现有 `routes/_app/datasources/` 一致：每个文件导出 `XxxRouteComponent`，在 `router.tsx` 引入并注册。

router.tsx 需新增（参照 datasources 块）：

```ts
const settingsRoute = createRoute({ getParentRoute: () => appRoute, path: 'settings', component: SettingsPage })
const settingsIndexRoute = createRoute({ getParentRoute: () => settingsRoute, path: '/', component: () => <Navigate to="/settings/global-variables" replace /> })
const settingsGeneralRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'general', component: SettingsGeneralRouteComponent })
const settingsGlobalVariablesRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'global-variables', component: SettingsGlobalVariablesRouteComponent })
const settingsFunctionsRoute = createRoute({ getParentRoute: () => settingsRoute, path: 'functions', component: SettingsFunctionsRouteComponent })
```

并在 `routeTree` 的 `appRoute.addChildren([...])` 中加入：

```ts
settingsRoute.addChildren([
  settingsIndexRoute,
  settingsGeneralRoute,
  settingsGlobalVariablesRoute,
  settingsFunctionsRoute,
]),
```

## 数据模型

`src/shared/schemas/global-variable.schema.ts`（Zod）+ `src/shared/contracts/global-variable.contract.ts`（类型与 schema 再导出），镜像 `data-source.schema.ts`。

```ts
globalVariableKind = 'single' | 'list'

GlobalVariable {
  id: string
  name: string          // 唯一 key，未来 $引用 用；约束 /^[a-zA-Z_][a-zA-Z0-9_]*$/
  label: string         // 中文显示名
  kind: 'single' | 'list'
  value: string         // kind==='single' 时有效；否则存 ''
  items: string[]       // kind==='list' 时有效；否则存 []
  createdAt: string
  updatedAt: string
}

GlobalVariableDraft { id?, name, label, kind, value, items }
```

- 所有值按字符串存储。
- `name` 全局唯一，save 时校验重名（排除自身 id）。
- schema 校验：`name` 必填且符合正则；`label` 必填；`kind` 枚举；`value`/`items` 不强制按 kind 互斥（前端按 kind 提交对应字段，未用字段保持空）。

## 后端（薄 in-memory mock）

镜像 `server/domains/data-source/`：

- `server/domains/global-variable/global-variable.repository.ts` — `Map` + 2~3 条种子数据：
  - single 示例：`{ name: 'default_page_size', label: '默认分页大小', kind: 'single', value: '20' }`
  - list 示例：`{ name: 'valid_order_status', label: '有效订单状态', kind: 'list', items: ['active', 'frozen', 'closed'] }`
- `server/domains/global-variable/global-variable.service.ts` — `list / get / save / remove`。`save` 校验 name 唯一（重名抛错），更新 `updatedAt`。
- `server/routes/global-variable.route.ts` — `GET /`、`POST /`、`GET /:id`、`PUT /:id`、`DELETE /:id`，用 `zValidator` 校验 draft body。
- [src/server/app.ts](../../../src/server/app.ts) 注册 `.route('/global-variables', globalVariableRoute)`。

## 前端模块 `src/modules/settings/`

```
services/
  global-variable.api.ts                      # hono-client 调用封装
  global-variable-query-keys.ts
hooks/
  use-global-variables-query.ts
  use-save-global-variable.ts                 # mutation → invalidate
  use-delete-global-variable.ts
pages/
  settings-page.tsx                           # 左 settings-nav + <Outlet/> 主从壳
components/
  settings-nav/
    settings-nav.tsx                          # 左侧设置项列表（Link + active 态）
    settings-nav-config.ts                    # 三项：基本设置 general / 全局变量 global-variables / 自定义函数 functions
  placeholder/
    settings-placeholder.tsx                  # 通用「敬请期待」占位（基本设置 / 自定义函数复用）
  global-variables/
    global-variables-section.tsx              # 标题 + 「新建变量」按钮 + 表格 + 弹窗状态
    global-variables-table.tsx                # 列：name / label / 类型徽章 / 值预览 / 操作（编辑·删除）
    global-variable-dialog.tsx                # 新建/编辑表单弹窗（dialog + form）
    global-variable-kind-field.tsx            # single/list 切换控件
    string-list-editor.tsx                    # list 模式：逐行字符串，可增 / 删，提交前过滤空行
    variable-value-preview.tsx                # 表格内值展示：single 直显；list 显示前 N 个 + 「+M」余量
    delete-global-variable-dialog.tsx         # alert-dialog 删除确认
```

### 交互细节

- **新建**：点「新建变量」→ 打开空白弹窗 → 填 name/label，选 kind → single 显示单输入框，list 显示 `string-list-editor` → 保存 → `invalidateQueries`。
- **编辑**：表格行「编辑」→ 弹窗回填 → 保存。`name` 可改但需保持唯一。
- **删除**：表格行「删除」→ `delete-global-variable-dialog` 确认 → mutation。
- **kind 切换**：在弹窗内切换 single↔list，仅切换显示的字段控件；提交时按当前 kind 写 `value` 或 `items`，另一字段提交为空。
- **值预览**：`list` 在表格中展示前若干项，超出以「+M」收尾，避免撑列。

## 测试

- 后端 `global-variable.repository` 的 `save`（新建 / 更新 / 重名拒绝）、`remove` 单测，参照 `data-source.repository.test.ts`。
- 前端逻辑 util 优先：
  - `string-list-editor` 的增 / 删 / 空行过滤逻辑（抽为纯函数便于单测）。
  - `variable-value-preview` 的格式化（前 N 项 + 余量）逻辑。

## 非目标（YAGNI）

- 不实现全局变量在 SQL/API 中的实际引用与参数化绑定（后续）。
- 不做变量分组、描述、数据类型声明、导入导出。
- 基本设置、自定义函数仅占位，无字段与逻辑。
