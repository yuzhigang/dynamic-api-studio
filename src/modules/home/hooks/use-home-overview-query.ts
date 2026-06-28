import { useQuery } from '@tanstack/react-query'

import { getHomeOverview } from '@/modules/home/services/home-overview.api'
import { homeOverviewQueryKeys } from '@/modules/home/services/home-overview-query-keys'

export function useHomeOverviewQuery() {
  return useQuery({
    queryKey: homeOverviewQueryKeys.overview(),
    queryFn: getHomeOverview,
  })
}
