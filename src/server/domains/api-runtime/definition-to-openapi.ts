import { createRoute, z } from '@hono/zod-openapi'

import type { ApiDefinitionDraft, RequestParam, SchemaField } from '@/shared/schemas/api-definition.schema'

type ScalarType = RequestParam['type']
type Loc = 'query' | 'header' | 'body'

function scalarSchema(type: ScalarType, location: Loc): z.ZodTypeAny {
  const coerce = location !== 'body' // query/header arrive as strings
  switch (type) {
    case 'string': return z.string()
    case 'integer': return coerce ? z.coerce.number().int() : z.number().int()
    case 'decimal': return coerce ? z.coerce.number() : z.number()
    case 'boolean': return coerce
      ? z.preprocess((v) => (typeof v === 'boolean' ? v : String(v) === 'true'), z.boolean())
      : z.boolean()
    case 'array': return z.array(z.unknown())
    case 'object': return z.record(z.unknown())
  }
}

function objectForParams(params: RequestParam[], loc: Loc): z.ZodObject<z.ZodRawShape> | undefined {
  if (params.length === 0) return undefined
  const shape: z.ZodRawShape = {}
  for (const p of params) {
    const base = scalarSchema(p.type, loc)
    shape[p.name] = p.required ? base : base.optional()
  }
  return z.object(shape)
}

function requestSchemaFor(def: ApiDefinitionDraft) {
  const byLoc = (loc: RequestParam['location']) => def.requestParams.filter((p) => p.location === loc)
  const query = objectForParams(byLoc('query'), 'query')
  const headers = objectForParams(byLoc('header'), 'header')
  const bodyParams = byLoc('body')
  const body = bodyParams.length > 0 && def.bodyContentType === 'json'
    ? { content: { 'application/json': { schema: objectForParams(bodyParams, 'body')! } } }
    : undefined
  const request: Record<string, unknown> = {}
  if (query) request.query = query
  if (headers) request.headers = headers
  if (body) request.body = body
  return request
}

function responseFieldSchema(field: SchemaField): z.ZodTypeAny {
  if (field.type === 'object' && field.children && field.children.length > 0) {
    const shape: z.ZodRawShape = {}
    for (const child of field.children) {
      shape[child.name] = child.required ? responseFieldSchema(child) : responseFieldSchema(child).optional()
    }
    return z.object(shape)
  }
  if (field.type === 'array') return z.array(z.unknown())
  return scalarSchema(field.type, 'body')
}

function responseSchema(def: ApiDefinitionDraft): z.ZodTypeAny {
  if (def.responseSchema.length === 0) return z.unknown()
  const shape: z.ZodRawShape = {}
  for (const field of def.responseSchema) {
    shape[field.name] = field.required ? responseFieldSchema(field) : responseFieldSchema(field).optional()
  }
  return z.object(shape)
}

const errorSchema = z.object({ code: z.string(), message: z.string(), details: z.unknown() })

/** Translate an API definition into a zod-openapi route (for routing + OpenAPI doc). */
export function buildRoute(def: ApiDefinitionDraft) {
  return createRoute({
    method: def.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: def.path,
    request: requestSchemaFor(def) as Parameters<typeof createRoute>[0]['request'],
    responses: {
      200: { content: { 'application/json': { schema: responseSchema(def) } }, description: '成功' },
      400: { content: { 'application/json': { schema: errorSchema } }, description: '输入非法' },
      500: { content: { 'application/json': { schema: errorSchema } }, description: '执行失败' },
    },
    summary: def.name,
    description: def.description,
    tags: def.tags,
  })
}