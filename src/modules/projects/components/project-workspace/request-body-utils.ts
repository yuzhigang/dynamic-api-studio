import type { RequestParam } from '@/shared/contracts/api-definition.contract'

type ScalarType = RequestParam['type']

const typeLabels: Record<ScalarType, string> = {
  string: 'string',
  integer: 'integer',
  decimal: 'decimal',
  boolean: 'boolean',
  object: 'object',
  array: 'array',
}

function typeDefault(type: ScalarType): unknown {
  switch (type) {
    case 'string':
      return ''
    case 'integer':
    case 'decimal':
      return 0
    case 'boolean':
      return false
    case 'object':
      return {}
    case 'array':
      return []
  }
}

/** 按参数类型解析 example 字符串，无法解析时回退到该类型的默认值。 */
function parseExample(type: ScalarType, example: string): unknown {
  const fallback = typeDefault(type)

  switch (type) {
    case 'string':
      return example
    case 'integer': {
      const parsed = Number.parseInt(example, 10)
      return Number.isNaN(parsed) ? fallback : parsed
    }
    case 'decimal': {
      const parsed = Number.parseFloat(example)
      return Number.isNaN(parsed) ? fallback : parsed
    }
    case 'boolean':
      if (example === 'true') return true
      if (example === 'false') return false
      return fallback
    case 'object':
    case 'array': {
      try {
        const parsed: unknown = JSON.parse(example)
        return matchesType(type, parsed) ? parsed : fallback
      } catch {
        return fallback
      }
    }
  }
}

/** 根据 body 参数定义构建一份默认请求体对象，优先采用合法的 example。 */
export function buildRequestBodyTemplate(params: readonly RequestParam[]): Record<string, unknown> {
  const template: Record<string, unknown> = {}

  for (const param of params) {
    if (param.location !== 'body') {
      continue
    }

    template[param.name] =
      param.example != null && param.example !== ''
        ? parseExample(param.type, param.example)
        : typeDefault(param.type)
  }

  return template
}

function matchesType(type: ScalarType, value: unknown): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'decimal':
      return typeof value === 'number'
    case 'boolean':
      return typeof value === 'boolean'
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'array':
      return Array.isArray(value)
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 校验请求体是否符合 body 参数定义。
 * 返回错误信息（多条以换行分隔），全部通过时返回 null。
 * 必填判定为「键存在且非 null」，不强制非空字符串，避免刚生成的模板即报错。
 */
export function validateRequestBody(
  parsed: unknown,
  params: readonly RequestParam[],
): string | null {
  if (!isPlainObject(parsed)) {
    return '请求体必须是 JSON 对象'
  }

  const errors: string[] = []

  for (const param of params) {
    if (param.location !== 'body') {
      continue
    }

    const present = param.name in parsed
    const value = parsed[param.name]

    if (param.required && (!present || value === null || value === undefined)) {
      errors.push(`缺少必填参数：${param.name}`)
      continue
    }

    if (present && value !== null && value !== undefined && !matchesType(param.type, value)) {
      errors.push(`参数 ${param.name} 类型应为 ${typeLabels[param.type]}`)
    }
  }

  return errors.length > 0 ? errors.join('\n') : null
}
