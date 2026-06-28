import { AppPage } from '@/layouts/app-shell/app-page'
import { InvocationLogSection } from '@/modules/home/components/invocation-log-section'
import { MetricGrid } from '@/modules/home/components/metric-grid'
import { RecentProjectsSection } from '@/modules/home/components/recent-projects-section'
import { useHomeOverviewQuery } from '@/modules/home/hooks/use-home-overview-query'

export function HomeOverviewPage() {
  const query = useHomeOverviewQuery()

  return (
    <AppPage>
      <div className="h-full space-y-5 overflow-auto p-5">
        <MetricGrid metrics={query.data?.metrics} />
        <RecentProjectsSection projects={query.data?.recentProjects ?? []} loading={query.isLoading} />
        <InvocationLogSection />
      </div>
    </AppPage>
  )
}
