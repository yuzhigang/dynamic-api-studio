# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dynamic API Studio — 动态 API 平台。面向高级部署人员和实施人员，通过配置方式快速生成跨数据源查询、聚合、转换和服务化 API。

**当前阶段：技术设计完成，准备初始化项目骨架。**

## Primary Artifact

[design.md](design.md) 是完整技术设计文档（~2300 行）。任何实现工作必须以该文档为权威参考。

---

## Tech Stack

| 层 | 技术 |
|---|------|
| 构建 | Vite + `@hono/vite`（Hono 作为 Vite 插件，单进程开发） |
| 语言 | TypeScript（前后端统一） |
| 前端框架 | React 18+ |
| 路由 | TanStack Router（类型安全 SPA 路由） |
| 数据请求 | TanStack Query（服务端状态缓存，query key 管理） |
| 样式 | Tailwind CSS |
| 组件库 | shadcn/ui（基于 Radix UI） |
| SQL 编辑器 | CodeMirror 6（`@codemirror/lang-sql` + `@codemirror/autocomplete` + `@codemirror/lint`） |
| 后端 API | Hono（`@hono/vite` 集成） |
| SQL 解析 | `node-sql-parser`（仅后端，不进入前端 bundle） |
| 数据库访问 | Knex（多数据源连接池，方言感知） |
| Schema 校验 | Zod（前后端共享 schema） |

---

## Commands

```bash
# 开发（前端 + Hono API 同时启动，单端口 :5173）
pnpm dev

# 构建前端
pnpm build

# 构建后端（输出独立 Node 服务）
pnpm build:server

# Lint
pnpm lint

# 类型检查
pnpm typecheck

# 运行测试
pnpm test

# 运行单个测试文件
pnpm test -- --grep <pattern>
```

---

## Project Structure

