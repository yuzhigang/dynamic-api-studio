import { TagInput } from '@/components/form/tag-input'

type PermissionSelectProps = {
  id: string
  name: string
  value: string[]
  onChange: (value: string[]) => void
}

export function PermissionSelect({ id, name, value, onChange }: PermissionSelectProps) {
  return (
    <TagInput
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder="输入权限后回车添加…"
    />
  )
}
