import { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'
import type { SqlDialect, CompiledSqlPlan } from '@/server/analyzer/types'

type AnalyzeInput = {
  sql: string
  dialect?: SqlDialect
}

export class EnhancedSqlAnalyzer {
  analyze(input: AnalyzeInput): CompiledSqlPlan {
    const variables = extractVariablesFromSql(input.sql)
    return {
      sourceHash: '',
      schemaHash: '',
      dialect: (input.dialect ?? 'postgresql') as SqlDialect,
      processedSql: input.sql.replace(/\$([a-zA-Z_][\w.]*)([?!])?/g, '?'),
      varMap: {},
      ast: null,
      variableRefs: variables.map((v) => ({
        raw: v.raw,
        from: v.from,
        to: v.to,
        namespace: 'input' as const,
        name: v.name,
        fullPath: `$input.${v.name}`,
        mode: v.mode,
        sqlKind: 'value' as const,
        dataType: 'string',
        astPath: [],
      })),
      aliasMap: {},
      optionalConditions: [],
      staticDiagnostics: [],
      references: [],
    }
  }
}

export { extractVariablesFromSql, preprocessSql } from '@/server/analyzer/variable-extractor'
export type {
  SqlDialect,
  VariableSource,
  VariableMode,
  SqlKind,
  VariableRef,
  OptionalConditionIndex,
  StaticDiagnostic,
  StepReference,
  VariableInfo,
  CompiledSqlPlan,
  RenderResult,
} from '@/server/analyzer/types'

