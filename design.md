# 动态 API 增强 SQL 编辑器与自动提示技术设计说明

## 1. 背景

动态 API 平台面向高级部署人员、实施人员和内部技术人员，目标是通过配置方式快速生成跨数据源查询、聚合、转换和服务化 API。

平台不采用结构化查询构造器作为主路径，也不要求用户填写大量字段、条件、操作符、连接符等表单项。核心设计原则是：**SQL 必须由用户直接输入**。用户输入的是一条接近原生 SQL 的语句，但允许在 SQL 中使用平台定义的 `$` 变量。

示例：

```sql
SELECT *
FROM order_main om
WHERE 1 = 1
AND om.status IN $input.status?
AND om.customer_name LIKE %$input.customerName?%
AND om.create_time BETWEEN $input.startTime? AND $input.endTime?
ORDER BY $input.sortField? $input.sortOrder!
LIMIT $input.pageSize!
OFFSET $input.offset!
```

平台负责对这类增强 SQL 进行语法扫描、变量识别、自动提示、依赖校验、安全渲染和参数绑定，最终生成可安全执行的数据库 SQL。

该设计不是通用模板引擎，不支持 `{{ }}`、`if / endif`、`for` 等复杂模板语法。平台只扩展三种变量使用方式：

```text
$var     原生变量，必须有值
$var?    可选变量，为空时删除当前最小逻辑条件项
$var!    默认变量，为空时使用变量定义中的默认值
```

三种后缀语义在所有作用域上统一生效。变量按作用域分为三类，对应不同来源：

```text
$input.xxx   input 作用域   API 查询参数
$.xxx        global 作用域  平台/项目全局变量和函数
$xxx         local 作用域   API 内部变量（设计时变量 + 前置步骤输出）
```

`local` 作用域变量有两个来源：API 设计时定义的局部变量（可赋常量或 JS 表达式），以及前置步骤的 `outputVariable` 输出。两者共用 `$xxx` 语法，但禁止同名。

数组属性访问用于 IN 子句展开，例如 `$orders[].id` 表示取 `orders` 数组每个元素的 `id`，渲染为 `IN (?, ?, ?)`。后缀可与数组属性组合：`$orders?[].id`、`$orders![]?.id`。

## 2. 设计目标

本设计需要同时满足以下目标：

1. 用户直接输入 SQL，保持 SQL 的自由表达能力。
2. 不引入复杂模板语法。
3. 用户不需要手动判断变量是否加引号。
4. 用户不需要手动拼接 LIKE 中的 `%`。
5. 用户不需要手动展开 IN 数组参数。
6. 支持 API 输入参数、上下文变量、全局变量、上游步骤输出变量的自动提示。
7. 支持未来对每个数据源的数据库、Schema、表、视图、字段等元数据提示。
8. 支持上游步骤变量结构变化后，下游自动提示和诊断同步更新。
9. 支持基于 JSON Schema 的变量定义、类型校验、默认值、枚举和说明。
10. 支持 SQL 渲染为安全 SQL，并生成数据库查询参数列表。
11. 普通值变量必须参数化，不能直接字符串拼接。
12. 字段名、排序方向等无法参数化的 SQL 片段必须通过白名单映射。
13. CodeMirror 6 只负责编辑器交互，变量动态性、依赖分析和安全渲染由平台服务完成。

## 3. 总体设计原则

### 3.1 SQL 是用户输入的增强 SQL

平台不把 SQL 拆成结构化表单，也不要求用户通过条件构造器配置查询。用户直接输入完整 SQL。

增强点只包括：

```text
$变量
$变量?
$变量!
LIKE %$变量?%
LIKE $变量?%
LIKE %$变量?
```

平台不支持复杂模板块：

```sql
-- if $input.status
AND om.status IN ($input.status)
-- endif
```

也不支持：

```sql
{{ if input.status }}
AND om.status IN (...)
{{ endif }}
```

### 3.2 变量不做字符串替换

SQL 中的 `$input.xxx` 不是字符串模板占位符，而是平台识别的 typed placeholder。

例如用户输入：

```sql
AND om.order_no = $input.orderNo
```

平台不能渲染为：

```sql
AND om.order_no = 'ORD001'
```

而应渲染为：

```sql
AND om.order_no = ?
```

并生成参数：

```text
p1 = "ORD001"
```

### 3.3 变量定义使用 JSON Schema

变量定义不采用自定义变量表，而是统一使用 JSON Schema。JSON Schema 用于表达变量名称、类型、默认值、枚举、标题、说明、数组元素类型、对象字段等信息。

SQL 安全渲染需要的特殊信息通过 `x-sql` 扩展表达，例如排序字段白名单、SQL 关键字白名单等。

### 3.4 自动提示基于符号表

CodeMirror 6 不直接管理变量。平台需要构建独立的 Symbol Store，用于根据当前 Workflow 状态、当前步骤位置、上游步骤输出 Schema、数据源元数据和依赖关系生成当前步骤可见的符号表。

CodeMirror 6 的补全源只从 Symbol Store 读取当前可见符号。

### 3.5 数据库元数据提示与变量提示分离

未来需要支持每个数据源下的数据库元数据提示，例如库、Schema、表、视图、字段、字段类型、字段注释等。因此自动提示体系必须采用 Provider 机制。

至少包括：

```text
VariableCompletionProvider
DatabaseMetadataCompletionProvider
SqlKeywordCompletionProvider
AliasCompletionProvider
```

不同 Provider 根据 SQL 上下文返回不同提示项。

## 4. 增强 SQL 变量语法

### 4.1 原生变量：`$var`

原生变量表示该 SQL 位置必须有值。没有值则报错，不允许执行。

示例：

```sql
AND om.tenant_id = $.tenantId
```

如果 `$.tenantId` 没有值，平台直接报错。

适用场景：

```text
租户 ID
用户 ID
必填业务参数
必填上游步骤结果
安全边界参数
```

### 4.2 可选变量：`$var?`

可选变量表示：如果变量有值，则正常参与 SQL 渲染；如果变量为空，则删除它所在的最小逻辑条件项。

示例：

```sql
AND om.status IN $input.status?
AND om.customer_name LIKE %$input.customerName?%
```

如果 `status` 为空，则删除：

```sql
AND om.status IN $input.status?
```

如果 `customerName` 为空，则删除：

```sql
AND om.customer_name LIKE %$input.customerName?%
```

### 4.3 默认变量：`$var!`

默认变量表示：如果用户未传值，则使用 JSON Schema 中定义的 `default`。

示例：

```sql
LIMIT $input.pageSize!
OFFSET $input.offset!
```

对应 JSON Schema：

```json
{
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "default": 10
    },
    "offset": {
      "type": "integer",
      "default": 0
    }
  }
}
```

如果请求中没有传入 `pageSize` 和 `offset`，平台使用默认值：

```text
pageSize = 10
offset = 0
```

### 4.4 三种变量的处理优先级

如果一个逻辑条件项中同时包含 `$var?` 和 `$var!`，处理顺序如下：

```text
1. 先处理所有 $var?。
2. 只要任意 $var? 为空，删除整个最小逻辑条件项。
3. 如果逻辑条件项未被删除，再处理 $var!。
4. $var! 为空时读取 JSON Schema default。
5. $var! 没有 default 则报错。
6. $var 没有值则报错。
```

示例：

```sql
ORDER BY $input.sortField? $input.sortOrder!
```

如果 `sortField` 为空，则删除整个 `ORDER BY` 子句。此时 `sortOrder` 即使有默认值，也不再参与渲染。

## 5. LIKE 变量语法

为了避免用户手动拼接字符串，平台支持以下写法：

```sql
LIKE %$input.name?%
LIKE $input.name?%
LIKE %$input.name?
```

含义如下：

```text
LIKE %$input.name?%   包含匹配，参数值为 %value%
LIKE $input.name?%    前缀匹配，参数值为 value%
LIKE %$input.name?    后缀匹配，参数值为 %value
```

示例：

```sql
AND om.customer_name LIKE %$input.customerName?%
```

如果 `customerName = "张三"`，渲染为：

```sql
AND om.customer_name LIKE ?
```

参数为：

```text
p1 = "%张三%"
```

禁止写法：

```sql
AND om.customer_name LIKE '%$input.customerName?%'
```

变量不能写在 SQL 字符串引号内。平台应在保存或测试时提示错误。

## 6. IN 数组变量

数组变量可以直接用于 `IN` 条件。

用户输入：

```sql
AND om.status IN $input.status?
```

如果请求参数为：

```json
{
  "status": ["READY", "RUNNING"]
}
```

平台渲染为：

```sql
AND om.status IN (?, ?)
```

参数为：

```text
p1 = "READY"
p2 = "RUNNING"
```

如果数组为空，并且使用了 `$input.status?`，则删除整个条件项。

如果使用 `$input.status`，则必须有值，否则报错。

## 7. 最小逻辑条件项识别

`$var?` 为空时，不是删除整行，而是删除它所在的最小逻辑条件项。

例如用户可以写成一行：

```sql
WHERE 1 = 1 AND om.status IN $input.status? AND om.customer_name LIKE %$input.customerName?%
```

平台应识别出：

