import { useMutation } from '@tanstack/react-query'

import { testConnection } from '@/modules/data-source/services/data-source.api'

export function useTestConnection() {
  return useMutation({
    mutationFn: testConnection,
  })
}
