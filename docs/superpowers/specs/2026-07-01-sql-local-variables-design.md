# SQL 解析与 API Local 变量设计

## 背景

Dynamic API Studio 的 SQL 编辑器需要支持三类变量引用：

- `$input.xxx`：API 查询参数
- `$.xxx`：平台/项目全局变量和函数
- `$xxx`：API 内部局部变量

当前实现存在以下问题：

1. `$xxx` 被错误识别为 `global` namespace
2. 不支持 `$orders[].id` 这类数组属性访问
3. API 设计时变量和步骤输出变量没有统一模型
4. 表达式求值和 SQL 渲染使用两套上下文

本设计引入统一的 `VariableContext`，规范变量命名空间、local 变量模型、表达式引擎、SQL 渲染和工作流执行规则。

---

## 1. 统一变量上下文（VariableContext）

### 1.1 设计思路

不再把 `input` / `global` / `local` 作为三个独立的 `Record<string, unknown>` 传递，而是统一成一个 `VariableContext`。所有需要访问变量的地方（SQL 解析、表达式求值、工作流执行、前端补全）都基于这个上下文。

### 1.2 核心接口

```ts
export type VariableNamespace = 'input' | 'global' | 'local'

export type VariableValue = {
  value: unknown
  type: string        // string | integer | decimal | boolean | array | object
  itemType?: string   // array 时元素类型
  nullable?: boolean
  defaultValue?: unknown
}

export type VariableContext = {
  has(namespace: VariableNamespace, name: string): boolean
  get(namespace: VariableNamespace, name: string): VariableValue | undefined
  set(namespace: VariableNamespace, name: string, value: VariableValue): void
  keys(namespace: VariableNamespace): string[]
  merge(other: VariableContext): VariableContext
}
```

### 1.3 变量唯一标识

变量在内部统一用 `{ namespace, name }` 标识：

- `$input.pageSize` → `{ namespace: 'input', name: 'pageSize' }`
- `$.tenantId` → `{ namespace: 'global', name: 'tenantId' }`
- `$orders` → `{ namespace: 'local', name: 'orders' }`
- `$orders[].id` → 基础变量 `{ namespace: 'local', name: 'orders' }`，访问路径 `['id']`

---

## 2. 变量命名空间与引用语法

### 2.1 语法规则

| 写法 | namespace | mode | 说明 |
|------|-----------|------|------|
| `$input.xxx` | `input` | required | API 查询参数 |
| `$input.xxx?` | `input` | optional | 为空时删除所在条件 |
| `$input.xxx!` | `input` | defaulted | 为空时使用默认值 |
| `$.xxx` | `global` | required/optional/defaulted | 全局变量/函数 |
| `$xxx` | `local` | required/optional/defaulted | API 内部变量 |
| `$orders?[].id` | `local` | optional | 数组属性访问 |

### 2.2 解析结果结构

```ts
export type VariableReference = {
  namespace: VariableNamespace
  name: string
  mode: 'required' | 'optional' | 'defaulted'
  propertyPath?: string[]        // ['id'] for $orders[].id
  raw: string
  from: number
  to: number
}
```

### 2.3 关键规则

1. **所有 namespace 统一后缀语义**：
   - 无后缀 → required
   - `?` → optional
   - `!` → defaulted

2. **数组属性访问**：
   - 支持 `$orders[].id`、`$orders?[].id`、`$orders![]?.id` 等组合
   - `[]` 后的 `.id` 作为 `propertyPath`
   - 暂不支持嵌套数组或下标

3. **默认值规则**：
   - `defaulted` 模式且未显式声明 `defaultValue` 时，使用类型默认值
   - 类型默认值映射：
     - `string` → `''`
     - `integer` → `0`
     - `decimal` → `0`
     - `boolean` → `false`
     - `array` → `[]`
     - `object` → `{}`

---

## 3. API 设计时 Local 变量模型

### 3.1 持久化结构

每个 API 定义中包含 `localVariables` 数组：

```ts
export type ApiLocalVariable = {
  id: string
  name: string
  type: string                    // string | integer | decimal | boolean | array | object
  itemType?: string               // array/object 时元素类型
  mode: 'required' | 'optional' | 'defaulted'
  defaultValue?: unknown          // defaulted 模式使用
  value: {
    kind: 'literal' | 'expression'
    literal?: unknown            // kind = literal 时使用
    expression?: string          // kind = expression 时使用，JS 脚本
  }
}
```

### 3.2 计算规则

1. **常量变量**：`kind = 'literal'`，直接返回 `literal`
2. **表达式变量**：`kind = 'expression'`，用 `evalExpression` 求值
3. **依赖**：表达式可引用 `input`、`global`、其他 `local` 变量
4. **顺序**：保存前做拓扑排序，循环依赖不允许保存

