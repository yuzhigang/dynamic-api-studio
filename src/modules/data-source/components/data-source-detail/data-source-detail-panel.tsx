import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppPage } from '@/layouts/app-shell/app-page'
import { DeleteDataSourceDialog } from '@/modules/data-source/components/common/delete-data-source-dialog'
import { ConnectionConfigForm } from '@/modules/data-source/components/data-source-detail/connection-config-form'
import { DataSourceSchemaTab } from '@/modules/data-source/components/data-source-detail/data-source-schema-tab'
import { DialectBadge } from '@/modules/data-source/components/common/dialect-badge'
import type { DataSource } from '@/shared/contracts/data-source.contract'

type DataSourceDetailPanelProps = {
  dataSource: DataSource
}

export function DataSourceDetailPanel({ dataSource }: DataSourceDetailPanelProps) {
  return (
    <AppPage
      title={
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-slate-900">{dataSource.name}</span>
          <DialectBadge dialect={dataSource.dialect} />
        </div>
      }
      actions={<DeleteDataSourceDialog dataSource={dataSource} />}
    >
      <Tabs defaultValue="connection" className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-slate-200 bg-white px-5">
          <TabsList className="h-10 bg-transparent p-0">
            <TabsTrigger value="connection">连接配置</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-5">
          <TabsContent value="connection" className="mt-0">
            <ConnectionConfigForm dataSource={dataSource} />
          </TabsContent>
          <TabsContent value="schema" className="mt-0">
            <DataSourceSchemaTab dataSourceId={dataSource.id} />
          </TabsContent>
        </div>
      </Tabs>
    </AppPage>
  )
}
