import {
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

import { AppErrorBoundary } from '@/app/app-error-boundary'
import { AppRouteComponent } from '@/routes/_app'
import { RootRouteComponent } from '@/routes/__root'
import { CreateProjectApiRouteComponent } from '@/routes/_app/projects/$projectId/apis/create'
import { ProjectApiVariablesRouteComponent } from '@/routes/_app/projects/$projectId/apis/$apiId/variables'
import { DataSourceIndexRouteComponent } from '@/routes/_app/datasources'
import { SettingsIndexRouteComponent } from '@/routes/_app/settings'
import { SettingsCustomFunctionsRouteComponent } from '@/routes/_app/settings/custom-functions'

import { DataSourcePage } from '@/modules/data-source/pages/data-source-page'
import { DataSourceDetailPage } from '@/modules/data-source/pages/data-source-detail-page'
import { HomeOverviewPage } from '@/modules/home/pages/home-overview-page'
import { InvocationLogPage } from '@/modules/invocation-log/pages/invocation-log-page'
import { TaskWorkspacePage } from '@/modules/scheduled-task'
import { EditApiPage } from '@/modules/projects/pages/edit-api-page'
import { ProjectDetailPage } from '@/modules/projects/pages/project-detail-page'
import { ProjectListPage } from '@/modules/projects/pages/project-list-page'
import { ProjectSettingsPage } from '@/modules/projects/pages/project-settings-page'
import { SettingsPage } from '@/modules/settings/pages/settings-page'
import { EditorAppearanceSettings } from '@/modules/settings/components/general/editor-appearance-settings'
import { GlobalVariablesSection } from '@/modules/settings/components/global-variables/global-variables-section'

const rootRoute = createRootRoute({
  component: RootRouteComponent,
  errorComponent: AppErrorBoundary,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: AppRouteComponent,
})

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: () => <Navigate to="/home" replace />,
})

const homeOverviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'home',
  component: HomeOverviewPage,
})

const invocationLogsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'invocation-logs',
  component: InvocationLogPage,
})

const dataSourcesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'datasources',
  component: DataSourcePage,
})

const dataSourceIndexRoute = createRoute({
  getParentRoute: () => dataSourcesRoute,
  path: '/',
  component: DataSourceIndexRouteComponent,
})

const dataSourceDetailRoute = createRoute({
  getParentRoute: () => dataSourcesRoute,
  path: '$dataSourceId',
  component: DataSourceDetailPage,
})

const projectsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'projects',
  component: () => <Outlet />,
})

const tasksRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'tasks',
  component: () => <Outlet />,
})

const tasksIndexRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '/',
  component: TaskWorkspacePage,
})

const taskDetailRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '$taskId',
  component: TaskWorkspacePage,
})

const taskLogsRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '$taskId/logs',
  component: TaskWorkspacePage,
})

const projectListRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: '/',
  component: ProjectListPage,
})

const projectRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: '$projectId',
  component: () => <Outlet />,
})

const projectDetailRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  component: ProjectDetailPage,
})

const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'settings',
  component: ProjectSettingsPage,
})

const projectApisRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'apis',
  component: () => <Outlet />,
})

const createProjectApiRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: 'create',
  component: CreateProjectApiRouteComponent,
})

const projectApiDetailRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId',
  component: ProjectDetailPage,
})

const projectApiTestsRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/tests',
  component: ProjectDetailPage,
})

const projectApiTestDetailRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/tests/$testId',
  component: ProjectDetailPage,
})

const projectApiInvocationsRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/invocations',
  component: ProjectDetailPage,
})

const projectApiVariablesRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/variables',
  component: ProjectApiVariablesRouteComponent,
})

const editProjectApiRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/edit',
  component: EditApiPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'settings',
  component: SettingsPage,
})

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  component: SettingsIndexRouteComponent,
})

const settingsGeneralRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'general',
  component: EditorAppearanceSettings,
})

const settingsGlobalVariablesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'global-variables',
  component: GlobalVariablesSection,
})

const settingsFunctionsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'custom-functions',
  component: SettingsCustomFunctionsRouteComponent,
})

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    homeRoute,
    homeOverviewRoute,
    invocationLogsRoute,
    dataSourcesRoute.addChildren([dataSourceIndexRoute, dataSourceDetailRoute]),
    settingsRoute.addChildren([
      settingsIndexRoute,
      settingsGeneralRoute,
      settingsGlobalVariablesRoute,
      settingsFunctionsRoute,
    ]),
    tasksRoute.addChildren([tasksIndexRoute, taskDetailRoute, taskLogsRoute]),
    projectsRoute.addChildren([
      projectListRoute,
      projectRoute.addChildren([
        projectDetailRoute,
        projectSettingsRoute,
        projectApisRoute.addChildren([
          createProjectApiRoute,
          projectApiDetailRoute,
          projectApiTestsRoute,
          projectApiTestDetailRoute,
          projectApiInvocationsRoute,
          projectApiVariablesRoute,
          editProjectApiRoute,
        ]),
      ]),
    ]),
  ]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 30_000,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
