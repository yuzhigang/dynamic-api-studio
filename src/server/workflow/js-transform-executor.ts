import type { VariableContext } from '@/server/analyzer/types'
import type { WorkflowStep } from '@/shared/schemas/api-definition.schema'
import { extractRawValues } from '@/server/workflow/variable-binder'

const RESERVED = new Set(['input', 'global'])
const IDENT = /^[A-Za-z_$][\w$]*$/
const JS_RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do',
  'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield', 'await', 'enum', 'implements', 'interface', 'package', 'private',
  'protected', 'public', 'static', 'null', 'true', 'false',
])

export class JsTransformError extends Error {
  constructor(stepId: string, scriptSnippet: string, message: string) {
    super(`js-transform 步骤 ${stepId} 执行失败：${message}`)
    this.name = 'JsTransformError'
    void scriptSnippet
  }
}

/** Execute a js-transform step's script via named-parameter injection. */
export async function executeJsTransform(step: WorkflowStep, context: VariableContext): Promise<unknown> {
  const input = extractRawValues(context, 'input')
  const global = extractRawValues(context, 'global')
  const local = extractRawValues(context, 'local')
  const localNames = Object.keys(local)

  guardValidIdentifiers(localNames)

  const fn = new Function('input', 'global', ...localNames, step.script ?? '')
  try {
    return await fn(input, global, ...localNames.map((name) => local[name]))
  } catch (error) {
    throw new JsTransformError(step.id, step.script ?? '', error instanceof Error ? error.message : String(error))
  }
}

function guardValidIdentifiers(names: string[]): void {
  for (const name of names) {
    if (!IDENT.test(name) || JS_RESERVED.has(name) || RESERVED.has(name)) {
      throw new Error(`非法变量名：${name}`)
    }
  }
}