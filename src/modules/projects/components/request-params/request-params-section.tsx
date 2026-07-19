import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { BodyContentTypeRadio } from '@/modules/projects/components/request-params/body-content-type-radio'
import { ParamLocationTabs } from '@/modules/projects/components/request-params/param-location-tabs'
import { RequestParamTable } from '@/modules/projects/components/request-params/request-param-table'

export function RequestParamsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>请求参数定义</CardTitle>
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
