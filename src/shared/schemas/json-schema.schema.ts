import { z } from 'zod'

export const jsonSchemaKindSchema = z.enum(['request', 'response', 'variable-namespace'])

export type JsonSchemaKind = z.infer<typeof jsonSchemaKindSchema>

export const jsonSchemaSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1).optional(),
  name: z.string().min(1),
  kind: jsonSchemaKindSchema,
  content: z.record(z.unknown()),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type JsonSchema = z.infer<typeof jsonSchemaSchema>

export const jsonSchemaDraftSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1).optional(),
  name: z.string().min(1),
  kind: jsonSchemaKindSchema,
  content: z.record(z.unknown()),
  description: z.string().optional(),
})

export type JsonSchemaDraft = z.infer<typeof jsonSchemaDraftSchema>
