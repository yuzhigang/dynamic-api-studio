import { z } from 'zod'

import { httpMethods } from '@/shared/enums/http-method'

export const requestParamLocationSchema = z.enum(['query', 'body', 'header'])
export const scalarTypeSchema = z.enum(['string', 'integer', 'decimal', 'boolean', 'object', 'array'])

export const requestParamSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  location: requestParamLocationSchema,
  type: scalarTypeSchema,
  required: z.boolean(),
  example: z.string().optional(),
  description: z.string().optional(),
})

export type RequestParam = z.infer<typeof requestParamSchema>

export type SchemaField = {
  id: string
  name: string
  type: z.infer<typeof scalarTypeSchema>
  required: boolean
  description?: string
  children?: SchemaField[]
}

export const schemaFieldSchema: z.ZodType<SchemaField> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string().min(1),
    type: scalarTypeSchema,
    required: z.boolean(),
    description: z.string().optional(),
    children: z.array(schemaFieldSchema).optional(),
  }),
)

export const workflowStepKindSchema = z.enum(['sql-query', 'js-transform'])

export const apiLocalVariableSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: scalarTypeSchema,
  itemType: z.string().optional(),
  mode: z.enum(['required', 'optional', 'defaulted']),
  defaultValue: z.unknown().optional(),
  value: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('literal'), literal: z.unknown() }),
    z.object({ kind: z.literal('expression'), expression: z.string().min(1) }),
  ]),
})

export type ApiLocalVariable = z.infer<typeof apiLocalVariableSchema>

export const workflowStepSchema = z.object({
  id: z.string(),
  kind: workflowStepKindSchema,
  title: z.string().min(1),
  datasourceId: z.string().optional(),
  outputVariable: z.string().min(1),
  condition: z.string().optional(),
  multipleRows: z.boolean().optional(),
  role: z.string().optional(),
  sql: z.string().optional(),
  script: z.string().optional(),
})

export type WorkflowStep = z.infer<typeof workflowStepSchema>

export const apiDefinitionDraftSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  status: z.enum(['draft', 'published']),
  name: z.string().min(1),
  path: z.string().min(1),
  method: z.enum(httpMethods),
  tags: z.array(z.string()),
  permissions: z.array(z.string()),
  requireAuth: z.boolean().default(true),
  description: z.string().optional(),
  bodyContentType: z.enum(['x-www-form-urlencoded', 'json', 'form-data']),
  requestParams: z.array(requestParamSchema),
  responseSchema: z.array(schemaFieldSchema),
  localVariables: z.array(apiLocalVariableSchema).default([]),
  workflowSteps: z.array(workflowStepSchema),
})

export type ApiDefinitionDraft = z.infer<typeof apiDefinitionDraftSchema>

export const apiDefinitionSummarySchema = z.object({
  id: z.string(),
  projectId: z.string().min(1),
  name: z.string(),
  path: z.string(),
  method: z.enum(httpMethods),
  status: z.enum(['draft', 'published']),
  updatedAt: z.string(),
})

export type ApiDefinitionSummary = z.infer<typeof apiDefinitionSummarySchema>

export const apiTestRequestSchema = z.object({
  apiDefinition: apiDefinitionDraftSchema,
  params: z.record(z.string(), z.unknown()),
})

export type ApiTestRequest = z.infer<typeof apiTestRequestSchema>

export const executionLogSchema = z.object({
  time: z.string(),
  step: z.string(),
  status: z.enum(['success', 'failed']),
  durationMs: z.number(),
})

export type ExecutionLog = z.infer<typeof executionLogSchema>

export const apiTestResultSchema = z.object({
  statusCode: z.number(),
  durationMs: z.number(),
  size: z.string(),
  requestPreview: z.unknown(),
  response: z.unknown(),
  logs: z.array(executionLogSchema),
})

export type ApiTestResult = z.infer<typeof apiTestResultSchema>
