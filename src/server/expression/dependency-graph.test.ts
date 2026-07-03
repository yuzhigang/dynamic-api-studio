import { describe, expect, it } from 'vitest'
import { buildDependencyGraph, topologicalSort } from '@/server/expression/dependency-graph'

describe('buildDependencyGraph', () => {
  it('builds edges for variable references', () => {
    const variables = [
      { name: 'offset', expression: '($pageSize - 1) * $input.pageNo' },
      { name: 'pageSize', expression: '$input.pageSize' },
    ]
    const graph = buildDependencyGraph(variables)

    expect(graph.edges.get('offset')).toContain('pageSize')
    expect(graph.edges.get('pageSize')).toEqual(new Set())
  })

  it('ignores self references', () => {
    const variables = [{ name: 'a', expression: '$a + 1' }]
    const graph = buildDependencyGraph(variables)

    expect(graph.edges.get('a')).toEqual(new Set())
  })

  it('handles variables with no expression', () => {
    const variables = [{ name: 'a' }, { name: 'b', expression: '$a' }]
    const graph = buildDependencyGraph(variables)

    expect(graph.edges.get('b')).toContain('a')
  })

  it('does not create false dependency from $input.name pattern', () => {
    const variables = [
      { name: 'pageSize', expression: '$input.pageSize' },
      { name: 'other', expression: '$input.other + $pageSizeLonger' },
    ]
    const graph = buildDependencyGraph(variables)

    expect(graph.edges.get('pageSize')).toEqual(new Set())
    expect(graph.edges.get('other')).toEqual(new Set())
  })
})

describe('topologicalSort', () => {
  it('sorts local variables by dependency', () => {
    const variables = [
      { name: 'offset', expression: '($pageSize - 1) * $input.pageNo' },
      { name: 'pageSize', expression: '$input.pageSize' },
    ]
    const order = topologicalSort(buildDependencyGraph(variables))

    expect(order.map((v) => v.name)).toEqual(['pageSize', 'offset'])
  })

  it('detects circular dependencies', () => {
    const variables = [
      { name: 'a', expression: '$b' },
      { name: 'b', expression: '$a' },
    ]

    expect(() => topologicalSort(buildDependencyGraph(variables))).toThrow('circular')
  })

  it('keeps original order for independent variables', () => {
    const variables = [
      { name: 'a', expression: '$input.a' },
      { name: 'b', expression: '$input.b' },
    ]
    const order = topologicalSort(buildDependencyGraph(variables))

    expect(order.map((v) => v.name)).toEqual(['a', 'b'])
  })
})
