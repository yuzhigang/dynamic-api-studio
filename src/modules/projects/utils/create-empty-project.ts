import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
} from '@/modules/projects/model/project-appearance'
import type { ProjectDraft } from '@/shared/contracts/project.contract'

export function createEmptyProject(overrides: Partial<ProjectDraft> = {}): ProjectDraft {
  return {
    code: '',
    name: '',
    description: '',
    icon: DEFAULT_PROJECT_ICON,
    color: DEFAULT_PROJECT_COLOR,
    ...overrides,
  }
}
