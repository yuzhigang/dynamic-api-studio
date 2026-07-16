# Dynamic API Studio

面向高级部署人员与实施人员的**动态 API 配置平台**。通过配置方式快速生成跨数据源查询、聚合、转换与服务化 API —— 用户直接编写接近原生 SQL 的「增强 SQL」，平台负责变量识别、自动提示、依赖校验、安全渲染与参数绑定，最终生成可安全执行的数据库 SQL。

完整技术设计见 [design.md](design.md)，平台元数据库表结构见 [db-model.md](db-model.md)。

---

## 核心特性

- **SQL 优先，不做结构化表单**：用户直接输入完整 SQL，仅扩展三种 `$变量` 语义：
  - `$var` — 必填变量，无值即报错
  - `$var?` — 可选变量，为空时删除其所在最小逻辑条件项
  - `$var!` — 默认变量，为空时取 JSON Schema 中定义的 `default`
- **安全渲染，不做字符串替换**：普通值一律参数化（`?` + params 数组），字段名 / 排序方向等无法参数化的片段通过 `x-sql.map` 白名单映射。变量分三个作用域：`$input.*`（查询参数）、`$.xxx`（全局 / 项目变量）、`$xxx`（API 内部变量与上游步骤输出）。
- **增强 SQL 分析器**：后端基于 `node-sql-parser` AST 提供 parse / 条件裁剪 / 校验 / 编译计划 / 渲染；前端基于 CodeMirror 6 Lezer token + 正则提取 `$变量` 做即时补全与诊断，通过 `POST /api/sql/analyze`（debounce）获取后端权威分析。
- **工作流执行引擎**：多步骤编排（SQL 查询步骤 + JS 转换步骤 + assemble 汇总步骤），支持步骤条件、local 变量表达式求值、跨数据源写保护、写事务。试运行面板与发布态调度共用同一 `runWorkflow` 入口。
- **多数据源、多方言**：业务数据源用 Knex 按 `dataSourceId` 管理多方言连接池（`pg` / `mysql2` / `oracledb` / `mssql`），SQL Renderer 统一输出 `?` 占位符，由 Knex 自动转方言。
- **数据源 Schema 探测**：基于 `knex-schema-inspector` 跨方言探测表 / 列 / 外键结构，结果写入 `db_schema` 缓存表（TTL 10 分钟），驱动 SQL 编辑器对表名 / 列名的自动补全。
- **发布态运行时**：从平台库读取 API 定义并编译为可热替换的 OpenAPI Hono 内层路由，首次分发时懒加载构建（不触发模块加载期 DB 连接，保持离线 import 安全）。
- **鉴权**：`POST /api/auth/login` 颁发 opaque token，发布态按 `requireAuth` 自动加 401/403 + bearer 安全约束。

---

## 技术栈

| 层 | 技术 |
| --- | ------ |
| 构建 | Vite + `@hono/vite`（Hono 作为 Vite 插件，单进程开发，单端口 :5173） |
| 语言 | TypeScript（前后端统一） |
| 前端框架 | React 18+ |
| 路由 | TanStack Router（文件路由，类型安全 SPA） |
| 服务端状态 | TanStack Query |
| 样式 | Tailwind CSS |
| 组件库 | shadcn/ui（基于 Radix UI） |
| SQL 编辑器 | CodeMirror 6（`@codemirror/lang-sql` + autocomplete + lint） |
| 后端 API | Hono |
| SQL 解析 | `node-sql-parser`（仅后端） |
| 平台元数据库 | Kysely + PostgreSQL |
| 业务数据源 | Knex（多方言连接池） |
| Schema 探测 | knex-schema-inspector |
| Schema 校验 | Zod（前后端共享） |

---

## 快速开始

### 前置要求

- Node.js 20+
- pnpm 9+
- PostgreSQL（平台元数据库）

### 步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 配置平台元数据库连接
cp .env.example .env
#   编辑 .env，填入 PLATFORM_DB_*（.env 已被 git 忽略，不会提交）

# 3. 运行数据库迁移（创建 10 张平台表）
pnpm db:migrate

# 4. （可选）灌入演示数据
pnpm db:seed

# 5. 启动开发服务（前端 + Hono API 同端口 :5173）
pnpm dev
```

打开 <http://localhost:5173> ，默认进入首页概览。左侧导航：首页、项目管理、定时任务、数据源管理、调用日志、系统设置。

---

## 命令一览

```bash
pnpm dev                 # 开发（前端 + Hono API，单端口 :5173）
pnpm build               # 构建前端
pnpm build:server        # 构建后端（输出独立 Node 服务到 dist/server）

pnpm lint                # ESLint
pnpm typecheck           # tsc 类型检查（前后端）
pnpm test                # vitest 全量测试
pnpm test -- --grep <p>  # 运行匹配的单个测试

