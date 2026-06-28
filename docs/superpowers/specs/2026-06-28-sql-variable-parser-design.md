# SQL 变量解析器设计说明

## 1. 背景与目标

Dynamic API Studio 的 SQL 编辑器允许用户直接输入接近原生的 SQL，并通过平台定义的 `$` 变量引用外部数据。本设计定义 SQL 变量的语法、来源、三种后缀语义、编译期产物和运行时渲染规则。

设计目标：

1. 保持 SQL 自由表达能力，不引入复杂模板语法。
2. 普通值变量必须参数化，禁止字符串拼接。
3. 字段名、排序方向等无法参数化的片段必须通过白名单映射。
4. 支持 `$input` 和 `$` 两个命名空间，明确区分 API 输入参数与全局/项目变量。
5. SQL 中不支持函数调用，函数调用仅保留在 JS 沙箱中。
6. 编译期完成 SQL 解析与校验，生成 `CompiledSqlPlan`；运行期只做轻量渲染。

## 2. 变量语法

### 2.1 命名空间

SQL 中只支持两个变量来源：

| 写法 | 含义 |
|------|------|
| `$input.name` | API 输入参数 |
| `$.name` | 全局变量或项目变量 |

变量名规则：以字母或下划线开头，仅包含字母、数字、下划线，允许通过 `.` 访问对象字段（如 `$input.user.name`）。

`$ctx` 命名空间不再保留，所有上下文变量统一通过 `$` 命名空间暴露（如需要，由平台预先注册为项目/全局变量）。

### 2.2 三种后缀

| 后缀 | 名称 | 语义 | 为空时行为 |
|------|------|------|-----------|
| 无后缀 | required | 必须有值 | 报错，不执行 SQL |
| `?` | optional | 可选 | 删除所在的最小逻辑条件项 |
| `!` | defaulted | 默认变量 | 使用变量定义中的默认值 |

示例：

```sql
SELECT *
FROM order_main om
WHERE 1 = 1
  AND om.region = $.region
  AND om.status IN $input.status?
  AND om.customer_name LIKE %$.customerName?%
  AND om.create_time BETWEEN $input.startTime? AND $input.endTime?
ORDER BY $input.sortField? $input.sortOrder!
LIMIT $input.pageSize!
OFFSET $input.offset!
```

### 2.3 处理优先级

一个最小逻辑条件项中同时存在多种后缀时，按以下顺序处理：

1. 先处理所有 `?` 变量。
2. 只要任意 `?` 变量为空，删除整个最小逻辑条件项。
3. 条件项未被删除时，再处理 `!` 变量，读取默认值。
4. `!` 变量没有默认值则报错。
5. required 变量没有值则报错。

示例：

```sql
ORDER BY $input.sortField? $input.sortOrder!
```

若 `sortField` 为空，整个 `ORDER BY` 子句被删除，`sortOrder` 即使有默认值也不再参与。

## 3. LIKE 语法

为避免用户手动拼接 `%`，支持以下三种写法：

```sql
AND om.customer_name LIKE %$.customerName?%   -- 包含匹配，参数值为 "%value%"
AND om.customer_name LIKE $.customerName?%    -- 前缀匹配，参数值为 "value%"
AND om.customer_name LIKE %$.customerName?    -- 后缀匹配，参数值为 "%value"
```

禁止将变量写在 SQL 字符串引号内：

```sql
-- 错误
AND om.customer_name LIKE '%$.customerName?%'
```

保存或测试时应给出诊断错误。

## 4. IN 数组变量

数组变量可直接用于 `IN` 条件：

```sql
AND om.status IN $input.status?
```

当 `status = ["READY", "RUNNING"]` 时渲染为：

```sql
AND om.status IN (?, ?)
```

参数为数组元素。若数组为空且使用 `?`，删除整个条件项；若使用 required，报错。

## 5. SQL 中不支持函数调用

`$.funcName(args)` 这种函数调用语法**仅在 JS 沙箱中支持**。SQL 解析器遇到 `$.` 后必须是一个普通变量名，不能带括号。

以下写法在 SQL 中非法：

```sql
-- 非法
AND om.amount > $.getMin($input.a, $input.b)
AND om.created_at > $.now()
```

如果用户需要在 SQL 中使用函数结果，应先在 JS 转换步骤中计算，再通过步骤结果变量引用。

## 6. 编译期产物：CompiledSqlPlan

`EnhancedSqlAnalyzer.analyze()` 在编译期产出 `CompiledSqlPlan`：

```ts
type CompiledSqlPlan = {
  /** 编译指纹：增强 SQL 原文 hash + schema hash */
  sourceHash: string
  schemaHash: string
  dialect: SqlDialect

  /** 预处理后的 SQL（变量 → 占位符） */
  processedSql: string

  /** 占位符 → 变量信息映射 */
  varMap: Record<string, VariableInfo>

  /** 预解析的 AST（可序列化存储） */
  ast: SerializedAst

  /** 所有变量引用列表 */
  variableRefs: VariableRef[]

  /** 表别名映射：alias → tableName */
  aliasMap: Record<string, string>

  /** 可选条件项索引 */
  optionalConditions: OptionalConditionIndex[]

  /** 静态校验结果 */
  staticDiagnostics: Diagnostic[]

  /** 依赖引用：上游步骤变量等 */
  references: StepReference[]
}
```