```
dynamic-api-studio/
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Vite + @hono/vite 插件
├── tailwind.config.ts
├── postcss.config.js
├── index.html                      # SPA 入口
│
├── src/
│   ├── main.tsx                    # React 挂载
│   ├── vite-env.d.ts
│   │
│   ├── app/
│   │   ├── router.tsx              # TanStack Router 路由树
│   │   ├── providers.tsx           # QueryClientProvider + RouterProvider + ErrorBoundary
│   │   ├── query-client.ts         # TanStack Query client 实例
│   │   ├── app-error-boundary.tsx
│   │   └── state/
│   │       ├── app-shell-state.ts
│   │       └── unsaved-changes-state.ts
│   │
│   ├── routes/                     # TanStack Router 文件路由
│   │   ├── __root.tsx
│   │   ├── _app.tsx
│   │   └── _app/
│   │       ├── index.tsx           # → 重定向到 /home
│   │       ├── projects/
│   │       │   ├── index.tsx
│   │       │   ├── list.tsx
│   │       │   ├── create.tsx
│   │       │   └── $apiId/edit.tsx
│   │       ├── data-source/
│   │       │   ├── index.tsx
│   │       │   ├── list.tsx
│   │       │   ├── create.tsx
│   │       │   └── $dataSourceId/edit.tsx
│   │       ├── function-management/
│   │       ├── scheduled-task/
│   │       ├── parameter-management/
│   │       └── log-query/
│   │
│   ├── layouts/
│   │   └── app-shell/
│   │       ├── app-shell.tsx        # 三栏布局容器
│   │       ├── app-sidebar.tsx      # 左侧导航
│   │       ├── app-sidebar-item.tsx
│   │       ├── app-header.tsx       # 顶部操作栏
│   │       ├── app-breadcrumb.tsx
│   │       ├── app-page.tsx
│   │       └── app-nav-config.ts    # 导航菜单配置
│   │
│   ├── modules/                    # 功能模块（pages + components + hooks + services）
│   │   ├── projects/
│   │   │   ├── pages/              # 页面入口（路由引用）
│   │   │   ├── components/
│   │   │   │   ├── list/           # API 列表页组件
│   │   │   │   ├── designer/       # API 设计器核心
│   │   │   │   │   ├── basic-info/
│   │   │   │   │   ├── request-params/
│   │   │   │   │   ├── response-schema/
│   │   │   │   │   ├── workflow/   # 步骤列表 + 步骤卡片（不做可视化图）
│   │   │   │   │   │   ├── workflow-panel.tsx
│   │   │   │   │   │   ├── workflow-step-list.tsx
│   │   │   │   │   │   ├── workflow-step-card.tsx
│   │   │   │   │   │   ├── sql-query-step-card.tsx
│   │   │   │   │   │   ├── js-transform-step-card.tsx
│   │   │   │   │   │   └── ...
│   │   │   │   │   ├── test/       # API 测试面板
│   │   │   │   │   └── common/
│   │   │   │   └── common/
│   │   │   ├── editors/            # CodeMirror 6 封装
│   │   │   │   ├── sql-editor.tsx
│   │   │   │   ├── javascript-editor.tsx
│   │   │   │   ├── json-viewer.tsx
│   │   │   │   └── extensions/     # CM6 扩展（设计文档 Provider 架构）
│   │   │   │       ├── dynamic-variable-completion.ts   # VariableCompletionProvider
│   │   │   │       ├── datasource-schema-completion.ts  # DatabaseMetadataCompletionProvider
│   │   │   │       ├── sql-keyword-completion.ts        # SqlKeywordCompletionProvider
│   │   │   │       ├── variable-token-parser.ts         # 前端正则提取 $变量
│   │   │   │       ├── variable-reference-linter.ts     # Diagnostic LintSource
│   │   │   │       └── variable-reference-tooltip.ts
│   │   │   ├── state/              # designer 专用状态（useReducer pattern）
│   │   │   ├── hooks/
│   │   │   ├── model/              # TypeScript types
│   │   │   ├── schemas/            # Zod schemas
│   │   │   ├── services/           # API client + query keys
│   │   │   ├── utils/              # 变量提取、上下文构建等
│   │   │   └── index.ts
│   │   ├── data-source/
│   │   ├── function-management/
│   │   ├── scheduled-task/
│   │   ├── parameter-management/
│   │   └── log-query/
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 组件（button, card, table, tabs, dialog...）
│   │   ├── data-table/             # 通用数据表格
│   │   ├── tree-table/             # 树形表格（response schema 编辑）
│   │   └── form/                   # 表单组件封装
│   │
│   ├── shared/                     # 前后端共享
│   │   ├── contracts/              # DTO 类型（前后端契约）
│   │   ├── schemas/                # Zod DTO schemas（前端表单 + 后端 zValidator 共用）
│   │   ├── enums/
│   │   ├── types/
│   │   ├── state/                  # 通用状态工具（dirty-state, undo-redo, tree-state...）
│   │   └── utils/
│   │
│   ├── lib/                        # 前端工具
│   │   ├── hono-client.ts          # Hono RPC client（类型安全 API 调用）
│   │   ├── cn.ts                   # clsx + tailwind-merge
│   │   ├── id.ts
│   │   ├── env.ts
│   │   ├── storage.ts
│   │   └── logger.ts
│   │
│   ├── server/                     # 后端（Hono + Kysely 平台库 + Knex 业务库）
│   │   ├── app.ts                  # Hono 实例，注册路由 + 中间件
│   │   ├── index.ts                # @hono/vite 入口（dev）
│   │   ├── node.ts                 # @hono/node-server 生产入口（build:server）
│   │   ├── context.ts              # Hono Context 扩展（AppBindings：requestId 等）
│   │   │
│   │   ├── routes/                 # Hono 路由（薄层，调用 domain service）
│   │   │   ├── api-definition.route.ts
│   │   │   ├── data-source.route.ts   # 含 /:dataSourceId/schema（数据源 schema）
│   │   │   ├── sql-analyze.route.ts    # POST /api/sql/analyze（编辑器分析）
│   │   │   ├── api-test.route.ts       # POST /api/sql/test（测试执行）
│   │   │   └── ...                      # 其余：global-variable / health / home-overview / project(-api/-variable) / sql-test / task
│   │   │
│   │   ├── analyzer/               # EnhancedSqlAnalyzer（设计文档 §20，跨域横向能力）
│   │   │   ├── parser-wrapper.ts   # node-sql-parser 实例管理 + 方言配置
│   │   │   ├── variable-extractor.ts   # AST → 变量引用列表
│   │   │   ├── condition-cutter.ts     # AST → $var? 条件裁剪
│   │   │   ├── alias-resolver.ts       # AST → 表别名映射
│   │   │   ├── clause-detector.ts      # 光标位置 → 子句类型
│   │   │   ├── reference-extractor.ts  # AST → 步骤间依赖引用
│   │   │   ├── ast-variable-locator.ts # AST → 变量位置区间（AstVariableLocation）
│   │   │   ├── render-from-plan.ts     # CompiledSqlPlan → 参数化 SQL（SQL Renderer）
│   │   │   ├── validator.ts            # 变量合法性校验
│   │   │   ├── types.ts                # analyzer 共享类型（CompiledSqlPlan / VariableInfo 等）
│   │   │   └── index.ts
│   │   │
│   │   ├── expression/             # 表达式求值（local 变量依赖图 + 沙箱求值）
│   │   │   ├── dependency-graph.ts     # local 变量表达式 → 依赖图
│   │   │   └── expression-evaluator.ts # 沙箱内执行表达式（input/global/local 求值）
│   │   │
│   │   ├── workflow/                    # 执行引擎（可复用，被试运行与发布态调用复用）
│   │   │   ├── workflow-runner.ts       # 编排循环 + 写事务 + assemble
│   │   │   ├── variable-context-builder.ts
│   │   │   ├── variable-binder.ts       # 提取 {input,global,local} 原始值
│   │   │   ├── input-validator.ts       # 按 requestParams 校验输入
│   │   │   ├── global-variable-loader.ts
│   │   │   ├── datasource-config.ts     # DataSource → Knex 配置 + 方言映射
│   │   │   ├── normalize-result.ts      # knex.raw 结果归一化
│   │   │   ├── plan-cache.ts            # CompiledSqlPlan LRU
│   │   │   ├── transaction-manager.ts
│   │   │   ├── sql-executor.ts
│   │   │   ├── js-transform-executor.ts
│   │   │   ├── result-assembler.ts
│   │   │   └── workflow-symbols.ts
│   │   │
│   │   ├── domains/                # 业务领域（service / repository）
│   │   │   ├── api-definition/
│   │   │   ├── data-source/
│   │   │   │   ├── data-source.repository.ts   # Kysely 持久化
│   │   │   │   ├── data-source.service.ts
│   │   │   │   └── data-source-schema.service.ts  # 数据源 schema（mock；未来真探测落 db_schema）
│   │   │   ├── api-runtime/             # 发布态运行时（Part B）
│   │   │   │   ├── published-router.ts  # 可热替换内层 OpenAPIHono + rebuild + /api/openapi
│   │   │   │   ├── definition-to-openapi.ts
│   │   │   │   ├── live-handler.ts
│   │   │   │   └── runtime-wiring.ts    # 共享 deps/services/repository + initPublishedRuntime
│   │   │   ├── api-test/
│   │   │   │   └── api-test.service.ts
│   │   │   ├── auth/                    # 鉴权（身份 + 授权）
│   │   │   │   ├── user.repository.ts   # 内存 seed 用户
│   │   │   │   ├── auth-session.store.ts
│   │   │   │   ├── auth-guard.ts        # authorize 401/403/放行
│   │   │   │   ├── auth.route.ts        # POST /api/auth/login
│   │   │   │   └── auth.contract.ts     # AuthDeps 缝 + login schema
│   │   │   ├── global-variable/         # 全局变量（scope=global）
│   │   │   ├── project/                 # 项目分组
│   │   │   ├── project-variable/        # 项目变量（scope=project）
│   │   │   └── scheduled-task/          # 定时任务
│   │   │
│   │   └── infra/
│   │   │   ├── db/                            # 平台元数据库（Kysely + PostgreSQL）
│   │   │   │   ├── config.ts                  # 连接配置：.env 读取 + 校验
│   │   │   │   ├── tables.ts                  # Kysely Database 类型（10 张表列定义）
│   │   │   │   ├── db.ts                      # platformDb 单例（惰性连接池）
│   │   │   │   ├── migrate.ts                 # 迁移运行器：up / status / rollback / make
│   │   │   │   └── migrations/                # Kysely 迁移（平台表）
│   │   │   ├── knex/
│   │   │   │   └── knex-registry.ts           # 业务数据源多方言连接池（按 dataSourceId）
│   │   │   └── errors/
│   │   │       └── http-error.ts              # HttpError 类（带 HTTP 状态码）
│   │
│   ├── styles/
│   │   ├── globals.css              # Tailwind 指令 + shadcn CSS 变量
│   │   └── codemirror.css           # CM6 编辑器样式
│   │
│   └── assets/
│       ├── logo.svg
│       └── icons/
```

