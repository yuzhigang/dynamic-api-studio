export function commitTag(items: string[], raw: string): string[] {
  const token = raw.trim()

  if (!token || items.includes(token)) {
    return items
  }

  return [...items, token]
}
