import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import type { Project } from '@/shared/contracts/project.contract'

import { ProjectCardActions } from './project-card-actions'

vi.mock('@/modules/projects/components/project-form/project-form-dialog', () => ({
  ProjectFormDialog: () => null,
}))

vi.mock('@/modules/projects/hooks/use-archive-project', () => ({
  useArchiveProject: () => ({ isPending: false, mutate: vi.fn() }),
}))

vi.mock('@/modules/projects/hooks/use-copy-project', () => ({
  useCopyProject: () => ({ isPending: false, mutate: vi.fn() }),
}))

const project = {
  id: 'project-order',
  code: 'ORDER',
  name: '订单中心',
  description: '订单项目',
  status: 'active',
  apiCount: 3,
  updatedAt: '2026-06-28',
} as Project

describe('ProjectCardActions', () => {
  it('exposes the project menu with a specific accessible name', () => {
    render(
      <TooltipProvider>
        <ProjectCardActions project={project} />
      </TooltipProvider>,
    )

    const trigger = screen.getByRole('button', { name: '打开项目「订单中心」操作菜单' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('type')).toBe('button')
  })
})
