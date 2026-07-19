import { z } from 'zod'

export const generateCrudOptionsSchema = z.object({
  status: z.enum(['draft', 'published']).optional(),
  pathPrefix: z.string().optional(),
})

export type GenerateCrudOptions = z.infer<typeof generateCrudOptionsSchema>

export const generateCrudResultSchema = z.object({
  jsonSchemaId: z.string().min(1),
  apiIds: z.array(z.string().min(1)),
})

export type GenerateCrudResult = z.infer<typeof generateCrudResultSchema>
