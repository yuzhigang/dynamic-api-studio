import { TagInput } from '@/components/form/tag-input'

type ApiTagInputProps = {
  id: string
  name: string
  value: string[]
  onChange: (value: string[]) => void
}

export function ApiTagInput({ id, name, value, onChange }: ApiTagInputProps) {
  return (
    <TagInput
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder="例如订单、查询…"
    />
  )
}