### 3.3 示例

```ts
{
  name: 'pageSize',
  type: 'integer',
  mode: 'defaulted',
  defaultValue: 10,
  value: { kind: 'expression', expression: '$input.pageSize' }
},
{
  name: 'offset',
  type: 'integer',
  mode: 'required',
  value: { kind: 'expression', expression: '($pageSize - 1) * $input.pageNo' }
}
```

### 3.4 设计时校验

保存 API 时校验：

- `name` 不能和 input、global、其他 local、步骤输出变量重名
- 表达式引用的变量必须存在
- 无循环依赖
- `defaultValue` 类型和声明类型一致

---

## 4. 步骤输出变量与工作流执行

### 4.1 步骤配置

每个工作流步骤包含一个可选的 `outputVariable` 字段：

```ts
export type WorkflowStep = {
  id: string
  name: string
  type: 'sql-query' | 'js-transform' | ...
  outputVariable?: string        // 输出变量名，如 'orders'
  condition?: string             // 可选的执行条件表达式
  config: Record<string, unknown>
}
```

### 4.2 执行流程

1. **初始化 VariableContext**
   - 注入 `input` 参数
   - 注入 `global` 变量/函数
   - 按拓扑顺序计算 API 设计时 `local` 变量，注入上下文

2. **按顺序执行步骤**
   - 对每个步骤：
     - 评估 `condition` 表达式（如果有），决定是否执行
     - 如果执行，步骤产生结果
     - 如果 `outputVariable` 有值，把结果写入 `local.<outputVariable>`
     - 如果跳过，`local.<outputVariable>` 设置为空值（按类型默认值）

3. **步骤内部引用规则**
   - 步骤的 SQL / JS 脚本中可以引用：
     - `input` 参数
     - `global` 变量/函数
     - API 设计时 `local` 变量
     - 当前步骤之前所有步骤的输出变量
   - 不能引用后续步骤的输出变量

### 4.3 类型推断

SQL 查询步骤的输出 schema 从 SELECT 列表推断：

- `SELECT om.order_id, om.order_no FROM order_main om` → `orders` 类型为 `array<{ order_id, order_no }>`
- 推断出的类型写入 VariableContext，供后续步骤补全和校验使用

---

## 5. SQL 渲染改造

### 5.1 核心改造点

`renderFromPlan` 不再分别处理 `input` / `global` / `local`，而是统一通过 `VariableContext` 取值。

### 5.2 变量取值规则

```ts
function resolveVariableValue(ref: VariableReference, context: VariableContext): unknown {
  const variable = context.get(ref.namespace, ref.name)
  if (!variable) {
    if (ref.mode === 'optional') return undefined
    if (ref.mode === 'defaulted') return getDefaultValue(ref)
    throw new Error(`变量 ${ref.raw} 没有值`)
  }

  let value = variable.value

  // 数组属性访问：$orders[].id
  if (ref.propertyPath && variable.type === 'array') {
    value = (value as unknown[]).map(item => getProperty(item, ref.propertyPath!))
  }

  if (ref.mode === 'optional' && isEmpty(value)) return undefined
  if (ref.mode === 'defaulted' && isEmpty(value)) {
    return variable.defaultValue ?? getTypeDefaultValue(variable.type)
  }

  return value
}
```

### 5.3 IN 子句数组展开

当 `VariableReference` 出现在 `IN (...)` 中且值为数组时：

- `$input.statuses` → 直接展开为多个 `?`
- `$orders[].id` → 先提取每个元素的 `id`，再展开为多个 `?`

```ts
// SQL: om.order_id IN ($orders[].id)
// 渲染后: om.order_id IN (?, ?, ?)
// params: [1, 2, 3]
```

### 5.4 边界

- 数组变量暂时只支持出现在 `IN` 子句中
- 非 IN 场景后续按方言扩展

---

## 6. 表达式引擎与 VariableContext 集成

### 6.1 表达式语法

表达式就是 JS 脚本，变量引用写法与 SQL 中一致：

```js
($input.pageSize - 1) * $input.pageNo
$.getMin($input.a, $input.b)
$orders.map(o => o.id)
```

### 6.2 变量引用转换

执行前把表达式中的引用转换为沙箱变量名：

```ts
function transformExpression(code: string): string {
  return code
    .replace(/\$input\.([a-zA-Z_][\w.]*)/g, 'input.$1')
    .replace(/\$\.([a-zA-Z_][\w.]*)/g, 'global.$1')
    .replace(/\$([a-zA-Z_][\w.]*)/g, 'local.$1')
}
```

