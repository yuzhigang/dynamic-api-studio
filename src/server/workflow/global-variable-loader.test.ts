import { describe, expect, it } from 'vitest'
import { loadGlobalValues } from '@/server/workflow/global-variable-loader'

function serviceReturning(vars: Array<{ name: string; kind: 'single' | 'list'; value: string; items: string[] }>) {
  return { list: () => vars } as unknown as Parameters<typeof loadGlobalValues>[1]['globalVariableService']
}

describe('loadGlobalValues', () => {
  it('loads single and list variables from platform globals', () => {
    const globalService = serviceReturning([
      { name: 'page', kind: 'single', value: '20', items: [] },
      { name: 'status', kind: 'list', value: '', items: ['active', 'closed'] },
    ])
    const projectService = { list: () => [] } as unknown as Parameters<typeof loadGlobalValues>[1]['projectVariableService']

    expect(loadGlobalValues('p1', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({
      page: '20',
      status: ['active', 'closed'],
    })
  })

  it('project variables override platform globals on name collision', () => {
    const globalService = serviceReturning([{ name: 'page', kind: 'single', value: '20', items: [] }])
    const projectService = {
      list: () => [{ name: 'page', kind: 'single', value: '50', items: [] }],
    } as unknown as Parameters<typeof loadGlobalValues>[1]['projectVariableService']

    expect(loadGlobalValues('p1', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({ page: '50' })
  })

  it('filters project variables by projectId', () => {
    const projectService = {
      list: (projectId: string) => projectId === 'p1'
        ? [{ name: 'region', kind: 'single', value: 'CN', items: [] }]
        : [],
    } as unknown as Parameters<typeof loadGlobalValues>[1]['projectVariableService']
    const globalService = serviceReturning([])

    expect(loadGlobalValues('p1', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({ region: 'CN' })
    expect(loadGlobalValues('p2', { globalVariableService: globalService, projectVariableService: projectService })).toEqual({})
  })
})