---

## Key Architecture Decisions

### 增强 SQL 与安全模型

用户直接输入 SQL，支持三种 `$变量`：`$var`（必填）、`$var?`（为空删条件项）、`$var!`（默认值取自 JSON Schema）。变量**不做字符串替换**，普通值一律参数化（`?` + params 数组），字段名/关键字通过 `x-sql.map` 白名单映射。详见 design.md §3-§9。

### SQL 解析：后端 AST + 前端轻量

- **后端**：`node-sql-parser` 仅在 Node.js 运行。`server/analyzer/` 封装为 `EnhancedSqlAnalyzer`，提供 parse / trimConditions / validate / stringify / compilePlan / renderFromPlan
- **前端**：`@codemirror/lang-sql` 的 Lezer grammar 提供本地 token 类型；正则提取 `$变量` 模式匹配驱动即时补全；通过 `POST /api/sql/analyze`（debounce 300ms）获取后端权威 AST 分析
- **编译缓存**：步骤保存时预编译为 `CompiledSqlPlan`，API 调用时基于 Plan 轻量渲染（跳过重复 parse）。详见 design.md §9.3

### 执行引擎 (Workflow Engine)

执行引擎位于 `server/workflow/`，被试运行面板与（未来）发布态调度共用同一 `runWorkflow` 编排入口。

