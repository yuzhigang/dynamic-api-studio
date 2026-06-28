import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { httpMethods, type HttpMethod } from '@/shared/enums/http-method'

type ApiMethodSelectProps = {
  id: string
  name: string
  value: HttpMethod
  onChange: (value: HttpMethod) => void
}

export function ApiMethodSelect({ id, name, value, onChange }: ApiMethodSelectProps) {
  return (
    <Select name={name} value={value} onValueChange={(nextValue) => onChange(nextValue as HttpMethod)}>
      <SelectTrigger id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {httpMethods.map((method) => (
          <SelectItem key={method} value={method}>
            {method}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
