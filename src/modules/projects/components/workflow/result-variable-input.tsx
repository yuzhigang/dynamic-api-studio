import { Input } from '@/components/ui/input'

type ResultVariableInputProps = {
  value: string
  onChange: (value: string) => void
}

export function ResultVariableInput({ value, onChange }: ResultVariableInputProps) {
  return <Input value={value} onChange={(event) => onChange(event.target.value)} />
}
