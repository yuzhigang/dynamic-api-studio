type TreeIndentProps = {
  level: number
}

export function TreeIndent({ level }: TreeIndentProps) {
  return <span aria-hidden style={{ width: `${level * 18}px` }} className="inline-block" />
}
