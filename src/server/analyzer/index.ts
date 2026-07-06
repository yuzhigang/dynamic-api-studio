import { createHash } from 'node:crypto'

import { parseSql } from '@/server/analyzer/parser-wrapper'
import { extractVariablesFromSql, preprocessSql } from '@/server/analyzer/variable-extractor'
import { locateVariablesInAst } from '@/server/analyzer/ast-variable-locator'
import { buildOptionalConditionIndex } from '@/server/analyzer/condition-cutter'
import { validateVariableReferences } from '@/server/analyzer/validator'
import { resolveTableAliases } from '@/server/analyzer/alias-resolver'
import type { AnalyzeInput, CompiledSqlPlan, VariableReference } from '@/server/analyzer/types'
import { createVariableContext } from '@/server/analyzer/types'

export class EnhancedSqlAnalyzer {
  analyze(input: AnalyzeInput): CompiledSqlPlan {
    const dialect = input.dialect ?? 'postgresql'
    const sql = input.sql

    const { processedSql, varMap: preprocessVarMap } = preprocessSql(sql)
    const ast = parseSql(processedSql, dialect)

    const extracted = extractVariablesFromSql(sql)
    const locations = locateVariablesInAst(ast)

    // Build position-to-placeholder map from preprocessVarMap
    const positionToPlaceholder = new Map<number, string>()
    for (const [key, value] of Object.entries(preprocessVarMap)) {
      positionToPlaceholder.set(value.from, key)
    }

    // Build placeholder-to-astPath map from locations
    const pathByPlaceholder = new Map<string, string[]>()
    for (const location of locations) {
      pathByPlaceholder.set(location.raw, location.astPath)
    }

    // Match extracted refs to AST locations via placeholder key
    const variableRefs: VariableReference[] = extracted.map((ref) => {
      const placeholderKey = positionToPlaceholder.get(ref.from)
      const astPath = placeholderKey ? pathByPlaceholder.get(placeholderKey) ?? [] : []
      return { ...ref, astPath }
    })

    const optionalConditions = buildOptionalConditionIndex(ast, preprocessVarMap)

    const context = createVariableContext()
    for (const name of input.inputNames ?? []) {
      context.set('input', name, {
        value: undefined,
        type: 'string',
        defaultValue: input.defaults?.[name],
      })
    }
    for (const name of input.globalNames ?? []) {
      context.set('global', name, { value: undefined, type: 'string' })
    }
    for (const name of input.localNames ?? []) {
      context.set('local', name, { value: undefined, type: 'string' })
    }

    const diagnostics = validateVariableReferences(variableRefs, context)

    const varMap: CompiledSqlPlan['varMap'] = {}
    for (const [key, value] of Object.entries(preprocessVarMap)) {
      varMap[key] = {
        scope: value.scope,
        name: value.name,
        dataType: 'string', // TODO: infer from JSON Schema
        mode: value.mode,
        defaultValue: input.defaults?.[value.name],
        propertyPath: value.propertyPath,
      }
    }

    return {
      sourceHash: createHash('sha256').update(sql).digest('hex'),
      schemaHash: createHash('sha256')
        .update(JSON.stringify({
          inputNames: input.inputNames ?? [],
          globalNames: input.globalNames ?? [],
          localNames: input.localNames ?? [],
          defaults: input.defaults ?? {},
        }))
        .digest('hex'),
      dialect,
      processedSql,
      varMap,
      ast,
      variableRefs,
      aliasMap: resolveTableAliases(), // TODO: implement alias resolution
      optionalConditions,
      staticDiagnostics: diagnostics,
      references: [], // TODO: extract step references
    }
  }
}

export { extractVariablesFromSql, preprocessSql } from '@/server/analyzer/variable-extractor'
export {
  createVariableContext,
  VARIABLE_SCOPES,
} from '@/server/analyzer/types'
export type {
  SqlDialect,
  VariableMode,
  SqlKind,
  VariableReference,
  VariableScope,
  VariableValue,
  VariableContext,
  OptionalConditionIndex,
  StaticDiagnostic,
  StepReference,
  VariableInfo,
  CompiledSqlPlan,
  RenderResult,
} from '@/server/analyzer/types'