pnpm db:migrate           # 迁移 up
pnpm db:migrate:status   # 查看迁移状态
pnpm db:migrate:rollback  # 回滚最近一次迁移
pnpm db:migrate:make      # 生成新迁移文件骨架
pnpm db:seed              # 灌入演示数据（幂等 upsert）
```

---

## 项目结构

```text
src/
├── main.tsx                  # React 挂载
├── app/                      # 路由树 / providers / query client / error boundary
├── routes/                   # TanStack Router 文件路由
│   └── _app/                 # 首页 / projects / tasks / datasources / invocation-logs / settings
├── layouts/app-shell/       # 三栏布局（sidebar / header / breadcrumb / page）
├── modules/                  # 功能模块（pages + components + hooks + services）
│   ├── project-management/   #   项目 + API 设计器（步骤编排 / 测试 / 变量 / 日志）
│   ├── scheduled-task/
│   ├── invocation-log/
│   └── home/
├── components/
│   ├── ui/                   # shadcn/ui 组件
│   ├── data-table/
│   └── form/
├── shared/                   # 前后端共享：contracts / schemas / enums / types / utils
├── lib/                      # 前端工具（hono-client / cn / id / env / storage）
└── server/                   # 后端（Hono + Kysely 平台库 + Knex 业务库）
    ├── app.ts                # Hono 实例，注册路由 + 中间件 + 发布态懒加载分发
    ├── routes/               # 薄路由（health / home / projects / datasources / sql / tasks / auth）
    ├── analyzer/              # EnhancedSqlAnalyzer（AST → 变量 / 条件 / 别名 / 计划 / 渲染）
    ├── expression/            # local 变量依赖图 + 沙箱求值
    ├── workflow/              # 执行引擎（编排 / 变量上下文 / 输入校验 / SQL & JS 执行 / 事务 / assemble）
    ├── domains/               # 业务领域（service / repository）
    │   ├── api-definition/  data-source/  api-runtime/
    │   ├── api-test/  auth/  global-variable/  project(-variable)/  scheduled-task/
    │   └── invocation-log/
    └── infra/
        ├── db/               # 平台元数据库（Kysely + PostgreSQL）：config / tables / db / migrate / seed / migrations
        ├── knex/             # 业务数据源多方言连接池（knex-registry）
        └── errors/           # HttpError
```

---

## 架构要点

### 增强 SQL 与安全模型

用户直接输入 SQL，支持三种 `$变量`。变量**不做字符串替换**：普通值参数化（`?` + params），字段名 / 关键字通过 `x-sql.map` 白名单映射。详见 design.md §3–§9。

- **后端**：`node-sql-parser` 封装为 `EnhancedSqlAnalyzer`，提供 parse / trimConditions / validate / compilePlan / renderFromPlan。
- **前端**：CM6 Lezer grammar 提供本地 token；正则提取 `$变量` 驱动即时补全；`POST /api/sql/analyze`（debounce 300ms）获取后端权威分析。
- **编译缓存**：步骤保存时预编译为 `CompiledSqlPlan`，调用时基于 Plan 轻量渲染（跳过重复 parse）。

### 数据库访问：Kysely（平台元数据）+ Knex（业务数据源）

- **平台自身元数据**（project / api / datasource / variable / function / log 等）用 **Kysely** + PostgreSQL 持久化，见 `server/infra/db/`（`platformDb` 单例 + Kysely 迁移）。
- **用户业务数据源**用 **Knex**：`server/infra/knex/knex-registry.ts` 按 `dataSourceId` 管理多方言实例，SQL Renderer 统一输出 `?` 占位符，Knex 自动转方言占位符。
- 步骤配置中方言统一小写（`postgresql` / `mysql` / `oracle` / `sqlserver` / `tdengine`），内部按需转 PascalCase 与 Knex client。

### 执行引擎

`server/workflow/` 中的 `runWorkflow` 是唯一编排入口，被试运行面板与发布态调度复用：输入校验 → 变量上下文构建 → 步骤分类（read/write）→ 写步骤同数据源约束 + 事务开启 → 逐步执行（SQL 走参数化渲染、JS 走沙箱求值）→ 写步骤统一提交 / 失败回滚 → assemble 汇总响应。

### 数据源 Schema 探测

`server/domains/data-source/` 中：`database-introspector.ts` 基于 `knex-schema-inspector` 跨方言探测；`data-source-schema.service.ts` 读 `db_schema` 缓存表并按 TTL（10 分钟）判断新鲜度，过期则重新探测并全量刷新（delete + insert）。前端 `GET /api/datasources/:id/schema` 取该结构，驱动 SQL 编辑器对表 / 列名的自动补全。

### 发布态运行时

`server/domains/api-runtime/` 中：`published-router.ts` 维护可热替换的内层 `OpenAPIHono`，`runtime-wiring.ts` 用 `platformDb` 注入全部 repository 并幂等构建发布态路由。`app.ts` 的 catch-all 在首次未匹配分发时 `await initPublishedRuntime()` 懒加载，避免模块加载期触发 DB 连接。

---

## 数据库

平台自有元数据库共 10 张表，权威设计见 [db-model.md](db-model.md)：

| 表 | 作用 | 软删除 |
| --- | --- | :---: |
| `project` | 项目分组 | ✓ |
| `api` | API 定义（工作流步骤内嵌 JSON） | ✓ |
| `json_schema` | 可复用 JSON Schema 库 | ✓ |
| `db_source` | 业务数据源连接配置 | ✓ |
| `db_schema` | 数据源 schema 缓存（表 / 列 / 外键 / 索引） | ✗ |
| `variable` | 变量（scope=global / project） | ✓ |
| `function` | 可复用函数 | ✓ |
| `api_invocation_log` | API 调用日志（kind 区分 test / invoke） | ✗ |
| `schedule_task` | 定时任务 | ✓ |
| `schedule_task_log` | 定时任务执行日志 | ✗ |

迁移文件位于 `src/server/infra/db/migrations/`。

---

## 相关文档

- [design.md](design.md) — 完整技术设计（~2300 行，权威参考）
- [db-model.md](db-model.md) — 平台元数据库表结构设计
- [CLAUDE.md](CLAUDE.md) — 给 Claude Code 的项目导航与约定
