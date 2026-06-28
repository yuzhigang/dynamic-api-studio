# 数据源管理 `/datasources` — 设计文档

日期：2026-06-28

## 目标

完善 `/datasources` 路由，进入数据源管理界面：左侧数据源列表（默认选中第一个），点击某个数据源进入右侧设置页面（连接配置 + 元数据）。整体镜像现有 `project` 模块的全栈分层。

## 范围决策

- 数据来源：前端 + 薄后端 in-memory mock（镜像 `project` 域）。
- 设置页内容：连接配置表单 + 元数据浏览（两个 Tab）。
- 路由：主从单页 + URL 参数（选中态体现在 URL）。
- 列表操作：完整 CRUD（新建 / 删除 / 编辑保存）。
- 连接表单含「测试连接」按钮（mock）。

## 路由结构

在 [src/app/router.tsx](../../../src/app/router.tsx) 手动注册，与 `projectsRoute` 同构：

```
/datasources                 → 父路由，渲染 <DataSourcePage>（左 Sidebar 常驻 + <Outlet/>）
  index '/'                  → 列表加载后 Navigate 到第一个数据源；空列表显示空状态
  $dataSourceId              → 右侧 <DataSourceDetailPanel>
```

`nav-config.ts` 中 `/datasources` 已存在，无需改动。

## 后端（薄 in-memory mock）

- `src/shared/schemas/data-source.schema.ts` — `dialectSchema`、`dataSourceSchema`、`dataSourceDraftSchema`、`testConnectionResultSchema`。
- `src/shared/contracts/data-source.contract.ts` — 类型与 schema 再导出。
- `src/server/domains/data-source/data-source.repository.ts` — `Map` + 2~3 条种子数据。
- `src/server/domains/data-source/data-source.service.ts` — `list / get / save / remove / testConnection`。
- `src/server/routes/data-source.route.ts` — `GET /`、`POST /`、`GET /:id`、`PUT /:id`、`DELETE /:id`、`POST /:id/test-connection`。
- [src/server/app.ts](../../../src/server/app.ts) 注册 `.route('/datasources', dataSourceRoute)`。

字段：`id, name, dialect, host, port, database, username, password, description, createdAt, updatedAt`。
Draft：`{ id?, name, dialect, host, port, database, username, password, description }`。

dialect 枚举：`postgresql | mysql | oracle | sqlserver | tdengine`。

测试连接：接受 draft body，mock 返回 `{ success, message, latencyMs }`。

元数据 Tab 复用现有 `GET /api/metadata/:id`（`MetadataService`）。

## 前端模块 `src/modules/data-source/`

```
services/   data-source.api.ts、data-source-query-keys.ts
hooks/      use-data-sources-query、use-data-source-query、
            use-save-data-source、use-delete-data-source、use-test-connection
pages/      data-source-page.tsx               # 主从壳
components/
  data-source-list/
    data-source-sidebar.tsx                    # 搜索 + 新建按钮 + 列表
    data-source-list-item.tsx
    data-source-index-redirect.tsx             # index：Navigate 到第一个 / 空状态
  data-source-detail/
    data-source-detail-panel.tsx               # Tabs：连接配置 / 元数据
    connection-config-form.tsx                 # 表单 + 测试连接 + 保存
    data-source-metadata-tab.tsx               # 只读表/字段
  common/
    dialect-badge.tsx
    delete-data-source-dialog.tsx              # alert-dialog 确认
```

新建流程：点「新建数据源」→ save 创建空白数据源 → navigate 到新 id → 右侧空白连接表单等待填写。mutation 成功后 `invalidateQueries`。

## 测试

- 后端 `data-source.repository` 的 `save/remove/testConnection` 编写单测（参照 `project.repository.test.ts`）。
- 前端组件以现有模块为参照，逻辑性 util 单测优先。
