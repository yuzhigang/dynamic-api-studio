import { Input } from '@/components/ui/input'

type ApiPathInputProps = {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
}

export function ApiPathInput({ id, name, value, onChange }: ApiPathInputProps) {
  return (
    <Input
      id={id}
      name={name}
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