### 6.3 上下文构造

从 `VariableContext` 中提取三个 namespace 的值，构造表达式执行上下文：

```ts
function buildExpressionContext(context: VariableContext): ExpressionContext {
  return {
    input: extractValues(context, 'input'),
    global: extractValues(context, 'global'),
    local: extractValues(context, 'local'),
  }
}
```

### 6.4 local 变量拓扑排序

API 设计时 local 变量如果互相引用，需要按依赖顺序求值：

```ts
function evaluateLocalVariables(
  localVariables: ApiLocalVariable[],
  context: VariableContext
): VariableContext {
  const graph = buildDependencyGraph(localVariables)
  const order = topologicalSort(graph)
  const newContext = context.clone()

  for (const variable of order) {
    if (variable.value.kind === 'literal') {
      newContext.set('local', variable.name, toVariableValue(variable, variable.value.literal))
    } else {
      const exprContext = buildExpressionContext(newContext)
      const value = evalExpression(variable.value.expression, exprContext)
      newContext.set('local', variable.name, toVariableValue(variable, value))
    }
  }

  return newContext
}
```

### 6.5 函数调用

`$.getMin` 作为 `global.getMin` 注入，表达式中直接调用：

```js
$.getMin($input.a, $input.b)
// 转换后
global.getMin(input.a, input.b)
```

---

## 7. 前端补全与诊断

### 7.1 变量列表来源

前端构建当前步骤可用的 `VariableContext` 快照：

```ts
function buildCompletionContext(
  apiDefinition: ApiDefinition,
  currentStepIndex: number
): VariableContextSnapshot {
  return {
    input: apiDefinition.inputParameters,
    global: apiDefinition.availableGlobalVariables,
    local: [
      ...apiDefinition.localVariables,
      ...apiDefinition.workflowSteps.slice(0, currentStepIndex).map(s => ({
        name: s.outputVariable,
        type: inferredType(s),
      })),
    ],
  }
}
```

### 7.2 补全分类

CodeMirror 补全面板分三组展示：

- **Input**：`$input.pageSize`、`$input.status?`
- **Global**：`$.tenantId`、`$.getMin`
- **Local**：`$offset`、`$orders`、`$orders[].id`

每组显示类型和来源（设计时变量 / 步骤输出）。

### 7.3 诊断

SQL 分析请求增加 `localNames` 参数：

```ts
POST /api/sql/analyze
{
  sql: "...",
  localNames: ["offset", "orders"],
  globalNames: ["tenantId", "getMin"],
  inputNames: ["pageSize", "pageNo"]
}
```

后端返回的诊断包括：

- 变量未定义
- 后续步骤变量提前引用
- local 变量循环依赖（保存 API 时）
- 类型不匹配

### 7.4 表达式编辑器补全

API 变量定义区的表达式编辑器也用同一套补全，但过滤掉当前正在编辑的变量自身（避免自引用）和后续步骤输出变量。

---

## 8. 测试策略

### 8.1 单元测试

- `variable-extractor`：覆盖所有 namespace、模式后缀、数组属性访问
- `validator`：覆盖未定义变量、类型不匹配、顺序引用
- `render-from-plan`：覆盖变量取值、数组展开、optional 条件裁剪、defaulted 默认值
- `expression-evaluator`：覆盖变量替换、函数调用、算术运算

### 8.2 集成测试

- `EnhancedSqlAnalyzer` 端到端：解析 → 校验 → 渲染
- 工作流执行器：local 变量计算 → 步骤执行 → 输出注入 → 下一步引用

### 8.3 边界测试

- 循环依赖检测
- 步骤被跳过后的空值处理
- 数组变量在非 IN 子句中的报错
- 同名变量冲突校验

---

## 9. 实现范围

涉及文件（预估）：

- `src/server/analyzer/types.ts`：扩展 `VariableSource` 为 `VariableNamespace`，新增 `VariableContext`
- `src/server/analyzer/variable-extractor.ts`：修改正则，支持 local 和数组属性访问
- `src/server/analyzer/validator.ts`：基于 `VariableContext` 校验
- `src/server/analyzer/render-from-plan.ts`：统一取值，支持数组属性展开
- `src/server/expression/expression-evaluator.ts`：已存在，补充上下文构造
- `src/server/workflow/`（新建）：工作流执行器、local 变量求值、拓扑排序
- `src/shared/schemas/api-definition.schema.ts`：增加 `localVariables` 和 `outputVariable`
- `src/components/editors/extensions/variable-completion.ts`：分类补全
- `src/server/routes/sql-analyze.route.ts`、`sql-test.route.ts`：增加 `localNames` / `localValues`
