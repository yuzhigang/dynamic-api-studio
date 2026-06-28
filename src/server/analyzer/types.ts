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
