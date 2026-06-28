# Project Resource API Management Design

Date: 2026-06-27 | Status: Draft for Review

## Goal

Add a first-class Project concept. Every API must belong to exactly one Project, so API management happens inside a project context instead of a global API list.

## Decisions

- Project is a top-level platform resource.
- API definitions are required to have `projectId`.
- Project is a basic container in this phase: name, code, description, status, API count, created time, updated time.
- Project supports list, create, edit, and archive. Physical delete is not supported.
- Project members, roles, visibility rules, environments, and project-level variables are out of scope for this phase.
- Navigation starts at `/home` for overview metrics and recent projects. The Project menu points to `/projects`.
- Project list uses reusable project cards, not a table-first layout.
- Project creation and editing use dialogs, not standalone create/edit pages.

## Routes

Frontend routes:

```txt
/home
/projects
/projects/:projectId
/projects/:projectId/apis/create
/projects/:projectId/apis/:apiId/edit
```

Existing global API routes are replaced by project-scoped API routes. The sidebar keeps a single Project entry labeled `项目` that points to `/projects`. The overview entry labeled `首页` points to `/home`. The previous Project parent/child menu is removed.

## Frontend Module Structure

Add a new `home` module:

```txt
src/modules/home/
├── pages/
│   └── home-overview-page.tsx
│
├── components/
│   ├── metric-card.tsx
│   ├── metric-grid.tsx
│   └── recent-projects-section.tsx
│
├── hooks/
│   └── use-home-overview-query.ts
│
└── services/
    ├── home-overview.api.ts
    └── home-overview-query-keys.ts
```

Add a new `project-management` module:

```txt
src/modules/project-management/
├── pages/
│   ├── project-list-page.tsx
│   └── project-detail-page.tsx
│
├── components/
│   ├── project-card/
│   │   ├── project-card.tsx
│   │   ├── project-card-actions.tsx
│   │   └── project-card-grid.tsx
│   │
│   ├── project-form/
│   │   ├── project-basic-fields.tsx
│   │   └── project-form-dialog.tsx
│   │
│   └── common/
│       └── project-breadcrumb.tsx
│
├── hooks/
│   ├── use-project-query.ts
│   ├── use-save-project.ts
│   ├── use-archive-project.ts
│   └── use-copy-project.ts
│
├── services/
│   ├── project.api.ts
│   └── project-query-keys.ts
│
├── schemas/
│   └── project.schema.ts
│
├── model/
│   └── project.types.ts
│
└── utils/
    └── create-empty-project.ts
```

Update `api-management` so API pages require project context:

```txt
src/modules/api-management/
├── pages/
│   ├── project-api-list-page.tsx
│   ├── create-api-page.tsx
│   └── edit-api-page.tsx
│
├── components/
│   ├── project-api-header.tsx
│   ├── designer/
│   ├── basic-info/
│   ├── request-params/
│   ├── response-schema/
│   ├── workflow/
│   ├── test-panel/
│   └── common/
│
├── services/
│   ├── api-definition.api.ts
│   ├── api-test.api.ts
│   └── api-management-query-keys.ts
```

Route entry files:

```txt
src/routes/_app/
├── home.tsx
├── index.tsx
└── projects/
    ├── index.tsx
    └── $projectId/
        ├── index.tsx
        └── apis/
            ├── create.tsx
            └── $apiId/edit.tsx
```

## Home And Project UX

`/home` is the overview page:

```txt
HomeOverviewPage
├── MetricGrid
│   ├── MetricCard: 项目数
│   ├── MetricCard: API 数
│   ├── MetricCard: 数据源数
│   └── MetricCard: 调用次数
│
└── RecentProjectsSection
    ├── header actions: 创建项目, 查看全部
    └── ProjectCardGrid limit=10
```

`/projects` is the Project page:

```txt
ProjectListPage
├── page header: 项目, 创建项目
└── ProjectCardGrid
```

`ProjectCard` is shared by `/home` and `/projects`:

```txt
ProjectCard
├── project name
├── project code and status
├── description
├── API count
├── updated time
└── ProjectCardActions
    ├── 复制项目
    ├── 编辑项目
    └── 归档项目
```

Card click opens `/projects/:projectId`. Action menu clicks must stop propagation so actions do not trigger card navigation.

Create and edit Project use `ProjectFormDialog`.

Create success behavior:

```txt
save project
  -> invalidate project/home queries
  -> navigate to /projects/:projectId
```

Edit success behavior:

```txt
save project
  -> invalidate project/home queries
  -> keep current page
```

`/projects/:projectId` is reserved as Project detail. The detailed layout is not part of this design update and will be designed separately.

## Data Model

Project status:

```ts
type ProjectStatus = 'active' | 'archived'
```

Project summary/detail:

```ts
type Project = {
  id: string
  code: string
  name: string
  description?: string
  status: ProjectStatus
  apiCount: number
  createdAt: string
  updatedAt: string
}
```

Project draft:

```ts
type ProjectDraft = {
  id?: string
  code: string
  name: string
  description?: string
}
```

