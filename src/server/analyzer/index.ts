import { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'

type AnalyzeInput = {
  sql: string
  dialect?: string
}

export class EnhancedSqlAnalyzer {
  analyze(input: AnalyzeInput) {
    return {
      dialect: input.dialect ?? 'postgresql',
      variables: extractVariablesFromSql(input.sql),
      warnings: [],
      previewSql: input.sql.replace(/\$([a-zA-Z_][\w.]*)([?!])?/g, '?'),
    }
  }
}

export { extractVariablesFromSql } from '@/server/analyzer/variable-extractor'
