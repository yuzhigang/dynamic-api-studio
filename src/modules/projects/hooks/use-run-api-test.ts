import { useMutation } from '@tanstack/react-query'

import { runApiDraftTest } from '@/modules/projects/services/api-test.api'
import type { ApiTestRequest } from '@/shared/contracts/api-definition.contract'

export function useRunApiTest() {
  return useMutation({
    mutationFn: (request: ApiTestRequest) =>
      runApiDraftTest(request.apiDefinition.projectId, request),
  })
}