### 6.1 VariableRef

```ts
type VariableSource = 'input' | 'global'

type VariableMode = 'required' | 'optional' | 'defaulted'

type SqlKind = 'value' | 'field' | 'keyword' | 'like-pattern'

type VariableRef = {
  /** 原始文本，如 "$.region?" */
  raw: string

  /** 命名空间 */
  namespace: VariableSource

  /** 变量名或路径，如 "region"、"status"、"user.name" */
  name: string

  /** 不带后缀的完整路径，如 "$.region"、"$input.user.name" */
  fullPath: string

  /** 变量模式 */
  mode: VariableMode

  /** 该变量在 SQL 中扮演的角色 */
  sqlKind: SqlKind

  /** 值类型：string / integer / decimal / boolean / array / object */
  dataType: string

  /** 数组元素类型 */
  itemType?: string

  /** 对应 AST 路径 */
  astPath: string[]

  /** 如果是 field/keyword，x-sql.map 白名单 key */
  xSqlMap?: string
}
```

### 6.2 OptionalConditionIndex

```ts
type OptionalConditionIndex = {
  /** 关联的变量路径，例如 "$.status?" */
  variablePath: string

  /** 条件项在 AST 中的定位路径 */
  astPath: string[]

  /** 条件项类型 */
  conditionType: 'and-condition' | 'or-block' | 'between-expr'

  /** 如果是 BETWEEN，同时关联的另一个变量 */
  siblingVariablePath?: string
}
```

## 7. 运行时渲染：renderFromPlan

API 调用时基于 `CompiledSqlPlan` 做轻量渲染：

```ts
function renderFromPlan(
  plan: CompiledSqlPlan,
  actualParams: {
    input: Record<string, unknown>
    global: Record<string, unknown>
  }
): RenderResult
```

流程：

1. 克隆 AST。
2. 遍历 `optionalConditions`：
   - 普通条件项：关联变量为空则删除。
   - BETWEEN 表达式：任一关联变量为空则删除整个 BETWEEN。
   - OR 块：块内所有 `?` 变量都为空才删除整个块。
3. 清理空括号、多余 AND/OR、空 WHERE。
4. 处理 `!` 默认值：从变量定义中读取 default。
5. 收集参数列表：
   - `value` 类型：参数化绑定。
   - `array` 类型：展开为多个 `?`。
   - `field` / `keyword` 类型：通过 `x-sql.map` 白名单映射为 SQL 片段（非参数化）。
6. `stringifyAst` 输出最终 SQL。

变量解析规则：

```ts
function resolveVariableValue(ref: VariableRef, params) {
  if (ref.namespace === 'input') return params.input[ref.name]
  if (ref.namespace === 'global') return params.global[ref.name]
}
```

## 8. 静态诊断

编译期 `staticDiagnostics` 至少应包括：

- 变量未定义：`$.unknownVar` 在全局/项目变量表中不存在。
- `input` 变量名不存在于 API requestParams schema。
- `!` 变量没有定义默认值。
- `field` / `keyword` 类型变量没有配置 `x-sql.map`。
- 变量写在 SQL 字符串引号内。
- 变量后缀非法（如同时出现 `?!`）。
- SQL 语法错误（由 `node-sql-parser` 抛出）。

## 9. 自动提示（前端 Symbol Store）

前端 `buildSymbolStore` 生成的符号表：

```ts
type SymbolItem = {
  label: string      // "$input.status", "$.region", "$.default_page_size"
  detail: string
  source: 'input' | 'global' | 'step'
}
```

- `$input` 命名空间：从 `requestParams` 展开。
- `$` 命名空间：从全局变量 + 当前项目变量展开。
- `$stepName`：上游步骤结果变量。

CodeMirror 6 补全规则：

- 输入 `$` 时提示命名空间：`$input`、`$.`、以及上游步骤名。
- 输入 `$input.` 时提示 requestParams 字段。
- 输入 `$.` 时提示全局/项目变量。
- SQL 编辑器中不提示函数，因为 SQL 中不支持函数调用。

## 10. 关键变更点

相对于原 design.md：

1. 移除 `$ctx` 命名空间，统一使用 `$`。
2. 全局/项目变量从 `$varName` 改为 `$.varName`。
3. SQL 中明确禁止函数调用，函数调用保留在 JS 沙箱中。
4. 编译期完成所有 SQL 解析与校验。

## 11. 后续工作

本设计定稿后，进入实现计划阶段，重点落地：

1. `EnhancedSqlAnalyzer` 核心：基于 `node-sql-parser` 的解析、变量提取、条件裁剪索引生成。
2. `renderFromPlan` 运行时渲染器。
3. 前端 Symbol Store 与 CodeMirror 6 补全/诊断适配。
4. API 测试接口 `/api/sql/analyze` 与 `/api/sql/test` 联调。
