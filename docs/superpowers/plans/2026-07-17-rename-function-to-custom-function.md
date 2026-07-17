# Rename `function` table to `custom_function` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将平台元数据库的 `function` 表重命名为 `custom_function`，并同步字段名变更（新增 `scope`、`params` → `inputSchema`、`return_type` → `outputSchema`）。

**Architecture:** 通过追加新的 Kysely 迁移（`0005`）对已应用 schema 做安全变更；同步更新 `tables.ts` 中的 Kysely 类型定义与 `db-model.md` 文档；历史迁移 `0001_initial_schema.ts` 保持不动，避免破坏已执行迁移记录。

**Tech Stack:** TypeScript, Kysely, PostgreSQL

## Global Constraints

- 不修改已应用的迁移文件（`0001_initial_schema.ts` 保持原样）。
- 所有 schema 变更通过新的迁移文件追加。
- `tables.ts` 类型定义必须与新 schema 完全一致。
- 迁移 `up/down` 必须对称可回滚。
- 本次迁移只处理 PG 方言（平台元数据库固定为 PostgreSQL）。

---

### Task 1: 更新 `db-model.md` 文档

**Files:**
- Modify: `db-model.md:50-75`（表清单与 ER 图）
- Modify: `db-model.md:306-323`（第 8 章字段表）

**Interfaces:**
- Consumes: 当前文档中 `function` 表的描述
- Produces: 文档中 `custom_function` 表的描述，字段为 `scope` / `inputSchema` / `outputSchema`

- [ ] **Step 1: 更新 ER 图与表清单**

  将 `project 0..1───* function` 改为 `project 0..1───* custom_function`。

  将表清单中第 7 行：
  ```markdown
  | 7 | `function` | 可复用函数 | ✓ |
  ```
  改为：
  ```markdown
  | 7 | `custom_function` | 可复用函数 | ✓ |
  ```

- [ ] **Step 2: 更新第 8 章表名与字段**

  将章节标题：
  ```markdown
  ## 8. function — 可复用函数
  ```
  改为：
  ```markdown
  ## 8. custom_function — 可复用函数
  ```

  在字段表中新增 `scope` 行，并修改 `params` / `return_type`：
  ```markdown
  | `scope` | VARCHAR(16) | NOT NULL | `global` \| `project` |
  | `inputSchema` | JSON | NULL | 形参定义数组 |
  | `body` | TEXT | NOT NULL | 函数体/脚本 |
  | `outputSchema` | JSON | NULL | 返回类型标注 |
  ```

- [ ] **Step 3: 验证文档无残留旧表名**

  Run: `rtk grep "^| 7 | \`function\`" db-model.md`
  Expected: 无匹配。

  Run: `rtk grep "## 8\. function" db-model.md`
  Expected: 无匹配。

---

### Task 2: 创建迁移 `0005_rename_function_to_custom_function.ts`

**Files:**
- Create: `src/server/infra/db/migrations/0005_rename_function_to_custom_function.ts`

**Interfaces:**
- Consumes: 现有表 `function`（含索引 `function_project_id_idx`、`function_project_name_uidx`、`function_deleted_at_idx`）
- Produces: 新表 `custom_function`（含索引 `custom_function_project_id_idx`、`custom_function_project_name_uidx`、`custom_function_deleted_at_idx`），列 `scope` / `inputSchema` / `outputSchema`

- [ ] **Step 1: 创建迁移文件**

  ```bash
  pnpm db:migrate:make rename_function_to_custom_function
  ```

  Expected output 包含：`已创建迁移文件：src/server/infra/db/migrations/2026..._rename_function_to_custom_function.ts`

- [ ] **Step 2: 将时间戳文件名重命名为顺序名 `0005_rename_function_to_custom_function.ts`**

  Kysely `FileMigrationProvider` 按文件名排序，平台约定使用四位序号前缀。

  Run:
  ```bash
  mv src/server/infra/db/migrations/2026*_rename_function_to_custom_function.ts src/server/infra/db/migrations/0005_rename_function_to_custom_function.ts
  ```

