export type TreeNode<T> = T & {
  id: string
  children?: Array<TreeNode<T>>
}

export function flattenTree<T>(nodes: Array<TreeNode<T>>): Array<TreeNode<T>> {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children ?? [])])
}
