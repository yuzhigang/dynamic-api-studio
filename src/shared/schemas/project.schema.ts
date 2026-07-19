import { z } from 'zod'

export const projectStatusSchema = z.enum(['active', 'archived'])

export const projectSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: projectStatusSchema,
  dbSourceId: z.string().optional(),
  apiCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Project = z.infer<typeof projectSchema>
export type ProjectStatus = z.infer<typeof projectStatusSchema>

export const projectDraftSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  dbSourceId: z.string().optional(),
})

export type ProjectDraft = z.infer<typeof projectDraftSchema>
