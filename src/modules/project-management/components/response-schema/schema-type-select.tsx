import { NativeSelect } from '@/components/form/native-select'
import type { SchemaField } from '@/shared/contracts/api-definition.contract'

type SchemaTypeSelectProps = {
  value: SchemaField['type']
  onChange: (value: SchemaField['type']) => void
  'aria-label'?: string
}

export function SchemaTypeSelect({ value, onChange, 'aria-label': ariaLabel }: SchemaTypeSelectProps) {
  return (
    <NativeSelect
      aria-label={ariaLabel}
      className="h-7 border-transparent bg-transparent px-1 shadow-none"
      value={value}
      onChange={(event) => onChange(event.target.value as SchemaField['type'])}
    >
      {['string', 'integer', 'decimal', 'boolean', 'object', 'array'].map((type) => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </NativeSelect>
  )
}
