import { Card } from '@/components/ui/card'
import { ApiBasicInfoSection } from '@/modules/project-management/components/basic-info/api-basic-info-section'
import { RequestParamsSection } from '@/modules/project-management/components/request-params/request-params-section'
import { ResponseSchemaSection } from '@/modules/project-management/components/response-schema/response-schema-section'

export function LeftDesignPanel() {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center border-b border-slate-200 bg-slate-50 px-4 text-sm font-semibold">
        API 设计
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <ApiBasicInfoSection />
        <RequestParamsSection />
        <ResponseSchemaSection />
      </div>
    </Card>
  )
}