API draft gains required project ownership:

```ts
type ApiDefinitionDraft = {
  id?: string
  projectId: string
  name: string
  path: string
  method: HttpMethod
  tags: string[]
  permissions: string[]
  description?: string
  bodyContentType: 'x-www-form-urlencoded' | 'json' | 'form-data'
  requestParams: RequestParam[]
  responseSchema: SchemaField[]
  workflowSteps: WorkflowStep[]
}
```

API summary also includes project ownership:

```ts
type ApiDefinitionSummary = {
  id: string
  projectId: string
  name: string
  path: string
  method: HttpMethod
  status: 'draft' | 'published'
  updatedAt: string
}
```

## Backend API

Project endpoints:

```txt
GET  /api/projects
POST /api/projects
GET  /api/projects/:projectId
PUT  /api/projects/:projectId
POST /api/projects/:projectId/archive
POST /api/projects/:projectId/copy
```

Home overview endpoint:

```txt
GET /api/home/overview
```

`GET /api/home/overview` returns:

```ts
type HomeOverview = {
  metrics: {
    projectCount: number
    apiCount: number
    datasourceCount: number
    invocationCount: number
  }
  recentProjects: Project[]
}
```

Project-scoped API endpoints:

```txt
GET  /api/projects/:projectId/apis
POST /api/projects/:projectId/apis
GET  /api/projects/:projectId/apis/:apiId
PUT  /api/projects/:projectId/apis/:apiId
POST /api/projects/:projectId/apis/:apiId/test
```

Backend behavior:

- Project archive sets `status` to `archived`.
- Archived projects remain readable.
- Archived projects do not allow new API creation.
- API creation requires a valid `projectId`.
- API list returns only APIs for the requested Project.
- API detail returns 404 when the API exists but belongs to a different Project.
- Project delete is not implemented.

## Frontend Data Flow

Project list:

```txt
/projects
  -> useProjectListQuery()
  -> ProjectCardGrid
```

Home overview:

```txt
/home
  -> useHomeOverviewQuery()
  -> MetricGrid
  -> RecentProjectsSection
```

Project detail:

```txt
/projects/:projectId
  -> useProjectQuery(projectId)
  -> ProjectDetailPage
```

Create API:

```txt
/projects/:projectId/apis/create
  -> createEmptyApiDefinition({ projectId })
  -> ApiDesignerProvider
```

Edit API:

```txt
/projects/:projectId/apis/:apiId/edit
  -> useApiDefinitionQuery(projectId, apiId)
  -> ApiDesignerProvider
```

## Error Handling

- Missing Project: show a project-not-found empty state with a link back to `/projects`.
- Missing Home metrics: show metric skeletons or zero values while keeping recent projects area visible.
- Archived Project: API list remains readable; create button is disabled with muted explanatory text.
- Missing `projectId` on API save: frontend Zod validation fails; backend validation also rejects the request.
- API outside Project: backend returns 404; frontend shows resource-not-found state.
- Project archive failure: mutation displays inline error near the archive action.
- Project card action failure: keep the card visible and show an inline or toast-equivalent error near the action menu.

## Testing Strategy

Unit tests:

- Project schema validates required `code` and `name`.
- Project schema accepts optional `description`.
- API draft schema rejects missing `projectId`.
- API repository filters list results by `projectId`.
- API repository returns `undefined` or 404-equivalent for cross-project API access.
- Home overview service returns metrics and at most 10 recent projects.

Component tests:

- Home overview renders metric cards and recent project cards.
- Project list renders project cards with project name, code, status, API count, and updated time.
- Archived project card shows archived state.
- Project card action menu exposes copy, edit, and archive actions.
- Project API list disables create action when project is archived.
- Create API page initializes `ApiDefinitionDraft.projectId` from route params.

Integration-level checks:

- `GET /api/projects` returns mock projects.
- `GET /api/home/overview` returns metrics and recent projects.
- `GET /api/projects/:projectId/apis` returns only that project's APIs.
- `POST /api/projects/:projectId/archive` prevents later API creation for that project.
- `POST /api/projects/:projectId/copy` creates a copied Project.

Verification commands:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm build:server
```

## Implementation Order

1. Add shared Project schemas and add `projectId` to API schemas.
2. Add server Project route, domain service, and repository.
3. Add home overview API and service.
4. Move API backend routes under `/api/projects/:projectId/apis`.
5. Add project-management frontend module with project cards and form dialog.
6. Add home frontend module with metrics and recent projects.
7. Update TanStack Router paths.
8. Update sidebar navigation.
9. Update API management pages, hooks, query keys, and services to require `projectId`.
10. Update `createEmptyApiDefinition` and designer initialization to include `projectId`.
11. Add tests for schema, route behavior, filtering, archive/copy behavior, home metrics, and page initialization.
12. Run full verification.

## Out Of Scope

- Project member management.
- Project roles and access control.
- Project visibility rules.
- Project environments.
- Project-level variables.
- Project-level data source assignment.
- Physical project deletion.
