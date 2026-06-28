export type SidebarSectionId =
  | 'overview'
  | 'api-management'
  | 'data-source'
  | 'function-management'
  | 'scheduled-task'
  | 'parameter-management'
  | 'log-query'

export type AppShellState = {
  collapsedSectionIds: SidebarSectionId[]
}

export const initialAppShellState: AppShellState = {
  collapsedSectionIds: [],
}
