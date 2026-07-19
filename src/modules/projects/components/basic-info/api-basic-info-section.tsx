import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { CompactField } from '@/components/common/compact-field'
import { ApiMethodSelect } from '@/modules/projects/components/basic-info/api-method-select'
import { ApiPathInput } from '@/modules/projects/components/basic-info/api-path-input'
import { ApiTagInput } from '@/modules/projects/components/basic-info/api-tag-input'
import { PermissionSelect } from '@/modules/projects/components/basic-info/permission-select'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'
import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'
import type { HttpMethod } from '@/shared/enums/http-method'

export function ApiBasicInfoSection() {
  const { state, dispatch } = useApiDesigner()
  const api = state.apiDefinition

  return (
    <Card>
      <CardHeader>
        <CardTitle>API 基本信息</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
        <CompactField htmlFor="api-name" label="API 名称" required>
          <Input
            id="api-name"
            name="apiName"
            autoComplete="off"
            value={api.name}
            onChange={(event) => dispatch(apiDesignerActions.updateApiField('name', event.target.value))}
          />
        </CompactField>
        <CompactField htmlFor="api-path" label="路径" required>
          <ApiPathInput
            id="api-path"
            name="apiPath"
            value={api.path}
            onChange={(value) => dispatch(apiDesignerActions.updateApiField('path', value))}
          />
        </CompactField>
        <CompactField htmlFor="api-method" label="请求方式" required>
          <ApiMethodSelect
            id="api-method"
            name="apiMethod"
            value={api.method}
            onChange={(value: HttpMethod) => dispatch(apiDesignerActions.updateApiField('method', value))}
          />
        </CompactField>
        <CompactField htmlFor="api-tags" label="标签">
          <ApiTagInput
            id="api-tags"
            name="apiTags"
            value={api.tags}
            onChange={(value) => dispatch(apiDesignerActions.setTags(value))}
          />
        </CompactField>
        <CompactField htmlFor="api-permissions" label="所需权限">
          <PermissionSelect
            id="api-permissions"
            name="apiPermissions"
            value={api.permissions}
            onChange={(value) => dispatch(apiDesignerActions.setPermissions(value))}
          />
        </CompactField>
        <CompactField htmlFor="api-require-auth" label="鉴权">
          <div className="flex items-center gap-2 pt-1.5">
            <Checkbox
              id="api-require-auth"
              checked={api.requireAuth}
              onCheckedChange={(checked) =>
                dispatch(apiDesignerActions.setRequireAuth(checked === true))
              }
            />
            <label htmlFor="api-require-auth" className="text-xs text-slate-700">
              需要鉴权
            </label>
          </div>
        </CompactField>
        {/* <CompactField htmlFor="api-description" label="描述">
          <Textarea
            id="api-description"
            name="apiDescription"
            autoComplete="off"
            value={api.description ?? ''}
            maxLength={200}
            onChange={(event) =>
              dispatch(apiDesignerActions.updateApiField('description', event.target.value))
            }
          />
        </CompactField> */}
        </div>
      </CardContent>
    </Card>
  )
}
