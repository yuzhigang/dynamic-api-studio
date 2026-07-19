import { z } from 'zod'

export const customFunctionScopeSchema = z.enum(['global', 'project'])

export const customFunctionSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().optional(),
  scope: customFunctionScopeSchema,
  name: z.string().min(1),
  label: z.string().nullable().optional(),
  language: z.string().default('javascript'),
  inputSchema: z.array(z.record(z.unknown())).default([]),
  body: z.string().min(1),
  outputSchema: z.array(z.record(z.unknown())).default([]),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type CustomFunction = z.infer<typeof customFunctionSchema>

export const customFunctionDraftSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().optional(),
  scope: customFunctionScopeSchema.default('project'),
  name: z.string().min(1, '请输入函数名称'),
  label: z.string().nullable().optional(),
  language: z.string().default('javascript'),
  inputSchema: z.array(z.record(z.unknown())).default([]),
  body: z.string().min(1, '请输入函数体'),
  outputSchema: z.array(z.record(z.unknown())).default([]),
  description: z.string().optional(),
})

export type CustomFunctionDraft = z.infer<typeof customFunctionDraftSchema>
