import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { apiDesignerActions } from '@/modules/projects/state/api-designer-actions'
import { useApiDesigner } from '@/modules/projects/hooks/use-api-designer'

const contentTypes = [
  { label: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
  { label: 'JSON', value: 'json' },
  { label: 'form-data', value: 'form-data' },
] as const

export function BodyContentTypeRadio() {
  const { state, dispatch } = useApiDesigner()

  return (
    <RadioGroup
      name="bodyContentType"
      value={state.apiDefinition.bodyContentType}
      onValueChange={(value) => dispatch(apiDesignerActions.updateApiField('bodyContentType', value))}
      className="mb-3 flex items-center gap-5"
      aria-label="Body 内容类型"
    >
      {contentTypes.map((item) => (
        <div key={item.value} className="flex items-center gap-2">
          <RadioGroupItem id={`body-content-type-${item.value}`} value={item.value} />
          <Label htmlFor={`body-content-type-${item.value}`} className="text-xs font-normal text-slate-700">
            {item.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )
}
