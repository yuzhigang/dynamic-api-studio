export type UnsavedChangesState = {
  dirty: boolean
  message?: string
}

export const cleanUnsavedChangesState: UnsavedChangesState = {
  dirty: false,
}
