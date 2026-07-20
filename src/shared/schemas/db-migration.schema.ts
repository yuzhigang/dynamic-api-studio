import { z } from 'zod'

export const dbMigrationStatusSchema = z.enum(['draft', 'applied', 'failed'])

export const dbMigrationSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  dbSchemaId: z.string().optional(),
  status: dbMigrationStatusSchema,
  sql: z.string(),
  generatedFromSnapshot: z.record(z.unknown()),
  errorMessage: z.string().optional(),
  appliedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type DbMigration = z.infer<typeof dbMigrationSchema>

export const generateMigrationRequestSchema = z.object({
  dbSchemaId: z.string().optional(),
})

export type GenerateMigrationRequest = z.infer<typeof generateMigrationRequestSchema>

export const dbMigrationDraftSchema = z.object({
  projectId: z.string().min(1),
  dbSchemaId: z.string().optional(),
  sql: z.string().min(1),
  generatedFromSnapshot: z.record(z.unknown()),
})

export type DbMigrationDraft = z.infer<typeof dbMigrationDraftSchema>
