import { ApiBasicInfoSection } from '@/modules/project-management/components/basic-info/api-basic-info-section'
import { RequestParamsSection } from '@/modules/project-management/components/request-params/request-params-section'
import { ResponseSchemaSection } from '@/modules/project-management/components/response-schema/response-schema-section'

export function LeftDesignPanel() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-10 shrink-0 items-center px-4 text-sm font-semibold text-foreground">
        API 设计
      </div>
      <div className="hover-scroll min-h-0 flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          <ApiBasicInfoSection />
          <RequestParamsSection />
          <ResponseSchemaSection />
        </div>
      </div>
    </div>
  )
}