```text
条件项 1：1 = 1
条件项 2：AND om.status IN $input.status?
条件项 3：AND om.customer_name LIKE %$input.customerName?%
```

如果 `status` 为空，只删除条件项 2。
如果 `customerName` 为空，只删除条件项 3。

不能按物理行删除，否则会误删同一行里的其他条件。

### 7.1 基于成熟 SQL Parser 的 AST 分析

平台不手写正则或简易词法扫描器，而是直接使用成熟的开源 SQL Parser 生成完整 AST（抽象语法树）。在 AST 基础上进行最小逻辑条件项的识别。

推荐使用 [node-sql-parser](https://github.com/taozhi8833998/node-sql-parser)（npm: `node-sql-parser`），理由：

```text
1. 支持 PostgreSQL、MySQL、MariaDB、FlinkSQL、Hive、TransactSQL 等多种方言。
2. 输出标准 AST，节点类型完整，包含 WHERE、JOIN、子查询、BETWEEN、IN、LIKE 等节点。
3. 同时提供 parser（解析）和 stringify（AST→SQL）能力，方便条件项裁剪后重新生成 SQL。
4. npm 周下载量 100k+，社区活跃，持续维护。
5. 运行在 Node.js 后端，不增加前端打包体积。
```

解析流程：

```text
增强 SQL 字符串
    │
    ▼
预处理：提取 $变量 并替换为临时标识符（避免 Parser 将 $ 识别为非法 token）
    │
    ▼
node-sql-parser 解析 → AST
    │
    ▼
AST Walker 遍历 WHERE / ON / HAVING 子树
    │
    ▼
识别逻辑条件项边界（AND / OR 节点）
    │
    ▼
定位每个 $var? 所在的最小条件子节点
    │
    ▼
标记可删除条件项 → 生成裁剪后 AST → stringify 回 SQL
```

关键能力由 AST 自然提供，无需手写复杂的边界判断：

```text
字符串字面量         AST 节点类型 string，直接提供值、起止位置
注释                 Parser 保留或丢弃注释节点，可配置
括号层级             AST 天然表达嵌套结构，无需手动计数
WHERE / ON / HAVING  各自独立的 AST 节点属性
ORDER BY / LIMIT     独立节点
AND / OR 逻辑连接    BinaryExpressionNode，operator 字段明确标识
BETWEEN ... AND ...  BetweenExpressionNode，第二个 AND 不会误识别为逻辑连接符
子查询               SubQueryNode / SelectStatementNode，递归遍历即可
IN / LIKE            独立表达式节点
表别名               AliasNode，FROM/JOIN 子节点中直接获取
```

### 7.2 变量预处理

`node-sql-parser` 默认不认识 `$input.xxx` 这类带 `$` 前缀的标识符。因此在送入 Parser 之前，需要做一次轻量预处理：

```text
1. 扫描原始 SQL，识别所有 $变量 token（正则 / \$[\w.\[\]]+[?!]?/g 作为辅助提取即可，因为只负责变量提取，不负责语法边界）。
2. 将每个 $变量 替换为占位标识符，例如 __VAR_0__、__VAR_1__。
3. 建立 占位符 ↔ 变量信息 的映射表。
4. 将替换后的 SQL 送入 node-sql-parser 解析。
5. 拿到 AST 后，通过映射表还原每个节点的变量信息。
```

替换规则：

```text
$input.status?       →  __VAR_0__
$input.customerName  →  __VAR_1__
$input.pageSize!     →  __VAR_2__
```

占位标识符遵循 SQL 标识符规则（字母、下划线），Parser 将其识别为普通 column_ref 或 identifier，不会报错。

### 7.3 BETWEEN 条件项

借助 AST，BETWEEN 由 `BetweenExpressionNode` 表达：

```text
BetweenExpressionNode {
  operator: "BETWEEN",
  left: column_ref (om.create_time),
  right: {
    min: __VAR_0__ ($input.startTime?),
    max: __VAR_1__ ($input.endTime?)
  }
}
```

`min` 或 `max` 任一关联 `$var?` 且为空时，将整个 `BetweenExpressionNode` 从父 `AND` 表达式中移除。

不需要手写 AND 属于 BETWEEN 还是逻辑连接符的判断。

### 7.4 OR 条件块级删除

借助 AST，OR 条件由 `BinaryExpressionNode`（operator = "OR"）表达：

```sql
AND (
  om.order_no = $input.keyword?
  OR om.customer_name LIKE %$input.keyword?%
  OR om.remark LIKE %$input.keyword?%
)
```

AST 结构：

```text
BinaryExpression (AND)
  ├── ...
  └── BinaryExpression (OR)  ← 括号内的 OR 块
        ├── BinaryExpression (=)
        │     ├── column_ref (om.order_no)
        │     └── __VAR_0__ ($input.keyword?)
        ├── BinaryExpression (LIKE)
        │     ├── column_ref (om.customer_name)
        │     └── __VAR_0__ ($input.keyword?)
        └── BinaryExpression (LIKE)
              ├── column_ref (om.remark)
              └── __VAR_0__ ($input.keyword?)
```

处理策略：

```text
1. 遍历 AST，找到所有关联 $var? 的叶子表达式节点。
2. 从叶子向上查找最近的 AND/OR BinaryExpression 父节点。
3. 该父节点作为"最小逻辑条件项"的根节点。
4. 如果该父节点是 AND 的直接子节点之一 → 直接移除该子节点。
5. 如果该父节点是 OR 块的根（如上例）→ 移除整个 OR 块（因为 keyword 为空时三个 OR 分支无一可用）。
6. 如果 OR 块中部分分支独立使用其他 $var? → 只移除关联的分支，保留其余。
7. 移除节点后，清理父节点中多余的 AND/OR 运算符和空括号。
```

第一版支持到步骤 1-6。对于单个 OR 分支内嵌套子查询的复杂场景，作为第二版增强。

### 7.5 裁剪后 AST → SQL 还原

移除目标节点后，使用 `node-sql-parser` 的 `stringify(ast)` 方法将裁剪后的 AST 还原为 SQL 字符串。这比手写 SQL 拼接可靠得多：

```ts
import { Parser } from 'node-sql-parser'

const parser = new Parser()
const ast = parser.astify(processedSql, { database: 'PostgreSQL' })
// ... 遍历 AST，裁剪可选条件项 ...
const trimmedSql = parser.sqlify(ast, { database: 'PostgreSQL' })
```

### 7.6 OR 条件边界与第一版限制

第一版完整支持：

```text
AND / OR 扁平条件项裁剪
BETWEEN 整体裁剪
IN 整体裁剪
OR 块级整体裁剪（同一个 $var? 关联 OR 所有分支时）
括号清理
多余 AND / OR 清理
空 WHERE 清理
```

第一版暂不支持：

```text
OR 块中部分分支独立使用不同 $var? 的精细裁剪
子查询内部 WHERE 条件的裁剪
多表 JOIN 中 ON 条件的级联裁剪
```

### 7.7 SQL Parser 选型、部署策略与前端协作方式

#### 选型对比

| 维度 | node-sql-parser | pgsql-ast-parser | 手写 Scanner |
|------|----------------|-------------------|--------------|
| 方言支持 | PG、MySQL、MariaDB、FlinkSQL、Hive、TransactSQL | 仅 PostgreSQL | 每种方言需手写规则 |
| AST 完整度 | 完整 SELECT/INSERT/UPDATE/DELETE | 完整但只有 PG | 不可能完整 |
| AST→SQL 还原 | ✅ sqlify() | ❌ 需自行实现 | ❌ 需自行实现 |
| 维护成本 | 社区维护，npm 100k+/周 | 单一维护者 | 平台自行维护 |
| BETWEEN/子查询 | AST 天然处理 | AST 天然处理 | 手写极易出错 |
| 部署位置 | 仅后端 Node.js，~150KB 磁盘 | 仅后端 | 无额外依赖 |

**结论：选择 `node-sql-parser`（npm: `node-sql-parser`）作为 SQL 解析引擎。**

#### 后端部署策略

`node-sql-parser` 只部署在后端（Node.js），不作为前端依赖：

```text
1. node-sql-parser 作为后端 API 网关 / 步骤执行器的直接依赖（npm install）。
2. 每次 API 调用执行 SQL 步骤时，后端创建 Parser 实例，解析增强 SQL。
3. Parser 实例可按 dialect 缓存复用（同一步骤重复执行时不需重新初始化）。
4. 前端 bundle 完全不包含 node-sql-parser（~0 KB 开销）。
```

前端对 SQL 结构的感知通过两条路径：

```text
路径 1（即时，~0ms）：
  用户输入 → @codemirror/lang-sql 的 Lezer grammar
  → 提供基础 token 类型（关键字、标识符、字符串、注释）
  → 前端 Completion Engine 据此判断光标上下文（在 FROM 后？在 alias. 后？）

路径 2（权威，~50ms 去重 debounce）：
  用户停止输入 300ms 后 → 前端发送 (sql, cursorPos, dialect) 到后端分析 API
  → 后端 EnhancedSqlAnalyzer 解析 AST
  → 返回 { clauseType, diagnostics, aliasMap, previewSql, optionalConditions }
  → 前端更新诊断标红 + 预览面板
```

#### dialect 的双向影响

SQL 方言（dialect）影响两个方向：

**方向一：用户端——用户必须按数据源方言编写 SQL**

```text
每个步骤绑定的 dataSourceId 决定该步骤的数据库方言。
用户在该步骤的编辑器中，必须按照对应方言编写 SQL。

示例：
  dataSourceId: "mes_pg"     → 用户写 PostgreSQL 语法（::type 转换、ILIKE、ANY 数组）
  dataSourceId: "mes_mysql"  → 用户写 MySQL 语法（` 引用、LIMIT x,y、IFNULL）
  dataSourceId: "mes_oracle" → 用户写 Oracle 语法（ROWNUM、FETCH、|| 连接）
```

编辑器中 dialect 的选择来自步骤绑定，**不提供编辑器内实时切换 dialect 的功能**。

**方向二：平台端——node-sql-parser 必须配置对应方言解析**

```ts
// 后端根据步骤绑定的 dialect 配置 Parser
const parser = new Parser()
const ast = parser.astify(processedSql, {
  database: stepDialect  // 'PostgreSQL' | 'MySQL' | 'MariaDB' | 'TransactSQL' | 'Hive' | 'FlinkSQL'
})
```

不同方言的 SQL，Parser 产生的 AST 结构是统一的（node-sql-parser 内部归一化）。因此 EnhancedSqlAnalyzer 的条件裁剪、变量提取、别名解析等逻辑**不受 dialect 影响**——AST 操作层是方言无关的。

方言差异只在以下环节体现：

```text
1. Parser 解析阶段：astify() 的 database 参数
2. AST → SQL 还原阶段：sqlify() 的 database 参数
3. SQL Renderer 后端参数占位符格式：
   - PostgreSQL → $1, $2, ...
   - MySQL / MariaDB → ?, ?, ...
   - Oracle → :1, :2, ...
   - SQL Server / TransactSQL → @p1, @p2, ...
4. 分页语法渲染（方言差异）：
   - PG/MySQL: LIMIT ? OFFSET ?
   - Oracle 12c+: OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
   - SQL Server: OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
5. 元数据查询：不同数据库的 information_schema 结构不同
```

#### 方言与 `$` 变量的安全约束

无论何种 dialect，安全规则**跨方言统一**：

```text
普通值变量（string/number/date/boolean/array）   → 参数化（占位符格式因方言而异）
sql-field 变量（x-sql.kind = "field"）          → 白名单映射（字段名无法参数化）
sql-keyword 变量（x-sql.kind = "keyword"）       → 白名单映射（关键字无法参数化）
```

字段名和关键字的映射值必须符合**目标方言的标识符引用规则**：

```text
PG        → "om"."create_time"  （双引号）
MySQL     → `om`.`create_time`  （反引号）
Oracle    → "OM"."CREATE_TIME"  （双引号 + 默认大写）
```

这由 x-sql.map 中配置的映射值直接决定。平台不自动加引号，由配置者负责填写符合方言规范的映射值。

## 8. JSON Schema 变量定义

变量定义统一使用 JSON Schema。三个作用域分别对应不同 Schema：

```text
inputSchema       对应 $input.xxx     API 查询参数
globalSchema      对应 $.xxx          平台/项目全局变量和函数
localSchema       对应 $xxx           API 内部变量（设计时变量 + 前置步骤输出）
```

`localSchema` 由两部分组成：API 设计时声明的局部变量（含类型、模式、默认值、常量或 JS 表达式），以及前置步骤的 `outputVariable` 输出（运行时从 SQL SELECT 列表推断）。两者共用 `local` 作用域，但禁止同名。

API 设计时局部变量可互相引用，保存前做拓扑排序，循环依赖不允许保存。表达式使用轻量 JS 沙箱（`new Function` 注入 `input` / `global` / `local` 三个作用域）求值，可调用 `$.getMin` 等全局函数。

### 8.1 inputSchema 示例

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "api:/order/query/input.schema.json",
  "title": "订单查询参数",
  "type": "object",
  "properties": {
    "status": {
      "title": "订单状态",
      "description": "订单状态列表，用于 IN 查询",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "customerName": {
      "title": "客户名称",
      "description": "按客户名称模糊查询",
      "type": "string"
    },
    "startTime": {
      "title": "开始时间",
      "type": "string",
      "format": "date-time"
    },
    "endTime": {
      "title": "结束时间",
      "type": "string",
      "format": "date-time"
    },
    "sortField": {
      "title": "排序字段",
      "description": "允许排序的字段",
      "type": "string",
      "enum": ["createTime", "orderNo", "amount"],
      "x-sql": {
        "kind": "field",
        "map": {
          "createTime": "om.create_time",
          "orderNo": "om.order_no",
          "amount": "om.total_amount"
        }
      }
    },
    "sortOrder": {
      "title": "排序方向",
      "type": "string",
      "enum": ["asc", "desc"],
      "default": "desc",
      "x-sql": {
        "kind": "keyword",
        "map": {
          "asc": "ASC",
          "desc": "DESC"
        }
      }
    },
    "pageSize": {
      "title": "每页数量",
      "type": "integer",
      "minimum": 1,
      "maximum": 200,
      "default": 10
    },
    "offset": {
      "title": "偏移量",
      "type": "integer",
      "minimum": 0,
      "default": 0
    }
  }
}
```

### 8.2 JSON Schema default 的使用规则

JSON Schema 的 `default` 本身只是注解。平台需要明确采用以下规则：

```text
$var    不使用 default，没有值时报错。
$var?   不使用 default，没有值时删除当前最小逻辑条件项。
$var!   使用 default，没有值时取 JSON Schema default。
```

即使某个字段有 default，只要 SQL 中使用的是 `$var?`，为空时仍然删除条件项，而不是使用 default。

### 8.3 x-sql 扩展

JSON Schema 不能直接表达 SQL 字段名和关键字的安全映射，因此使用 `x-sql` 扩展。

`x-sql.kind = "field"` 表示该变量用于 SQL 字段名位置，例如排序字段：

```json
{
  "type": "string",
  "enum": ["createTime", "orderNo"],
  "x-sql": {
    "kind": "field",
    "map": {
      "createTime": "om.create_time",
      "orderNo": "om.order_no"
    }
  }
}
```

`x-sql.kind = "keyword"` 表示该变量用于 SQL 关键字位置，例如排序方向：

```json
{
  "type": "string",
  "enum": ["asc", "desc"],
  "default": "desc",
  "x-sql": {
    "kind": "keyword",
    "map": {
      "asc": "ASC",
      "desc": "DESC"
    }
  }
}
```

普通字符串、数字、日期、布尔、数组变量都必须参数化。只有 `field`、`keyword` 这类变量允许渲染为 SQL 片段，但必须通过白名单映射。

## 9. SQL 安全渲染

### 9.1 渲染流程

渲染分为两个阶段：**编辑器即时反馈**和**后端权威渲染**。

#### 编辑器即时反馈（~0ms 本地 + ~50ms 后端 debounce）

用户在 CodeMirror 编辑 SQL 时，前端提供两级反馈：

**第一级：本地即时反馈（同步，~0ms）**

```text
1. 用户输入增强 SQL。
2. 前端正则提取 $变量 引用（/\$[\w.\[\]]+[?!]?/g）。
3. 读取 Symbol Store（前端内存中的响应式状态）。
4. 基于正则匹配结果 + Symbol Store 做轻量校验：
   - 变量名是否在符号表中存在？
   - 命名空间是否可访问？
5. 立即更新 CodeMirror lint gutter 的基础诊断（变量不存在/不可见）。
6. 立即更新 CodeMirror 自动补全列表。
```

**第二级：后端分析 API（debounce 300ms，~50ms）**

```text
1. 用户停止输入 300ms 后，前端发送请求到 POST /api/sql/analyze：
   { sql, dialect, dataSourceId, stepId, cursorPos }
2. 后端 EnhancedSqlAnalyzer（node-sql-parser）解析为 AST。
3. 后端执行完整校验：
   - 变量类型是否匹配？
   - IN 是否使用了非数组变量？
   - LIKE 变量写法是否正确？
   - $var! 是否有 default？
   - 字符串字面量内是否包含 $ 变量？
4. 后端执行条件裁剪（用虚拟值 / default 值）。
5. 后端 sqlify() 还原为预览 SQL。
6. 后端返回：
   { diagnostics, previewSql, previewParams, clauseType, aliasMap, optionalConditions }
7. 前端更新完整诊断标红 + 预览面板。
```

前端预览**不连接数据库**，后端分析 API 使用 default 值或虚拟值填充，仅用于编辑时确认 SQL 结构。

#### 后端安全渲染（API 执行时）

当 API 实际被调用时，后端执行**安全渲染**——这是唯一产生最终执行 SQL 的路径：

```text
1. 接收用户提交的增强 SQL + 实际请求参数。
2. EnhancedSqlAnalyzer 预处理 + node-sql-parser 解析为 AST。
3. 解析 AST，识别所有变量引用。
4. 读取 JSON Schema 定义。
5. 校验变量是否存在、类型是否匹配、参数是否合法。
6. 根据实际参数值 + $var? 规则裁剪 AST。
7. 根据实际参数值 + $var! / default 填充。
8. 对普通值变量生成参数占位符（方言感知：PG→$1, MySQL→?, Oracle→:1）。
9. 对数组变量展开为 (?, ?, ...)。
10. 对 sql-field / sql-keyword 执行 x-sql.map 白名单映射。
11. node-sql-parser sqlify() 还原为最终 SQL。
12. 输出：渲染后 SQL 字符串 + 有序参数列表（供 PreparedStatement 绑定）。
```

编辑时分析 API 和执行时安全渲染**共用同一个后端 EnhancedSqlAnalyzer 实例逻辑**，确保预览结果与执行结果一致。差异仅在于：分析 API 用虚拟值，执行渲染用真实参数值。

### 9.2 示例

用户输入 SQL：

```sql
SELECT *
FROM order_main om
WHERE 1 = 1
AND om.status IN $input.status?
AND om.customer_name LIKE %$input.customerName?%
AND om.create_time BETWEEN $input.startTime? AND $input.endTime?
ORDER BY $input.sortField? $input.sortOrder!
LIMIT $input.pageSize!
OFFSET $input.offset!
```

请求参数：

```json
{
  "status": ["READY", "RUNNING"],
  "customerName": "张三",
  "sortField": "createTime"
}
```

渲染后 SQL：

```sql
SELECT *
FROM order_main om
WHERE 1 = 1
AND om.status IN (?, ?)
AND om.customer_name LIKE ?
ORDER BY om.create_time DESC
LIMIT ?
OFFSET ?
```

参数列表：

```text
p1 = "READY"
p2 = "RUNNING"
p3 = "%张三%"
p4 = 10
p5 = 0
```

其中：

```text
status           普通数组变量，展开为参数列表
customerName     普通字符串变量，绑定参数
sortField        sql-field，通过 x-sql.map 映射为 om.create_time
sortOrder        sql-keyword，取 default desc，映射为 DESC
pageSize         普通 int，取 default 10，绑定参数
offset           普通 int，取 default 0，绑定参数
```

### 9.3 编译缓存：一次解析，多次渲染

增强 SQL 本身在步骤保存后是**静态模板**——只有每次 API 调用的参数值变化。如果每次请求都完整走一遍 `preprocess → parse → AST walk → trimConditions → stringify`，会产生大量重复计算。

解决方案：**步骤保存时预编译为 CompiledSqlPlan，每次 API 调用时基于 Plan 做轻量渲染。**

#### 编译产物：CompiledSqlPlan

```ts
type CompiledSqlPlan = {
  planVersion: number
  compiledAt: string
  /** 用于检测是否需要重新编译的指纹 */
  sourceHash: string              // 增强 SQL 原文 hash
  schemaHash: string              // JSON Schema hash
  dialect: SqlDialect

  // === 静态解析结果（编译时确定，运行时不变） ===

  /** 预处理后的 SQL（变量 → 占位符） */
  processedSql: string

  /** 占位符 → 变量信息映射 */
  varMap: Record<string, VariableInfo>

  /** 预解析的 AST（可序列化存储） */
  ast: SerializedAst

  /** 所有变量引用列表（名称、类型、在 AST 中的路径） */
  variableRefs: VariableRef[]

  /** 表别名映射：alias → tableName */
  aliasMap: Record<string, string>

  /** 可选条件项索引：每个 $var? 关联哪些 AST 路径 */
  optionalConditions: OptionalConditionIndex[]

  /** 静态校验结果（结构性问题，不依赖参数值） */
  staticDiagnostics: Diagnostic[]

  /** 依赖引用（用于依赖分析） */
  references: StepReference[]
}

/** 可选条件项索引：记录该条件在 AST 中的位置和裁剪规则 */
type OptionalConditionIndex = {
  /** 关联的变量路径，例如 "$input.status?" */
  variablePath: string
  /** 条件项在 AST 中的定位路径（用于快速定位和删除） */
  astPath: string[]          // 例如 ['where', 'children', 2]
  /** 条件项类型：and-condition | or-block | between-expr */
  conditionType: 'and-condition' | 'or-block' | 'between-expr'
  /** 如果是 BETWEEN，同时关联的另一个变量 */
  siblingVariablePath?: string
}
```

#### 编译时机

```text
触发编译的事件：
1. 用户保存 SQL 步骤。
2. 用户发布 API（含 SQL 步骤）。
3. 步骤绑定的 JSON Schema（inputSchema / globalSchema / localSchema）变更。
4. 步骤绑定的 dataSourceId 或 dialect 变更。
5. 上游步骤 outputSchema 变更（影响变量可见性和字段提示）。

不触发重新编译：
- 每次 API 调用（参数值不同）—— 只执行轻量渲染。
```

#### 运行时渲染（基于 Plan）

每次 API 调用时，后端加载 CompiledSqlPlan，执行**不包含 parser 的轻量渲染**：

```ts
function renderFromPlan(plan: CompiledSqlPlan, actualParams: Record<string, any>): RenderResult {
  // 1. 克隆 AST（浅克隆，只修改受影响的子节点）
  const ast = shallowCloneAst(plan.ast)

  // 2. 遍历 optionalConditions，判断哪些 $var? 为空
  const pathsToRemove: string[][] = []
  for (const cond of plan.optionalConditions) {
    if (cond.conditionType === 'between-expr') {
      // BETWEEN 特殊处理：任一变数为空则删除整个 BETWEEN 条件项
      const v1 = resolveVariableValue(cond.variablePath, actualParams, plan.varMap)
      const v2 = resolveVariableValue(cond.siblingVariablePath!, actualParams, plan.varMap)
      if (isEmpty(v1) || isEmpty(v2)) {
        pathsToRemove.push(cond.astPath)
      }
    } else {
      // 普通条件项 / OR 块：关联的变量为空则删除
      const value = resolveVariableValue(cond.variablePath, actualParams, plan.varMap)
      if (isEmpty(value)) {
        pathsToRemove.push(cond.astPath)
      }
    }
  }

  // 3. 从 AST 中移除标记的条件节点
  const trimmedAst = removeAstNodes(ast, pathsToRemove)

  // 4. 清理空括号、多余 AND/OR、空 WHERE
  cleanupAst(trimmedAst)

  // 5. 处理 $var! 默认值 + 收集参数列表
  //    注：default 值、x-sql.map 已在编译时写入 plan.variableRefs，运行时直接读取
  const params: ParamValue[] = []
  for (const ref of plan.variableRefs) {
    const value = resolveValueFromRef(ref, actualParams)
    if (ref.sqlKind === 'value') {
      if (ref.dataType === 'array') {
        params.push(...value.map(v => ({ value: v, type: ref.itemType })))
      } else {
        params.push({ value, type: ref.dataType })
      }
    } else if (ref.sqlKind === 'field' || ref.sqlKind === 'keyword') {
      // 白名单映射（已在编译时校验 map 存在性并写入 ref.xSqlMap）
      applyWhiteMap(trimmedAst, ref.astPath, ref.xSqlMap!, value)
    }
  }

  // 6. stringify AST → SQL 字符串
  const sql = stringifyAst(trimmedAst, plan.dialect)

  return { sql, params }
}
```

#### 性能对比

```text
                           每次 API 调用耗时        说明
──────────────────────────────────────────────────────────────────
无缓存（每请求解析）         ~5-15ms              preprocess + parse + walk + trim + stringify
有 Plan（编译后渲染）        ~1-3ms               clone AST + remove nodes + cleanup + stringify
Plan + 内存缓存              ~0.5-2ms             Plan 常驻内存，跳过反序列化
```

对于高频 API（QPS > 100），Plan 缓存可降低 70-80% 的 SQL 处理 CPU 时间。

#### Plan 的存储与缓存层级

```text
L1: 进程内存（最快）
    └── LRU Cache，key = stepId + schemaHash
        热点步骤的 Plan 常驻内存，~10-50KB/plan

L2: Redis / 分布式缓存（次快）
    └── key = "sql:plan:{stepId}:{schemaHash}"
        多实例共享，重启不丢失

L3: 数据库 / Step 定义（持久）
    └── step.compiledPlan 字段
        冷启动回退，planVersion 用于并发控制
```

#### Plan 的缓存失效

```text
失效条件                               触发动作
──────────────────────────────────────────────────────────
用户编辑并保存 SQL                     重新编译 + 更新 plan，递增 planVersion
JSON Schema 变更                       重新编译 + 更新 plan
上游 outputSchema 变更                 重新编译 + 更新 plan
dataSourceId / dialect 变更            重新编译 + 更新 plan
API 调用（参数值变化）                 不重新编译，仅基于现有 Plan 渲染
```

失效检测通过 hash 对比：请求携带的 `schemaHash` 与 Plan 中的 `schemaHash` 不一致时，触发重新编译（编译后自动更新缓存）。

#### 编辑时分析 API 的 Plan 复用

`POST /api/sql/analyze`（编辑时 debounce 调用）也可以复用 Plan，但命中率低于执行时：

```text
1. 前端发送 { sql, schemaHash, ... }
2. 后端计算 sql 的 hash
3. 如果 hash 匹配已有 Plan → 直接基于 Plan 渲染（跳过 parse）
4. 如果 hash 不匹配 → 重新编译（用户正在编辑，SQL 已变）
5. 返回 previewSql + diagnostics
```

**命中率说明：**

```text
编辑时（用户正在打字）：
  SQL 原文几乎每次 debounce 都不同 → Plan hash 不断变化 → 命中率很低。
  每次 debounce 都触发重新编译，这是预期行为——用户需要看到最新 SQL 的分析结果。

编辑时（用户回到之前的 SQL）：
  打开已保存步骤 → SQL 原文与上次保存一致 → hash 匹配 → 命中 Plan 缓存。
  切换步骤再切回来 → 之前编译过的 Plan 仍在 LRU 中 → 命中。

执行时（API 调用）：
  SQL 已保存不变 → hash 始终匹配 → 100% 命中 Plan 缓存。
```

用户频繁编辑时 Plan 命中率低是正常的——这正是编译缓存与实时分析的合理分工。

## 10. CodeMirror 自动提示设计

### 10.1 总体结构

编辑器采用 CodeMirror 6 作为 SQL 输入组件。自动提示不由 CodeMirror 单独决定，而是通过平台的 Completion Engine 提供。

总体结构：

```text
Enhanced SQL Editor
    ├── Variable Intelligence
    │   ├── JSON Schema
    │   ├── Workflow Symbol Store
    │   └── Step Output Schema
    │
    ├── Database Intelligence
    │   ├── DataSource Metadata Store
    │   ├── Table Metadata
    │   ├── Column Metadata
    │   └── SQL Dialect
    │
    ├── SQL Context Intelligence
    │   ├── CM6 Lezer Grammar（本地即时 token 类型）
    │   ├── Backend Analyze API（debounce 300ms，权威 AST）
    │   ├── Clause Detector（综合双源判断）
    │   ├── Alias Resolver
    │   └── Completion Context Resolver
    │
    └── CodeMirror 6 Integration
        ├── @codemirror/autocomplete → CompletionSource
        ├── @codemirror/lint → Diagnostics gutter
        ├── @codemirror/lang-sql → SQL syntax highlighting
        └── Compartment → Dynamic Reconfiguration
```

### 10.2 Completion Provider 机制

为了兼容未来数据库元数据提示，自动提示采用 Provider 注册机制。

```text
CompletionEngine
    ├── VariableCompletionProvider
    ├── DatabaseMetadataCompletionProvider
    ├── SqlKeywordCompletionProvider
    ├── AliasCompletionProvider
    └── CompletionMerger
```

各 Provider 职责如下：

```text
VariableCompletionProvider
负责 $input.xxx、$.xxx、$xxx（含 $orderMain 等步骤输出与设计时变量）等变量提示。

DatabaseMetadataCompletionProvider
负责数据源、数据库、Schema、表、视图、字段、字段类型提示。

SqlKeywordCompletionProvider
负责 SELECT、FROM、WHERE、JOIN、ORDER BY 等 SQL 关键字提示。

AliasCompletionProvider
负责根据 FROM / JOIN 中的表别名，提示 alias.column。
```

CompletionMerger 负责根据当前光标上下文对多个 Provider 的结果排序、过滤和去重。

## 11. 符号表 Symbol Store

### 11.1 SymbolItem 结构

```ts
type SymbolItem = {
  id: string
  label: string
  insertText: string
  scope: "input" | "global" | "local"
  /** local 作用域下区分设计时变量与步骤输出 */
  source?: "design" | "step"
  variablePath?: string
  dataType?: string
  title?: string
  description?: string
  defaultValue?: unknown
  enumValues?: string[]
  sqlKind?: "value" | "field" | "keyword"
  sourceStepId?: string
  sourceSchemaPath?: string
  dataSourceId?: string
  deprecated?: boolean
}
```

示例：

```ts
{
  id: "input.customerName",
  label: "customerName",
  insertText: "$input.customerName",
  scope: "input",
  variablePath: "$input.customerName",
  dataType: "string",
  title: "客户名称",
  description: "按客户名称模糊查询"
}
```

上游步骤字段示例：

```ts
{
  id: "step.orderMain.order_id",
  label: "order_id",
  insertText: "$orderMain[].order_id",
  scope: "local",
  source: "step",
  variablePath: "$orderMain[].order_id",
  dataType: "string",
  title: "订单ID",
  sourceStepId: "step_order_main"
}
```

API 设计时局部变量示例：

```ts
{
  id: "local.offset",
  label: "offset",
  insertText: "$offset",
  scope: "local",
  source: "design",
  variablePath: "$offset",
  dataType: "integer"
}
```

### 11.2 当前步骤可见符号表

当前步骤可见符号表由以下内容组成：

```text
$input.xxx   API 输入参数
$.xxx        平台/项目全局变量和函数
$xxx         local 作用域：API 设计时变量 + 当前步骤之前的步骤输出
```

可见性规则：

```text
1. 当前步骤始终可以访问 $input、$.、API 设计时 $xxx 变量。
2. 当前步骤只能访问上游步骤的 outputVariable 输出。
3. 当前步骤不能访问下游步骤变量。
4. 如果使用 DAG 编排，只能访问依赖路径中允许访问的步骤变量。
5. 已删除、改名、Schema 无效的步骤变量不应作为有效提示项。
6. 上游步骤输出 Schema 未确认时，可以提示变量名，但不提示字段，或标记为未确认。
7. local 变量与步骤输出变量禁止同名，保存时校验。
8. local 变量支持互相引用，保存前做拓扑排序，循环依赖不允许保存。
```

## 12. 上游变量动态变化感知

### 12.1 Workflow State

前端或服务端需要维护完整 Workflow 状态。

```ts
type WorkflowState = {
  inputSchema: JsonSchema
  globalSchema: JsonSchema
  localVariables: ApiLocalVariable[]
  steps: WorkflowStep[]
}

type ApiLocalVariable = {
  id: string
  name: string
  type: "string" | "integer" | "decimal" | "boolean" | "array" | "object"
  itemType?: string
  mode: "required" | "optional" | "defaulted"
  defaultValue?: unknown
  value:
    | { kind: "literal"; literal: unknown }
    | { kind: "expression"; expression: string }
}

type WorkflowStep = {
  id: string
  name: string
  type: "sql" | "script" | "transform"
  dataSourceId?: string
  dialect?: string
  outputVariable?: string
  condition?: string
  sql?: string
  outputSchema?: JsonSchema
  schemaVersion: number
  schemaHash: string
  status: "valid" | "dirty" | "invalid"
}
```

每个步骤的输出 Schema 必须有：

```text
schemaVersion
schemaHash
```

当上游步骤输出结构发生变化时，这两个字段必须变化。

### 12.2 更新流程

上游步骤变化后的事件流：

```text
1. 用户修改上游步骤 SQL。
2. 上游步骤状态变为 dirty。
3. 用户点击保存、测试或解析输出字段。
4. 平台重新生成该步骤 outputSchema。
5. 如果 outputSchema 变化，更新 schemaVersion 和 schemaHash。
6. Workflow Store 更新该步骤。
7. Dependency Analyzer 找到受影响的下游步骤。
8. 下游步骤标记为 needRevalidate。
9. Symbol Store 重新计算下游步骤可见符号表。
10. CodeMirror 6 CompletionSource 读取最新 Symbol Store。
11. 下游自动提示更新。
12. CodeMirror 6 LintSource 对下游 SQL 中失效变量标红。
```

### 12.3 草稿 Schema 与确认 Schema

为了避免上游 SQL 编辑过程中频繁影响下游提示，建议区分：

```text
draftOutputSchema
编辑过程中的临时推断结果。

committedOutputSchema
保存成功、测试成功或用户确认后的正式输出结果。
```

下游默认使用 committedOutputSchema。

如果上游存在未保存变更，下游可以提示：

```text
$orderMain    上游步骤存在未保存变更
```

或者在步骤列表中提示：

```text
orderMain 输出结构已变更，可能影响 3 个下游步骤。
```

## 13. 上游输出 Schema 生成方式

上游步骤输出 Schema 可以通过以下方式生成。

### 13.1 用户手动定义

用户手动维护输出字段。稳定性高，但配置成本较高。

### 13.2 SQL 静态解析

根据 SELECT 列表推断字段。

适合：

```sql
SELECT order_id, order_no, customer_name
FROM order_main
```

不适合：

```sql
SELECT *
FROM order_main om
JOIN order_item oi ON oi.order_id = om.id
```

### 13.3 数据库元数据探测

通过数据库驱动获取查询结果列元数据。例如预编译、限制 0 行返回、执行元数据查询等方式。

这是实际工程中较推荐的方式。

### 13.4 推荐优先级

```text
1. 用户手动确认的 outputSchema
2. 数据库元数据探测生成的 outputSchema
3. SQL 静态解析得到的 outputSchema
4. 未知 Schema，仅提示变量名，不提示字段
```

## 14. 数据库元数据提示设计

### 14.1 数据源绑定

每个 SQL 步骤应明确绑定数据源：

```json
{
  "stepId": "step_order_main",
  "type": "sql",
  "dataSourceId": "mes_pg",
  "dialect": "postgresql",
  "outputVariable": "orderMain",
  "sql": "SELECT * FROM order_main om WHERE om.order_no = $input.orderNo?"
}
```

编辑器根据 `dataSourceId` 和 `dialect` 决定：

```text
提示哪个数据源的表和字段
使用哪种 SQL 方言
如何解析元数据
如何渲染分页、参数占位符等方言差异
```

**dialect 命名约定：** 步骤配置中使用小写（`"postgresql"`、`"mysql"`、`"oracle"`、`"sqlserver"`），传入 `node-sql-parser` 的 `astify()`/`sqlify()` 时转换为 PascalCase：

```text
postgresql → PostgreSQL
mysql      → MySQL
mariadb    → MariaDB
oracle     → Oracle  (node-sql-parser 可能不支持，需降级或 polyfill)
sqlserver  → TransactSQL
```

转换由 `EnhancedSqlAnalyzer` 内部的 `parser-wrapper.ts` 负责，调用方只需传入步骤配置中的小写 dialect。

### 14.2 数据源元数据结构

```ts
type DataSourceMetadata = {
  dataSourceId: string
  name: string
  dialect: "postgresql" | "oracle" | "mysql" | "sqlserver" | "tdengine"
  version: number
  hash: string
  catalogs?: CatalogMetadata[]
  schemas: SchemaMetadata[]
  lastSyncTime?: string
  syncStatus?: "success" | "syncing" | "failed"
}

type SchemaMetadata = {
  name: string
  tables: TableMetadata[]
  views: TableMetadata[]
}

type TableMetadata = {
  schema?: string
  name: string
  displayName?: string
  type: "table" | "view"
  comment?: string
  columns: ColumnMetadata[]
}

type ColumnMetadata = {
  name: string
  dataType: string
  nullable: boolean
  primaryKey?: boolean
  comment?: string
}
```

### 14.3 表提示

当光标位于 `FROM` 或 `JOIN` 后，应优先提示表和视图。

示例：

```sql
SELECT *
FROM 
```

提示：

```text
order_main       table    订单主表
order_item       table    订单明细表
customer         table    客户表
```

### 14.4 字段提示

当光标位于表别名之后，应提示该表字段。

示例：

```sql
SELECT om.
FROM order_main om
```

提示：

```text
om.order_id          string    订单ID
om.order_no          string    订单号
om.customer_name     string    客户名称
om.create_time       datetime  创建时间
```

同样适用于：

```sql
WHERE om.
ORDER BY om.
GROUP BY om.
```

### 14.5 别名解析

平台需要通过轻量 SQL 分析器解析表别名。

示例：

```sql
FROM order_main om
JOIN order_item oi ON oi.order_id = om.id
```

解析结果：

```text
om -> order_main
oi -> order_item
```

字段提示时，如果用户输入：

```sql
oi.
```

应提示 `order_item` 的字段。

## 15. Completion Context Resolver

提示引擎需要根据当前光标上下文判断提示类型。

常见上下文：

```text
输入 $                  提示变量作用域
输入 $input.            提示 inputSchema 字段
输入 $.                 提示 globalSchema 字段
输入 $orderMain[].      提示上游步骤输出字段
FROM 后                 提示表、视图
JOIN 后                 提示表、视图
alias.                  提示表字段
WHERE column =          优先提示变量
ORDER BY 后             优先提示字段、sql-field 变量
LIMIT 后                优先提示 int 类型变量
普通空白位置            提示 SQL 关键字
```

示例：

```sql
AND om.status IN $
```

提示：

```text
$input.
$.
$orderMain
```

示例：

```sql
SELECT om.
```

提示：

```text
om.order_id
om.order_no
om.customer_name
```

CompletionMerger 需要根据上下文对提示项排序，避免变量、表、字段、关键字全部混在一起。

## 16. CodeMirror 6 集成

明确使用 CodeMirror 6（而非 v5），利用其原生模块化架构和 Tree-sitter 级别的语法分析能力。

### 16.1 核心扩展包

```text
@codemirror/lang-sql           SQL 语法高亮、缩进、基础关键字补全
@codemirror/autocomplete       补全 UI（CompletionTooltip、CompletionContext）
@codemirror/lint               诊断标红 gutter（LintSource、Diagnostic）
@codemirror/state              EditorState、Compartment（动态重配置）
@codemirror/view               EditorView、Tooltip、Panel
@codemirror/commands           快捷键（Ctrl+Space 触发补全等）
```

其中 `@codemirror/lang-sql` 提供基础的 SQL 关键字补全和语法高亮，平台的变量补全和数据库元数据补全通过自定义 `CompletionSource` 叠加。

### 16.2 动态重配置

CM6 使用 `Compartment` 模式实现扩展的动态替换：

```ts
import { Compartment } from '@codemirror/state'

const completionCompartment = new Compartment()

// 当上游 Schema 或数据源元数据变化时，动态替换 completion source
function updateCompletions(symbolTable: SymbolTable, metadata: DataSourceMetadata) {
  const newExtension = completionCompartment.of(
    autocompletion({
      override: [
        createVariableCompletionSource(symbolTable),
        createDatabaseCompletionSource(metadata),
      ]
    })
  )
  
  editorView.dispatch({
    effects: completionCompartment.reconfigure(newExtension)
  })
}
```

无需销毁重建编辑器，用户正在编辑的 SQL 文本和光标位置不受影响。

### 16.3 变量 CompletionSource

伪代码：

```ts
function createVariableCompletionSource(getSymbolTable: () => VisibleSymbolTable) {
  return (context: CompletionContext) => {
    const word = context.matchBefore(/\$[\w.\[\]]*[?!]?/)

    if (!word) {
      return null
    }

    const symbolTable = getSymbolTable()
    const options = buildVariableCompletionOptions(word.text, symbolTable)

    return {
      from: word.from,
      options
    }
  }
}
```

关键要求：

```text
getSymbolTable 必须读取当前最新 Workflow Store。
CompletionSource 不保存旧变量列表。
每次触发补全时都基于当前步骤重新获取符号表。
```

### 16.4 数据库元数据 CompletionSource

数据库元数据补全应读取当前步骤绑定的数据源：

```ts
function createDatabaseCompletionSource(
  getCurrentDataSourceMetadata: () => DataSourceMetadata,
  getSqlContext: () => SqlCompletionContext
) {
  return (context: CompletionContext) => {
    const sqlContext = getSqlContext()
    const metadata = getCurrentDataSourceMetadata()

    return buildDatabaseCompletions(sqlContext, metadata)
  }
}
```

### 16.5 修饰符提示

当用户输入完整变量后，可以提示：

```text
?   为空时删除当前最小逻辑条件项
!   为空时使用 JSON Schema default
```

例如输入：

```sql
$input.customerName
```

可提示：

```text
$input.customerName?
$input.customerName!
```

## 17. 诊断与标红

自动提示解决“可以输入什么”，诊断负责判断“已经输入的内容是否有效”。

诊断触发时机：

```text
编辑 SQL 时
打开步骤编辑器时
保存步骤时
测试步骤时
上游 Schema 变化时
数据源元数据变化时
步骤顺序变化时
依赖关系变化时
```

诊断内容：

```text
变量不存在
变量不可见
变量类型不匹配
变量写在字符串字面量中
$var! 没有 default
$var? 所在逻辑条件项无法识别
IN 使用了非数组变量
数组变量为空但没有使用 ?
LIKE 变量写法错误
ORDER BY 中使用普通 string 变量
sql-field 未配置 x-sql.map
sql-keyword 未配置 x-sql.map
表不存在
字段不存在
别名不存在
数据源元数据过期
```

示例：

```sql
AND oi.order_no = $orderMain[].order_no?
```

如果上游已经没有 `order_no` 字段，提示：

```text
$orderMain[].order_no 不存在。
上游步骤 orderMain 当前输出字段包括：order_id、order_code、customer_name。
```

如果系统支持相似度匹配，可以提示：

```text
是否改为 $orderMain[].order_code？
```

## 18. 依赖分析

平台需要从增强 SQL 中自动提取变量引用。

示例：

```json
{
  "stepId": "step_order_items",
  "references": [
    {
      "source": "input",
      "path": "$input.status"
    },
    {
      "source": "step",
      "stepName": "orderMain",
      "path": "$orderMain[].order_id"
    }
  ]
}
```

依赖分析用途：

```text
判断当前步骤可以访问哪些变量
上游 Schema 变化后定位受影响的下游步骤
步骤移动顺序后重新校验变量可见性
删除步骤或重命名结果变量时提示影响范围
API 发布前进行全量依赖校验
```

依赖关系不要求用户手动填写，应由 EnhancedSqlAnalyzer 自动提取。

## 19. 数据源元数据更新机制

数据库结构可能变化，因此数据源元数据需要版本管理。

每个数据源维护：

```text
metadataVersion
metadataHash
lastSyncTime
syncStatus
```

当元数据刷新后：

```text
1. DataSource Metadata Store 更新。
2. 所有关联该 dataSourceId 的 SQL 步骤标记 needRevalidate。
3. 打开的编辑器重新读取 metadata。
4. 表字段提示更新。
5. SQL 中失效字段可以诊断标红。
```

示例：

原字段：

```text
order_main.order_no
```

变更后：

```text
order_main.order_code
```

SQL 中：

```sql
SELECT om.order_no
FROM order_main om
```

诊断提示：

```text
字段 om.order_no 不存在。
当前表 order_main 包含字段：order_id、order_code、customer_name。
```

## 20. EnhancedSqlAnalyzer 后端分析模块

自动提示、诊断、依赖分析和 SQL 渲染必须共享同一套解析规则。平台不手写 SQL 扫描器，而是在后端基于 `node-sql-parser` 封装分析模块 `EnhancedSqlAnalyzer`。

### 20.1 设计原则

```text
1. EnhancedSqlAnalyzer 是 node-sql-parser 的上层封装，不是替代品。
2. 所有 SQL 语法理解（token 识别、AST 构建、AST → SQL 还原）由 node-sql-parser 完成。
3. EnhancedSqlAnalyzer 只负责平台特有的"增强 SQL"语义：变量提取、条件裁剪、别名解析、诊断校验。
4. 模块只部署在后端（Node.js），不进入前端 bundle。
5. 前端通过两个 HTTP API 获取分析结果（编辑时分析 + 执行时渲染）。
```

### 20.2 模块结构

```text
backend/src/analyzer/
    ├── parser-wrapper.ts       // node-sql-parser 实例管理，方言配置
    ├── variable-extractor.ts   // 从 AST 提取所有 $变量引用
    ├── condition-cutter.ts     // 基于 AST 的 $var? 条件项裁剪
    ├── alias-resolver.ts       // 从 AST 解析 FROM/JOIN 表别名
    ├── clause-detector.ts      // 根据光标位置识别当前 SQL 子句类型
    ├── reference-extractor.ts  // 提取步骤间依赖引用
    ├── validator.ts            // 变量类型校验、可见性校验、LIKE 写法校验
    └── index.ts                // 统一导出 EnhancedSqlAnalyzer 类
```

### 20.3 核心 API

```ts
class EnhancedSqlAnalyzer {
  constructor(options: { dialect: SqlDialect })

  // === 解析 ===
  /** 预处理增强 SQL（替换 $变量 为占位符），返回 { processedSql, varMap } */
  preprocess(sql: string): { processedSql: string; varMap: VariableMap }

  /** 解析增强 SQL 为 AST */
  parse(sql: string): EnhancedSqlAst

  // === 编译缓存 ===
  /** 编译增强 SQL 为 CompiledSqlPlan（保存时调用） */
  compilePlan(sql: string, symbolTable: SymbolTable, schema: JsonSchema): CompiledSqlPlan

  /** 基于已编译的 Plan 执行轻量渲染（每次 API 调用时使用，跳过 parse） */
  renderFromPlan(plan: CompiledSqlPlan, actualParams: Record<string, any>): RenderResult

  // === 变量分析 ===
  /** 提取所有变量引用及其在 AST 中的位置 */
  extractVariables(ast: EnhancedSqlAst): VariableReference[]

  /** 提取当前步骤的依赖引用（用于依赖分析） */
  extractReferences(ast: EnhancedSqlAst): StepReference[]

  // === 条件项裁剪 ===
  /** 识别所有可选条件项（关联 $var? 的最小逻辑条件） */
  findOptionalConditions(ast: EnhancedSqlAst): OptionalCondition[]

  /** 根据变量值裁剪 AST 中的可选条件项，返回裁剪后的 AST */
  trimConditions(ast: EnhancedSqlAst, values: VariableValues): EnhancedSqlAst

  // === 别名解析 ===
  /** 从 FROM / JOIN 子句中解析表别名映射 */
  resolveAliases(ast: EnhancedSqlAst): Map<string, string>

  // === 子句识别 ===
  /** 根据光标位置识别当前 SQL 子句类型 */
  detectClause(ast: EnhancedSqlAst, cursorPos: number): ClauseType

  // === 诊断 ===
  /** 校验变量使用是否合法，返回 Diagnostic 列表 */
  validate(ast: EnhancedSqlAst, symbolTable: SymbolTable): Diagnostic[]

  // === AST → SQL ===
  /** 将（可能裁剪后的）AST 还原为 SQL 字符串 */
  stringify(ast: EnhancedSqlAst): string
}
```

### 20.4 对外暴露的 HTTP API

前端通过两个后端 API 使用 EnhancedSqlAnalyzer 的能力：

**API 1：编辑时分析（debounce 300ms 触发）**

```text
POST /api/sql/analyze

Request:
{
  "sql": "SELECT ... WHERE om.status IN $input.status? ...",
  "dialect": "postgresql",
  "dataSourceId": "mes_pg",
  "stepId": "step_order_query",
  "cursorPos": 128,
  "virtualValues": { "status": ["READY"], "customerName": "test" }
}

Response:
{
  "diagnostics": [
    { "severity": "error", "message": "字段 om.order_numb 不存在", "range": [104, 118] }
  ],
  "previewSql": "SELECT * FROM order_main om WHERE 1=1 AND om.status IN (?, ?)",
  "previewParams": ["READY", "RUNNING"],
  "clauseType": "where",
  "aliasMap": { "om": "order_main" },
  "optionalConditions": [
    { "expression": "AND om.customer_name LIKE %$input.customerName?%", "isEmpty": true }
  ],
  "variables": [
    { "name": "$input.status?", "type": "array", "valid": true },
    { "name": "$input.customerName?", "type": "string", "valid": true, "isEmpty": true }
  ]
}
```

前端拿到响应后更新诊断标红、预览面板和补全上下文。

**API 2：执行时渲染（API 调用时触发）**

```text
由 SQL Renderer 内部调用 EnhancedSqlAnalyzer 完成解析和裁剪，
输出 (renderedSql, params[]) 供 PreparedStatement 使用。
此路径不对前端暴露，是后端内部调用链。
```

### 20.5 部署

```text
node-sql-parser (npm dependency)
    │
    └── backend/src/analyzer/ (EnhancedSqlAnalyzer)
            │
            ├── POST /api/sql/analyze  ← 前端编辑器调用（编辑时）
            │
            └── SQL Renderer 内部调用  ← API 执行时（运行时）
```

前端 bundle 不包含 `node-sql-parser`（0 KB 开销）。前端对 SQL 结构的即时感知通过 `@codemirror/lang-sql` 的 Lezer grammar 提供基础 token 类型，权威分析通过 `/api/sql/analyze` 获取。

## 21. 模块边界与部署拓扑

### 21.0 总体拓扑

```text
┌── 浏览器（前端）────────────────────────────────────────────┐
│                                                              │
│  CodeMirror 6 Editor                                         │
│    ├── @codemirror/lang-sql（Lezer grammar，本地 token）      │
│    ├── Completion Engine ──── 读取 Store + 本地正则推断       │
│    ├── Diagnostics Panel ──── 本地基础诊断 + 后端权威诊断      │
│    └── Preview Panel ──── 后端返回 previewSql 后展示          │
│                                                              │
│  SQL Context（前端轻量）                                      │
│    ├── CM6 Lezer → token 类型（keyword/identifier/string）    │
│    ├── 正则 → $变量 模式匹配                                  │
│    └── debounce 300ms → POST /api/sql/analyze                │
│                                                              │
│  Symbol Store（前端响应式缓存）                                │
│  Metadata Store（前端缓存，按需同步）                          │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP / WebSocket
                       ▼
┌── 服务端（Node.js）──────────────────────────────────────────┐
│                                                              │
│  POST /api/sql/analyze ──── 编辑时分析（前端 debounce 触发）  │
│    ├── EnhancedSqlAnalyzer.preprocess → parse → AST          │
│    ├── EnhancedSqlAnalyzer.validate → diagnostics            │
│    └── EnhancedSqlAnalyzer.trimConditions + stringify        │
│                                                              │
│  SQL Renderer ──── API 执行时调用（内部链路）                  │
│    ├── EnhancedSqlAnalyzer（解析 + 裁剪）                     │
│    ├── 参数占位符生成（方言感知）                              │
│    ├── 白名单映射（x-sql.map）                                │
│    └── 输出 (renderedSql, params[])                          │
│                                                              │
│  Symbol Store（服务端权威源）                                  │
│  Metadata Store（服务端权威源）                                │
│  Workflow Store + Dependency Analyzer                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 21.1 CodeMirror（前端）

负责：

```text
文本编辑
语法高亮（由 @codemirror/lang-sql 提供基础高亮）
自动提示展示（CompletionTooltip）
诊断标红展示（lint extension）
快捷键
编辑器交互
```

不负责：

```text
变量可见性判断
上游依赖分析
SQL 安全渲染
数据库参数绑定
数据源元数据同步
AST 解析与条件裁剪
```

### 21.2 EnhancedSqlAnalyzer（后端模块）

负责：

```text
封装 node-sql-parser 的 parser/stringify 能力
增强 SQL 预处理（$变量 → 占位符，建立映射表）
从 AST 提取变量引用、依赖引用、表别名
基于 AST 识别最小逻辑条件项
基于 AST 裁剪 $var? 条件项并还原 SQL（stringify）
光标位置 → 子句类型识别
变量使用合法性校验
通过 POST /api/sql/analyze 对前端暴露分析结果
```

不负责：

```text
提示项数据生成（由 Completion Engine 负责）
最终安全参数绑定（由 SQL Renderer 负责）
变量可见性判断（由 Symbol Store 负责）
元数据读取（由 Metadata Store 负责）
```

部署：

```text
仅部署在后端（Node.js），不进入前端 bundle。
前端通过 HTTP API 调用分析能力（debounce 300ms）。
API 执行时的安全渲染复用同一 EnhancedSqlAnalyzer 实例。
```

### 21.3 Symbol Store（前端缓存 + 后端权威源）

负责：

```text
根据 Workflow State 生成当前步骤可见变量
合并 inputSchema、globalSchema、localSchema（设计时变量 + 上游步骤输出）
提供变量提示数据（→ Completion Engine）
提供变量校验基础数据（→ EnhancedSqlAnalyzer.validate）
感知 schemaVersion / schemaHash 变化并广播更新
```

部署：

```text
后端维护 Symbol Store 的权威状态。
前端维护响应式缓存。打开编辑器时拉取；上游变化时通过 WebSocket 或轮询增量更新。
```

### 21.4 Metadata Store（前端缓存 + 后端权威源）

负责：

```text
维护数据源元数据（库、Schema、表、视图、字段、字段类型、注释）
维护元数据版本（metadataVersion, metadataHash）
提供数据库对象提示数据（→ DatabaseMetadataCompletionProvider）
感知元数据同步状态
```

部署：

```text
后端定时或手动触发元数据同步，存储全量元数据。
前端按需拉取（打开编辑器时加载当前 dataSourceId 的元数据），支持表名前缀搜索减少传输量。
```

### 21.5 Completion Engine（前端）

负责：

```text
注册和调度不同 Completion Provider
从双源获取 SQL 上下文判断结果：
  - 本地即时源：CM6 Lezer grammar → 基础 token 类型（keyword/identifier/alias.）
  - 后端权威源：/api/sql/analyze 响应 → clauseType, aliasMap
从 Symbol Store / Metadata Store 读取当前提示数据
调用各 Provider 生成 CompletionItem 列表
合并、排序和过滤提示项
输出给 CodeMirror CompletionSource
```

上下文判断策略：

```text
$ 后      → 正则匹配触发，本地 Symbol Store 驱动变量补全（~0ms）
FROM 后   → CM6 Lezer + 后端 API 返回的 clauseType 双重确认
alias. 后 → CM6 Lezer 本地判断（Lezer 对 alias.identifier 有明确 token 类型）
空白位置  → 默认触发关键字补全 + 变量命名空间补全
```

### 21.6 SQL Renderer（后端）

负责：

```text
接收 EnhancedSqlAnalyzer 预处理后的 AST 和 varMap
根据实际参数值 + JSON Schema 生成有序参数列表
对普通值变量生成参数占位符 ?（方言感知）
对数组变量展开为 (?, ?, ...)
对 sql-field / sql-keyword 执行 x-sql.map 白名单映射
调用 EnhancedSqlAnalyzer.stringify() 还原最终 SQL
清理多余 AND / OR / 空括号 / 空 WHERE
输出：(renderedSql, params[]) 供 PreparedStatement 绑定
```

注意：

```text
条件裁剪本身（trimConditions）由 EnhancedSqlAnalyzer 完成，SQL Renderer 只负责参数化。
SQL Renderer 是唯一了解数据库方言占位符格式的模块（PG → $1/$2，MySQL → ?，Oracle → :1/:2）。
```

## 22. 第一版实现范围

第一版建议实现：

```text
核心基础设施：
1. 引入 node-sql-parser 作为后端 SQL 解析引擎（Node.js，不进入前端 bundle）。
2. 实现 EnhancedSqlAnalyzer 后端模块（compilePlan / renderFromPlan / preprocess /
   parse / extractVariables / trimConditions / stringify / validate / detectClause /
   resolveAliases）。
3. 实现 CompiledSqlPlan 编译缓存机制（保存时预编译，API 调用时基于 Plan 轻量渲染）。
4. 实现 POST /api/sql/analyze 编辑时分析 API（前端 debounce 300ms 调用）。

编辑器与提示：
5. CodeMirror 6 SQL 编辑器（@codemirror/lang-sql + autocomplete + lint）。
6. Completion Engine + Provider 注册机制。
7. $input.xxx、$.xxx、$xxx 三类作用域变量提示（local 覆盖设计时变量与步骤输出）。
8. JSON Schema 到 SymbolItem 的转换。
9. $var、$var?、$var! 三种变量形式及修饰符提示。
10. LIKE %$var?% 语法提示。

依赖与诊断：
11. 上游步骤 outputSchema 字段提示。
12. schemaVersion / schemaHash 感知上游变化。
13. 下游 SQL 失效变量标红（前端本地正则检查 + 后端 AST validate 组合）。
14. 变量写在字符串引号内的错误提示。
15. $var! 无 default 时的错误提示。

数据库元数据：
16. 当前步骤绑定 dataSourceId + dialect。
17. 当前数据源表、视图、字段提示。
18. FROM / JOIN 后提示表，alias. 后提示字段。
19. ORDER BY 中 sql-field、sql-keyword 变量提示。

SQL 渲染：
20. 前端通过 /api/sql/analyze 获取预览 SQL（debounce 300ms，后端用虚拟值裁剪 AST）。
21. 后端安全渲染（真实参数绑定 + 白名单映射，API 执行时触发）。
22. 前端预览面板展示渲染后 SQL 和推断参数列表。
```

第一版暂不建议实现：

```text
1. OR 块中部分分支独立使用不同 $var? 的精细裁剪。
2. 子查询内部 WHERE 条件的裁剪。
3. 多表 JOIN 中 ON 条件的级联裁剪。
4. 完整 oneOf / anyOf / allOf JSON Schema 推断。
5. 自动修复所有失效变量（仅做诊断标红，不做自动替换）。
6. 实时使用上游未保存 SQL 半成品刷新下游字段。
7. 跨数据源字段血缘自动推断。
```

## 23. 示例：完整编辑体验

### 23.1 API 输入 Schema

```json
{
  "type": "object",
  "properties": {
    "status": {
      "title": "订单状态",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "customerName": {
      "title": "客户名称",
      "type": "string"
    },
    "sortField": {
      "title": "排序字段",
      "type": "string",
      "enum": ["createTime", "orderNo"],
      "x-sql": {
        "kind": "field",
        "map": {
          "createTime": "om.create_time",
          "orderNo": "om.order_no"
        }
      }
    },
    "sortOrder": {
      "title": "排序方向",
      "type": "string",
      "enum": ["asc", "desc"],
      "default": "desc",
      "x-sql": {
        "kind": "keyword",
        "map": {
          "asc": "ASC",
          "desc": "DESC"
        }
      }
    },
    "pageSize": {
      "title": "每页数量",
      "type": "integer",
      "default": 10
    },
    "offset": {
      "title": "偏移量",
      "type": "integer",
      "default": 0
    }
  }
}
```

### 23.2 用户输入 SQL

```sql
SELECT om.
FROM order_main om
WHERE 1 = 1
AND om.status IN $input.status?
AND om.customer_name LIKE %$input.customerName?%
ORDER BY $input.sortField? $input.sortOrder!
LIMIT $input.pageSize!
OFFSET $input.offset!
```

当光标在 `om.` 后，提示数据源字段：

```text
om.order_id
om.order_no
om.customer_name
om.status
om.create_time
```

当光标在 `$input.` 后，提示输入变量：

```text
$input.status
$input.customerName
$input.sortField
$input.sortOrder
$input.pageSize
$input.offset
```

### 23.3 请求参数

```json
{
  "status": ["READY", "RUNNING"],
  "customerName": "张三",
  "sortField": "createTime"
}
```

### 23.4 渲染后 SQL

```sql
SELECT om.*
FROM order_main om
WHERE 1 = 1
AND om.status IN (?, ?)
AND om.customer_name LIKE ?
ORDER BY om.create_time DESC
LIMIT ?
OFFSET ?
```

### 23.5 参数列表

```text
p1 = "READY"
p2 = "RUNNING"
p3 = "%张三%"
p4 = 10
p5 = 0
```

## 24. 结论

本方案将动态 API 的 SQL 输入定义为“用户直接输入的增强 SQL”。增强 SQL 只扩展三种变量形式：

```text
$var     必填变量
$var?    为空时删除当前最小逻辑条件项
$var!    为空时使用 JSON Schema default
```

变量定义统一使用 JSON Schema。SQL 安全渲染需要的字段名、关键字等非参数化内容通过 `x-sql` 扩展进行白名单映射。

自动提示采用 Provider 架构，既支持 `$input.xxx`、`$.xxx`、`$xxx`（local 含设计时变量与上游步骤输出）三类作用域变量，也兼容未来每个数据源的数据库元数据提示，包括表、视图、字段、字段类型和别名字段提示。

平台通过 Workflow State、Symbol Store、Metadata Store、Completion Engine、EnhancedSqlAnalyzer 和 SQL Renderer 的分层设计，实现 SQL 自由输入、变量动态提示、上游变化感知、数据源元数据提示、诊断标红和安全参数化执行之间的统一。
