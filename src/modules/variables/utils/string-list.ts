export function removeListItem(items: string[], index: number): string[] {
  return items.filter((_, currentIndex) => currentIndex !== index)
}

export function filterEmptyItems(items: string[]): string[] {
  return items.map((item) => item.trim()).filter((item) => item.length > 0)
}
