export type AnalyzeInput = {
  sql: string
  dialect?: SqlDialect
  inputNames?: string[]
  globalNames?: string[]
  defaults?: Record<string, unknown>
}

export type SqlDialect = 'postgresql' | 'mysql' | 'oracle' | 'sqlserver'

export type VariableSource = 'input' | 'global'

export type VariableMode = 'required' | 'optional' | 'defaulted'

export type SqlKind = 'value' | 'field' | 'keyword' | 'like-pattern'

export type VariableRef = {
  /** 原始文本，如 "$.region?" */
  raw: string

  /** 变量在 SQL 原文中的起始位置 */
  from: number

  /** 变量在 SQL 原文中的结束位置 */
  to: number

  /** 命名空间 */
  namespace: VariableSource

  /** 变量名，如 "region"、"status" */
  name: string

  /** 不带后缀的完整路径，如 "$.region" */
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

export type OptionalConditionIndex = {
  /** 关联的变量路径，例如 "$.status?" */
  variablePath: string

  /** 条件项在 AST 中的定位路径 */
  astPath: string[]

  /** 条件项类型 */
  conditionType: 'and-condition' | 'or-block' | 'between-expr'

  /** 如果是 BETWEEN，同时关联的另一个变量 */
  siblingVariablePath?: string
}

export type StaticDiagnostic = {
  from: number
  to: number
  severity: 'error' | 'warning'
  message: string
}

export type StepReference = {
  stepName: string
  variablePath: string
}

export type VariableInfo = {
  namespace: VariableSource
  name: string
  dataType: string
  defaultValue?: unknown
}

export type CompiledSqlPlan = {
  sourceHash: string
  schemaHash: string
  dialect: SqlDialect
  processedSql: string
  varMap: Record<string, VariableInfo>
  /** 预解析的 AST（可序列化存储） TODO: replace `unknown` with concrete SerializedAst once AST shape stabilizes */
  ast: unknown
  variableRefs: VariableRef[]
  aliasMap: Record<string, string>
  optionalConditions: OptionalConditionIndex[]
  staticDiagnostics: StaticDiagnostic[]
  references: StepReference[]
}

export type RenderResult = {
  sql: string
  params: Array<{ value: unknown; type: string }>
}

export type AstVariableLocation = {
  raw: string
  astPath: string[]
}

/** 变量作用域常量集合，避免在 clone/merge 中硬编码作用域列表 */
export const VARIABLE_SCOPES = ['input', 'global', 'local'] as const

/** SQL 变量作用域：输入参数 / 全局变量 / API 局部变量 */
export type VariableScope = (typeof VARIABLE_SCOPES)[number]

/** 变量在上下文中的包装值，包含原始值与类型元数据 */
export type VariableValue = {
  value: unknown
  type: string
  itemType?: string
  nullable?: boolean
  defaultValue?: unknown
}

/** 变量上下文接口，按作用域统一管理变量的存取、克隆与合并 */
export type VariableContext = {
  has(scope: VariableScope, name: string): boolean
  get(scope: VariableScope, name: string): VariableValue | undefined
  set(scope: VariableScope, name: string, value: VariableValue): void
  keys(scope: VariableScope): string[]
  clone(): VariableContext
  merge(other: VariableContext): VariableContext
}

/** 创建空的变量上下文，支持 input / global / local 三个作用域 */
export function createVariableContext(): VariableContext {
  const store: Record<VariableScope, Record<string, VariableValue>> = {
    input: {},
    global: {},
    local: {},
  }

  return {
    has(scope, name) {
      return name in store[scope]
    },
    get(scope, name) {
      return store[scope][name]
    },
    set(scope, name, value) {
      store[scope][name] = value
    },
    keys(scope) {
      return Object.keys(store[scope])
    },
    clone() {
      const next = createVariableContext()
      for (const scope of VARIABLE_SCOPES) {
        for (const [name, value] of Object.entries(store[scope])) {
          next.set(scope, name, structuredClone(value))
        }
      }
      return next
    },
    merge(other) {
      const next = this.clone()
      for (const scope of VARIABLE_SCOPES) {
        for (const name of other.keys(scope)) {
          const value = other.get(scope, name)
          if (value !== undefined) {
            next.set(scope, name, structuredClone(value))
          }
        }
      }
      return next
    },
  }
}
