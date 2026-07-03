export type LocalVariableNode = {
  name: string
  expression?: string
}

export type DependencyGraph = {
  nodes: LocalVariableNode[]
  edges: Map<string, Set<string>>
}

/**
 * 根据 local 变量表达式构建依赖图。
 *
 * 每个变量是一个节点；如果变量 A 的表达式中引用了变量 B（ bare `$b` ），
 * 则建立一条 A → B 的边，表示 A 依赖 B。
 */
export function buildDependencyGraph(variables: LocalVariableNode[]): DependencyGraph {
  const edges = new Map<string, Set<string>>()
  for (const variable of variables) {
    edges.set(variable.name, new Set())
  }

  for (const variable of variables) {
    if (!variable.expression) continue
    for (const other of variables) {
      if (other.name === variable.name) continue
      const pattern = new RegExp(`(?<![.\\w])\\$${other.name}\\b`)
      if (pattern.test(variable.expression)) {
        edges.get(variable.name)!.add(other.name)
      }
    }
  }

  return { nodes: variables, edges }
}

/**
 * 对依赖图做拓扑排序。
 *
 * 如果检测到循环依赖，抛出错误。
 */
export function topologicalSort(graph: DependencyGraph): LocalVariableNode[] {
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const result: LocalVariableNode[] = []

  const visit = (name: string) => {
    if (visiting.has(name)) {
      throw new Error(`Local variable circular dependency detected: ${name}`)
    }
    if (visited.has(name)) return

    visiting.add(name)
    for (const dep of graph.edges.get(name) ?? []) {
      visit(dep)
    }
    visiting.delete(name)
    visited.add(name)

    const node = graph.nodes.find((n) => n.name === name)
    if (node) result.push(node)
  }

  for (const node of graph.nodes) {
    visit(node.name)
  }

  return result
}
