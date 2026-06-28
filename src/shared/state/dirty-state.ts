export type DirtyState<T> = {
  initial: T
  current: T
}

export function isDirty<T>({ initial, current }: DirtyState<T>) {
  return JSON.stringify(initial) !== JSON.stringify(current)
}