### 数据库访问：Kysely（平台元数据）+ Knex（业务数据源）

- 平台自身元数据（project/api/datasource/variable/function/log 等）用 **Kysely** + PostgreSQL 持久化，见 `server/infra/db/`（`platformDb` 单例 + Kysely 迁移，`pnpm db:migrate`）
- 用户业务数据源用 **Knex**：`server/infra/knex/knex-registry.ts` 按 `dataSourceId` 管理多个 Knex 实例
- 每个实例配置对应方言（`pg` / `mysql2` / `oracledb` / `mssql`）
- SQL Renderer 统一输出 `?` 占位符 + params 数组，Knex 自动转换方言占位符
- 元数据探测（`database-introspector.ts`）优先使用 Knex 查询 `information_schema`

### dialect 处理

- 步骤配置使用小写：`"postgresql"`, `"mysql"`, `"oracle"`, `"sqlserver"`
- `parser-wrapper.ts` 内部转为 `node-sql-parser` 要求的 PascalCase：`PostgreSQL`, `MySQL`, `TransactSQL`
- Knex client 选择：`postgresql` → `pg`，`mysql` → `mysql2`，`sqlserver` → `mssql`
- 方言占位符差异由 Knex 处理，S​QL Renderer 无需关心

### CodeMirror 6 补全架构

Provider 注册机制（design.md §10.2）：
- `dynamic-variable-completion.ts` — VariableCompletionProvider
- `datasource-schema-completion.ts` — DatabaseMetadataCompletionProvider
- `sql-keyword-completion.ts` — SqlKeywordCompletionProvider
- Alias 补全由 CM6 Lezer grammar 的 `alias.identifier` token 本地判断

### 状态管理

- 服务端数据：TanStack Query（`useQuery` / `useMutation`），query keys 按模块定义在 `services/query-keys.ts`
- 编辑器草稿状态：`modules/projects/state/` 使用 `useReducer` 管理 designer 表单状态
- 跨模块共享状态：`shared/state/` 提供通用工具（dirty-check、undo-redo、tree-manipulation）

---

## First Version Scope

按 design.md §22，优先实现：

- SQL 编辑器核心：CM6 集成 + 变量补全 + 诊断标红 + 预览面板
- `POST /api/sql/analyze` + `POST /api/sql/test`
- `EnhancedSqlAnalyzer` + `CompiledSqlPlan` 编译缓存
- API 管理 CRUD + 数据源管理 CRUD
- 其他模块（function、scheduled-task 等）仅骨架页面