- [ ] **Step 3: 实现 `up` 迁移**

  替换模板内容为：
  ```typescript
  import type { Kysely } from 'kysely'

  /**
   * function → custom_function 重命名，并同步字段：
   *  - 新增 `scope`（global | project）
   *  - `params` → `inputSchema`
   *  - `return_type` → `outputSchema`
   * 同时重命名索引以匹配新表名。
   */
  export async function up(db: Kysely<any>): Promise<void> {
    // 1. 重命名表
    await db.schema.alterTable('function').renameTo('custom_function').execute()

    // 2. 新增 scope 列（先给默认值以兼容旧行，再 drop default 对齐 NOT NULL 无默认值）
    await db.schema
      .alterTable('custom_function')
      .addColumn('scope', 'varchar(16)', (c) => c.notNull().defaultTo('project'))
      .execute()
    await db.schema
      .alterTable('custom_function')
      .alterColumn('scope', (c) => c.dropDefault())
      .execute()

    // 3. 重命名字段
    await db.schema
      .alterTable('custom_function')
      .renameColumn('params', 'inputSchema')
      .execute()
    await db.schema
      .alterTable('custom_function')
      .renameColumn('return_type', 'outputSchema')
      .execute()

    // 4. 重命名索引
    await db.schema.dropIndex('function_project_id_idx').ifExists().execute()
    await db.schema
      .createIndex('custom_function_project_id_idx')
      .on('custom_function')
      .column('project_id')
      .execute()

    await db.schema.dropIndex('function_project_name_uidx').ifExists().execute()
    await db.schema
      .createIndex('custom_function_project_name_uidx')
      .on('custom_function')
      .columns(['project_id', 'name'])
      .unique()
      .execute()

    await db.schema.dropIndex('function_deleted_at_idx').ifExists().execute()
    await db.schema
      .createIndex('custom_function_deleted_at_idx')
      .on('custom_function')
      .column('deleted_at')
      .execute()
  }
  ```

- [ ] **Step 4: 实现 `down` 迁移**

  在 `up` 同一文件内追加：
  ```typescript
  export async function down(db: Kysely<any>): Promise<void> {
    // 1. 恢复索引名
    await db.schema.dropIndex('custom_function_deleted_at_idx').ifExists().execute()
    await db.schema
      .createIndex('function_deleted_at_idx')
      .on('custom_function')
      .column('deleted_at')
      .execute()

    await db.schema.dropIndex('custom_function_project_name_uidx').ifExists().execute()
    await db.schema
      .createIndex('function_project_name_uidx')
      .on('custom_function')
      .columns(['project_id', 'name'])
      .unique()
      .execute()

    await db.schema.dropIndex('custom_function_project_id_idx').ifExists().execute()
    await db.schema
      .createIndex('function_project_id_idx')
      .on('custom_function')
      .column('project_id')
      .execute()

    // 2. 恢复字段名
    await db.schema
      .alterTable('custom_function')
      .renameColumn('outputSchema', 'return_type')
      .execute()
    await db.schema
      .alterTable('custom_function')
      .renameColumn('inputSchema', 'params')
      .execute()

    // 3. 删除 scope 列
    await db.schema.alterTable('custom_function').dropColumn('scope').execute()

    // 4. 恢复表名
    await db.schema.alterTable('custom_function').renameTo('function').execute()
  }
  ```

- [ ] **Step 5: 验证迁移文件类型检查通过**

  Run: `pnpm typecheck`
  Expected: 无错误。

---

### Task 3: 更新 `tables.ts` 类型定义

**Files:**
- Modify: `src/server/infra/db/tables.ts:55`（注释）
- Modify: `src/server/infra/db/tables.ts:164-175`（接口定义）
- Modify: `src/server/infra/db/tables.ts:235`（Database 接口）

