import {
  apiDefinitionDraftSchema,
  type ApiDefinitionDraft,
} from '@/shared/contracts/api-definition.contract'

export function normalizeApiDefinition(apiDefinition: ApiDefinitionDraft): ApiDefinitionDraft {
  return apiDefinitionDraftSchema.parse({
    ...apiDefinition,
    tags: apiDefinition.tags.map((tag) => tag.trim()).filter(Boolean),
    permissions: apiDefinition.permissions.map((permission) => permission.trim()).filter(Boolean),
  })
}
