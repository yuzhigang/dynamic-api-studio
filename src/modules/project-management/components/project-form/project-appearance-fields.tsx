import { Check } from 'lucide-react'

import { cn } from '@/lib/cn'
import { CompactField } from '@/components/common/compact-field'
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  projectColorOptions,
  projectIconOptions,
} from '@/modules/project-management/model/project-appearance'
import type { ProjectDraft } from '@/shared/contracts/project.contract'

type ProjectAppearanceFieldsProps = {
  value: ProjectDraft
  onChange: (value: ProjectDraft) => void
}

export function ProjectAppearanceFields({ value, onChange }: ProjectAppearanceFieldsProps) {
  const selectedIcon = value.icon ?? DEFAULT_PROJECT_ICON
  const selectedColor = value.color ?? DEFAULT_PROJECT_COLOR

  return (
    <div className="space-y-4">
      <CompactField htmlFor="project-icon" label="图标">
        <div id="project-icon" className="flex flex-wrap gap-1.5">
          {projectIconOptions.map(({ name, Icon }) => {
            const active = name === selectedIcon
            return (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={active}
                onClick={() => onChange({ ...value, icon: name })}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors',
                  active
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
      </CompactField>

      <CompactField htmlFor="project-color" label="颜色">
        <div id="project-color" className="flex flex-wrap gap-2">
          {projectColorOptions.map(({ token, label, swatchClass }) => {
            const active = token === selectedColor
            return (
              <button
                key={token}
                type="button"
                aria-label={label}
                aria-pressed={active}
                title={label}
                onClick={() => onChange({ ...value, color: token })}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-white transition-transform',
                  swatchClass,
                  active ? 'ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110',
                )}
              >
                {active ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            )
          })}
        </div>
      </CompactField>
    </div>
  )
}
