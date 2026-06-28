import { BarChart3, Boxes, Database, FolderKanban } from 'lucide-react'

import { MetricCard } from '@/modules/home/components/metric-card'
import type { HomeOverview } from '@/modules/home/services/home-overview.api'

type MetricGridProps = {
  metrics?: HomeOverview['metrics']
}

const emptyMetrics = {
  projectCount: 0,
  apiCount: 0,
  datasourceCount: 0,
  invocationCount: 0,
}

export function MetricGrid({ metrics = emptyMetrics }: MetricGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="项目" value={metrics.projectCount} icon={FolderKanban} />
      <MetricCard label="API" value={metrics.apiCount} icon={Boxes} />
      <MetricCard label="数据源" value={metrics.datasourceCount} icon={Database} />
      <MetricCard label="调用次数" value={metrics.invocationCount} icon={BarChart3} />
    </div>
  )
}
