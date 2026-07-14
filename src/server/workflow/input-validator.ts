import type { ApiDefinitionDraft, RequestParam } from '@/shared/schemas/api-definition.schema'

export type InputValidationResult = { ok: true } | { ok: false; errors: Array<{ name: string; message: string }> }

export const SCALAR_TYPES = ['string', 'integer', 'decimal', 'boolean', 'object', 'array'] as const

export function validateInput(api: ApiDefinitionDraft, inputValues: Record<string, unknown>): InputValidationResult {
  const errors: Array<{ name: string; message: string }> = []

  for (const param of api.requestParams as RequestParam[]) {
    const value = inputValues[param.name]
    if (value === undefined || value === null) {
      if (param.required) errors.push({ name: param.name, message: `缺少必填参数 ${param.name}` })
      continue
    }
    if (!matchesScalarType(value, param.type)) {
      errors.push({ name: param.name, message: `参数 ${param.name} 应为 ${param.type}` })
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors }
}

function matchesScalarType(value: unknown, type: (typeof SCALAR_TYPES)[number]): boolean {
  switch (type) {
    case 'string': return typeof value === 'string'
    case 'integer': return typeof value === 'number' && Number.isInteger(value)
    case 'decimal': return typeof value === 'number'
    case 'boolean': return typeof value === 'boolean'
    case 'array': return Array.isArray(value)
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value)
  }
}