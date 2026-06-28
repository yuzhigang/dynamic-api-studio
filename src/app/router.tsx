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
import { EditProjectApiRouteComponent } from '@/routes/_app/projects/$projectId/apis/$apiId/edit'
import { ProjectApiDetailRouteComponent } from '@/routes/_app/projects/$projectId/apis/$apiId'
import { ProjectApiTestsRouteComponent } from '@/routes/_app/projects/$projectId/apis/$apiId/tests'
import { ProjectApiInvocationsRouteComponent } from '@/routes/_app/projects/$projectId/apis/$apiId/invocations'
import { ProjectApiVariablesRouteComponent } from '@/routes/_app/projects/$projectId/apis/$apiId/variables'
import { ProjectDetailRouteComponent } from '@/routes/_app/projects/$projectId'
import { ProjectSettingsRouteComponent } from '@/routes/_app/projects/$projectId/settings'
import { HomeOverviewRouteComponent } from '@/routes/_app/home'
import { InvocationLogRouteComponent } from '@/routes/_app/invocation-logs'
import { ProjectListRouteComponent } from '@/routes/_app/projects'
import { DataSourceIndexRouteComponent } from '@/routes/_app/datasources'
import { DataSourceDetailRouteComponent } from '@/routes/_app/datasources/$dataSourceId'
import { DataSourcePage } from '@/modules/data-source/pages/data-source-page'
import { TasksRouteComponent } from '@/routes/_app/tasks'
import { TaskDetailRouteComponent } from '@/routes/_app/tasks/$taskId'
import { TaskLogsRouteComponent } from '@/routes/_app/tasks/$taskId/logs'

import { SettingsPage } from '@/modules/settings/pages/settings-page'
import { SettingsIndexRouteComponent } from '@/routes/_app/settings'
import { SettingsGeneralRouteComponent } from '@/routes/_app/settings/general'
import { SettingsGlobalVariablesRouteComponent } from '@/routes/_app/settings/global-variables'
import { SettingsFunctionsRouteComponent } from '@/routes/_app/settings/functions'

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
  component: HomeOverviewRouteComponent,
})

const invocationLogsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: 'invocation-logs',
  component: InvocationLogRouteComponent,
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
  component: DataSourceDetailRouteComponent,
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
  component: TasksRouteComponent,
})

const taskDetailRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '$taskId',
  component: TaskDetailRouteComponent,
})

const taskLogsRoute = createRoute({
  getParentRoute: () => tasksRoute,
  path: '$taskId/logs',
  component: TaskLogsRouteComponent,
})

const projectListRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: '/',
  component: ProjectListRouteComponent,
})

const projectRoute = createRoute({
  getParentRoute: () => projectsRoute,
  path: '$projectId',
  component: () => <Outlet />,
})

const projectDetailRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  component: ProjectDetailRouteComponent,
})

const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'settings',
  component: ProjectSettingsRouteComponent,
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
  component: ProjectApiDetailRouteComponent,
})

const projectApiTestsRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/tests',
  component: ProjectApiTestsRouteComponent,
})

const projectApiTestDetailRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/tests/$testId',
  component: ProjectApiTestsRouteComponent,
})

const projectApiInvocationsRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/invocations',
  component: ProjectApiInvocationsRouteComponent,
})

const projectApiVariablesRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/variables',
  component: ProjectApiVariablesRouteComponent,
})

const editProjectApiRoute = createRoute({
  getParentRoute: () => projectApisRoute,
  path: '$apiId/edit',
  component: EditProjectApiRouteComponent,
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
  component: SettingsGeneralRouteComponent,
})

const settingsGlobalVariablesRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'global-variables',
  component: SettingsGlobalVariablesRouteComponent,
})

const settingsFunctionsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'functions',
  component: SettingsFunctionsRouteComponent,
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