**Interfaces:**
- Consumes: 新表 `custom_function` 的 schema
- Produces: `CustomFunctionTable` 类型与 `Database.custom_function` 键

- [ ] **Step 1: 重命名接口并更新字段**

  将：
  ```typescript
  /** 7. function — 可复用函数。 */
  export interface FunctionTable extends AuditColumns {
    id: string
    project_id: string | null
    name: string
    label: string | null
    language: Generated<string>
    params: unknown[] | null
    body: string
    return_type: string | null
    description: string | null
  }
  ```
  改为：
  ```typescript
  /** 7. custom_function — 可复用函数。 */
  export interface CustomFunctionTable extends AuditColumns {
    id: string
    project_id: string | null
    scope: 'global' | 'project'
    name: string
    label: string | null
    language: Generated<string>
    inputSchema: unknown[] | null
    body: string
    outputSchema: unknown[] | null
    description: string | null
  }
  ```

- [ ] **Step 2: 更新 Database 接口**

  将：
  ```typescript
  function: FunctionTable
  ```
  改为：
  ```typescript
  custom_function: CustomFunctionTable
  ```

- [ ] **Step 3: 更新 AuditColumns 注释**

  将第 55 行注释：
  ```typescript
  /** 公共审计字段（project / api / json_schema / db_source / variable / function / schedule_task）。 */
  ```
  改为：
  ```typescript
  /** 公共审计字段（project / api / json_schema / db_source / variable / custom_function / schedule_task）。 */
  ```

- [ ] **Step 4: 验证类型检查**

  Run: `pnpm typecheck`
  Expected: 无错误。

---

### Task 4: 运行数据库迁移验证

**Files:**
- 无新文件（只验证数据库状态）

**Interfaces:**
- Consumes: 已创建并加载的迁移文件 `0005_rename_function_to_custom_function.ts`
- Produces: 数据库中 `custom_function` 表结构与 `function` 表不再存在

- [ ] **Step 1: 确认 PostgreSQL 可连接**

  Run: `pnpm db:migrate status`
  Expected: 看到前 4 个迁移为 `[已执行]`，`0005_rename_function_to_custom_function` 为 `[待执行]`。

- [ ] **Step 2: 执行迁移**

  Run: `pnpm db:migrate up`
  Expected: `✓ 0005_rename_function_to_custom_function`

- [ ] **Step 3: 检查表结构**

  使用 psql 或任意 PG 客户端执行：
  ```sql
  \dt custom_function
  \d custom_function
  ```
  Expected:
  - 表 `custom_function` 存在
  - 列包含 `id`, `project_id`, `scope`, `name`, `label`, `language`, `inputSchema`, `body`, `outputSchema`, `description`, 审计字段
  - 索引包含 `custom_function_project_id_idx`, `custom_function_project_name_uidx`, `custom_function_deleted_at_idx`
  - 旧表 `function` 不存在

---

### Task 5: 运行全量验证

**Files:**
- 无新文件

- [ ] **Step 1: 类型检查**

  Run: `pnpm typecheck`
  Expected: 无错误。

- [ ] **Step 2: 运行测试**

  Run: `pnpm test`
  Expected: 全部通过。

- [ ] **Step 3: Lint 检查**

  Run: `pnpm lint`
  Expected: 无错误。

---

## Self-Review

**1. Spec coverage:**
- 表名 `function` → `custom_function`：Task 2（迁移）、Task 3（类型）、Task 1（文档）。
- 新增 `scope`：Task 2、Task 3、Task 1。
- `params` → `inputSchema`：Task 2、Task 3、Task 1。
- `return_type` → `outputSchema`：Task 2、Task 3、Task 1。
- 不修改已应用迁移：明确列为 Global Constraint，Task 2 只创建 `0005`。
- 无 gaps。

**2. Placeholder scan:**
- 无 TODO/TBD。
- 所有步骤包含实际代码或命令。

**3. Type consistency:**
- `CustomFunctionTable` 与迁移后 schema 一致。
- `Database.custom_function` 键名一致。
