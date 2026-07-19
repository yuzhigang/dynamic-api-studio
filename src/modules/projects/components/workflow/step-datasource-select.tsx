import { NativeSelect } from '@/components/form/native-select'

const datasourceOptions = ['orderMainDb', 'orderDetailDb', 'productDb', 'analyticsDb']

type StepDatasourceSelectProps = {
  value?: string
  onChange: (value: string) => void
}

export function StepDatasourceSelect({ value, onChange }: StepDatasourceSelectProps) {
  return (
    <NativeSelect value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      {datasourceOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </NativeSelect>
  )
}
