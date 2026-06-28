import { z } from 'zod'

import { globalVariableKindSchema } from '@/shared/schemas/global-variable.schema'

export const projectVariableSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  kind: globalVariableKindSchema,
  value: z.string(),
  items: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProjectVariable = z.infer<typeof projectVariableSchema>

export const projectVariableDraftSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, '请输入变量名')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '变量名须以字母或下划线开头，仅含字母、数字、下划线'),
  label: z.string().min(1, '请输入显示名'),
  kind: globalVariableKindSchema,
  value: z.string(),
  items: z.array(z.string()),
})

export type ProjectVariableDraft = z.infer<typeof projectVariableDraftSchema>
