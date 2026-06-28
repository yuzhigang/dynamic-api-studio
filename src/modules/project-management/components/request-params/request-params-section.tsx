import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { BodyContentTypeRadio } from '@/modules/project-management/components/request-params/body-content-type-radio'
import { ParamLocationTabs } from '@/modules/project-management/components/request-params/param-location-tabs'
import { RequestParamTable } from '@/modules/project-management/components/request-params/request-param-table'

export function RequestParamsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>参数定义</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="body">
          <ParamLocationTabs />
          <TabsContent value="query">
            <RequestParamTable location="query" />
          </TabsContent>
          <TabsContent value="body">
            <BodyContentTypeRadio />
            <RequestParamTable location="body" />
          </TabsContent>
          <TabsContent value="header">
            <RequestParamTable location="header" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
