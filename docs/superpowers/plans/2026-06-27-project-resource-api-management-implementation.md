# Project Resource API Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Project as a first-class resource and make every API definition belong to one Project.

**Architecture:** Project gets its own frontend module, shared Zod schemas, and Hono domain route. API management keeps the existing designer/components but moves list/create/edit pages and backend routes into `/projects/:projectId/apis` context.

**Tech Stack:** React 18, TanStack Router, TanStack Query, Tailwind CSS, shadcn-style components, Hono, Zod, Vitest.

**Source Spec:** `docs/superpowers/specs/2026-06-27-project-resource-api-management-design.md`

**Repo Note:** Current workspace is not a git repository, so commit steps are intentionally omitted.

---

### Task 1: Shared Project And API Ownership Schemas

**Files:**
- Modify: `src/shared/schemas/api-definition.schema.ts`
- Modify: `src/shared/contracts/api-definition.contract.ts`
- Modify: `src/modules/api-management/utils/create-empty-api-definition.ts`
- Create: `src/shared/schemas/project.schema.ts`
- Create: `src/shared/contracts/project.contract.ts`
- Create: `src/shared/schemas/project.schema.test.ts`
- Create: `src/shared/schemas/api-definition.schema.test.ts`

- [ ] **Step 1: Add schema tests**

Create `src/shared/schemas/project.schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { projectDraftSchema, projectSchema } from '@/shared/contracts/project.contract'

describe('project schemas', () => {
  it('validates an active project', () => {
    expect(
      projectSchema.parse({
        id: 'project_order',
        code: 'ORDER',
        name: '订单中心',
        description: '订单相关动态 API',
        status: 'active',
        apiCount: 2,
        createdAt: '2026-06-27T00:00:00.000Z',
        updatedAt: '2026-06-27T00:00:00.000Z',
      }),
    ).toMatchObject({
      id: 'project_order',
      code: 'ORDER',
      name: '订单中心',
      status: 'active',
    })
  })

  it('rejects project drafts without code or name', () => {
    expect(() => projectDraftSchema.parse({ code: '', name: '' })).toThrow()
  })
})
```

Create `src/shared/schemas/api-definition.schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { apiDefinitionDraftSchema } from '@/shared/contracts/api-definition.contract'
import { createEmptyApiDefinition } from '@/modules/api-management/utils/create-empty-api-definition'

describe('apiDefinitionDraftSchema', () => {
  it('requires projectId', () => {
    const draft = createEmptyApiDefinition({ projectId: 'project_order' })
    expect(apiDefinitionDraftSchema.parse(draft).projectId).toBe('project_order')
    expect(() => apiDefinitionDraftSchema.parse({ ...draft, projectId: '' })).toThrow()
  })
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm test -- src/shared/schemas/project.schema.test.ts src/shared/schemas/api-definition.schema.test.ts
```

Expected: fails because `project.contract` does not exist and `ApiDefinitionDraft` does not require `projectId` yet.

- [ ] **Step 3: Implement Project schemas**

Create `src/shared/schemas/project.schema.ts`:

```ts
import { z } from 'zod'

export const projectStatusSchema = z.enum(['active', 'archived'])

export const projectSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: projectStatusSchema,
  apiCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Project = z.infer<typeof projectSchema>
export type ProjectStatus = z.infer<typeof projectStatusSchema>

export const projectDraftSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
})

export type ProjectDraft = z.infer<typeof projectDraftSchema>
```

Create `src/shared/contracts/project.contract.ts`:

```ts
export type { Project, ProjectDraft, ProjectStatus } from '@/shared/schemas/project.schema'

export { projectDraftSchema, projectSchema, projectStatusSchema } from '@/shared/schemas/project.schema'
```

- [ ] **Step 4: Add API ownership fields**

Update `src/shared/schemas/api-definition.schema.ts`:

```ts
export const apiDefinitionDraftSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  method: z.enum(httpMethods),
  tags: z.array(z.string()),
  permissions: z.array(z.string()),
  description: z.string().optional(),
  bodyContentType: z.enum(['x-www-form-urlencoded', 'json', 'form-data']),
  requestParams: z.array(requestParamSchema),
  responseSchema: z.array(schemaFieldSchema),
  workflowSteps: z.array(workflowStepSchema),
})
```

Update summary schema in the same file:

```ts
export const apiDefinitionSummarySchema = z.object({
  id: z.string(),
  projectId: z.string().min(1),
  name: z.string(),
  path: z.string(),
  method: z.enum(httpMethods),
  status: z.enum(['draft', 'published']),
  updatedAt: z.string(),
})
```

Update `src/modules/api-management/utils/create-empty-api-definition.ts` so its returned object always includes `projectId`. Use `overrides.projectId ?? 'project_order'` as the seed value for existing tests and mocks.

- [ ] **Step 5: Run schema tests**

Run:

```bash
pnpm test -- src/shared/schemas/project.schema.test.ts src/shared/schemas/api-definition.schema.test.ts
```

Expected: both test files pass.

---

### Task 2: Backend Project Domain And Project-Scoped API Routes

**Files:**
- Create: `src/server/domains/project/project.repository.ts`
- Create: `src/server/domains/project/project.service.ts`
- Create: `src/server/routes/project.route.ts`
- Create: `src/server/routes/project-api.route.ts`
- Modify: `src/server/app.ts`
- Modify: `src/server/domains/api-definition/api-definition.repository.ts`
- Modify: `src/server/domains/api-definition/api-definition.service.ts`
- Modify: `src/server/routes/api-test.route.ts`
- Create: `src/server/domains/project/project.repository.test.ts`

- [ ] **Step 1: Add repository tests**

Create `src/server/domains/project/project.repository.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { ProjectRepository } from '@/server/domains/project/project.repository'
import { createEmptyApiDefinition } from '@/modules/api-management/utils/create-empty-api-definition'

describe('project-scoped api repositories', () => {
  it('lists only APIs that belong to the requested project', () => {
    const repository = new ApiDefinitionRepository()
    repository.save('project_order', createEmptyApiDefinition({ projectId: 'project_order', name: '订单 API' }))
    repository.save('project_crm', createEmptyApiDefinition({ projectId: 'project_crm', name: '客户 API' }))

    expect(repository.list('project_order')).toHaveLength(1)
    expect(repository.list('project_order')[0]?.name).toBe('订单 API')
  })

  it('prevents API creation for archived projects', () => {
    const projectRepository = new ProjectRepository()
    projectRepository.archive('project_order')
    expect(projectRepository.canCreateApi('project_order')).toBe(false)
  })
})
```

- [ ] **Step 2: Run repository tests and verify failure**

Run:

```bash
pnpm test -- src/server/domains/project/project.repository.test.ts
```

Expected: fails because `ProjectRepository` and project-scoped API repository methods are not implemented.

- [ ] **Step 3: Implement Project repository/service**

Create `src/server/domains/project/project.repository.ts`:

```ts
import type { Project, ProjectDraft } from '@/shared/contracts/project.contract'

const now = '2026-06-27T00:00:00.000Z'

const seedProjects: Project[] = [
  {
    id: 'project_order',
    code: 'ORDER',
    name: '订单中心',
    description: '订单查询、明细和商品组装 API',
    status: 'active',
    apiCount: 1,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'project_crm',
    code: 'CRM',
    name: '客户中心',
    description: '客户档案与画像相关 API',
    status: 'active',
    apiCount: 0,
    createdAt: now,
    updatedAt: now,
  },
]

export class ProjectRepository {
  private projects = new Map(seedProjects.map((project) => [project.id, project]))

  list() {
    return Array.from(this.projects.values())
  }

  get(projectId: string) {
    return this.projects.get(projectId)
  }

  save(draft: ProjectDraft) {
    const timestamp = new Date().toISOString()
    const id = draft.id ?? `project_${Date.now()}`
    const existing = this.projects.get(id)
    const project: Project = {
      id,
      code: draft.code,
      name: draft.name,
      description: draft.description,
      status: existing?.status ?? 'active',
      apiCount: existing?.apiCount ?? 0,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    this.projects.set(id, project)
    return project
  }

  archive(projectId: string) {
    const project = this.projects.get(projectId)
    if (!project) return undefined
    const archived: Project = { ...project, status: 'archived', updatedAt: new Date().toISOString() }
    this.projects.set(projectId, archived)
    return archived
  }

  canCreateApi(projectId: string) {
    return this.projects.get(projectId)?.status === 'active'
  }
}
```

Create `src/server/domains/project/project.service.ts`:

```ts
import type { ProjectDraft } from '@/shared/contracts/project.contract'
import type { ProjectRepository } from '@/server/domains/project/project.repository'

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  list() {
    return this.repository.list()
  }

  get(projectId: string) {
    return this.repository.get(projectId)
  }

  save(draft: ProjectDraft) {
    return this.repository.save(draft)
  }

  archive(projectId: string) {
    return this.repository.archive(projectId)
  }
}
```

- [ ] **Step 4: Scope API repository/service by project**

Update `src/server/domains/api-definition/api-definition.repository.ts` so signatures become:

```ts
list(projectId: string): ApiDefinitionSummary[]
get(projectId: string, apiId: string): ApiDefinitionDraft | undefined
save(projectId: string, draft: ApiDefinitionDraft): { id: string; status: 'draft' }
```

Store summaries/drafts with `projectId`, filter `list()` by `projectId`, and make `get()` return `undefined` when the API belongs to another project.

Update `src/server/domains/api-definition/api-definition.service.ts` to expose the same project-scoped signatures.

- [ ] **Step 5: Add Hono project routes**

Create `src/server/routes/project.route.ts` with:

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ProjectRepository } from '@/server/domains/project/project.repository'
import { ProjectService } from '@/server/domains/project/project.service'
import { projectDraftSchema } from '@/shared/contracts/project.contract'

export const projectRepository = new ProjectRepository()
const service = new ProjectService(projectRepository)

export const projectRoute = new Hono()
  .get('/', (context) => context.json(service.list()))
  .post('/', zValidator('json', projectDraftSchema), (context) => context.json(service.save(context.req.valid('json'))))
  .get('/:projectId', (context) => {
    const project = service.get(context.req.param('projectId'))
    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })
  .put('/:projectId', zValidator('json', projectDraftSchema), (context) =>
    context.json(service.save({ ...context.req.valid('json'), id: context.req.param('projectId') })),
  )
  .post('/:projectId/archive', (context) => {
    const project = service.archive(context.req.param('projectId'))
    return project ? context.json(project) : context.json({ message: 'Project not found' }, 404)
  })
```

Create `src/server/routes/project-api.route.ts`:

```ts
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'

import { ApiDefinitionRepository } from '@/server/domains/api-definition/api-definition.repository'
import { ApiDefinitionService } from '@/server/domains/api-definition/api-definition.service'
import { ApiTestService } from '@/server/domains/api-test/api-test.service'
import { projectRepository } from '@/server/routes/project.route'
import {
  apiDefinitionDraftSchema,
  apiTestRequestSchema,
} from '@/shared/contracts/api-definition.contract'

const apiDefinitionService = new ApiDefinitionService(new ApiDefinitionRepository())
const apiTestService = new ApiTestService()

export const projectApiRoute = new Hono()
  .get('/:projectId/apis', (context) => {
    const projectId = context.req.param('projectId')
    if (!projectRepository.get(projectId)) {
      return context.json({ message: 'Project not found' }, 404)
    }
    return context.json(apiDefinitionService.list(projectId))
  })
  .post('/:projectId/apis', zValidator('json', apiDefinitionDraftSchema), (context) => {
    const projectId = context.req.param('projectId')
    if (!projectRepository.canCreateApi(projectId)) {
      return context.json({ message: 'Project is archived or not found' }, 409)
    }
    return context.json(apiDefinitionService.save(projectId, context.req.valid('json')))
  })
  .get('/:projectId/apis/:apiId', (context) => {
    const apiDefinition = apiDefinitionService.get(
      context.req.param('projectId'),
      context.req.param('apiId'),
    )
    return apiDefinition ? context.json(apiDefinition) : context.json({ message: 'API not found' }, 404)
  })
  .put('/:projectId/apis/:apiId', zValidator('json', apiDefinitionDraftSchema), (context) => {
    const projectId = context.req.param('projectId')
    const apiId = context.req.param('apiId')
    return context.json(apiDefinitionService.save(projectId, { ...context.req.valid('json'), id: apiId }))
  })
  .post('/:projectId/apis/test-draft', zValidator('json', apiTestRequestSchema), (context) =>
    context.json(apiTestService.run(context.req.valid('json'))),
  )
  .post('/:projectId/apis/:apiId/test', zValidator('json', apiTestRequestSchema), (context) =>
    context.json(apiTestService.run(context.req.valid('json'))),
  )
```

- [ ] **Step 6: Register new routes and remove global API route**

Update `src/server/app.ts`:

```ts
import { projectRoute } from '@/server/routes/project.route'
import { projectApiRoute } from '@/server/routes/project-api.route'

app
  .route('/health', healthRoute)
  .route('/projects', projectRoute)
  .route('/projects', projectApiRoute)
  .route('/metadata', metadataRoute)
  .route('/sql', sqlAnalyzeRoute)
```

Remove the `apiDefinitionRoute` import and `.route('/api-definitions', apiDefinitionRoute)` registration from `src/server/app.ts`. Leave `src/server/routes/api-definition.route.ts` on disk for this task; do not delete that file in this implementation.

- [ ] **Step 7: Run backend tests**

Run:

```bash
pnpm test -- src/server/domains/project/project.repository.test.ts
```

Expected: tests pass.

---

### Task 3: Project Management Frontend Module

**Files:**
- Create: `src/modules/project-management/model/project.types.ts`
- Create: `src/modules/project-management/schemas/project.schema.ts`
- Create: `src/modules/project-management/utils/create-empty-project.ts`
- Create: `src/modules/project-management/services/project-query-keys.ts`
- Create: `src/modules/project-management/services/project.api.ts`
- Create: `src/modules/project-management/hooks/use-project-query.ts`
- Create: `src/modules/project-management/hooks/use-save-project.ts`
- Create: `src/modules/project-management/hooks/use-archive-project.ts`
- Create: `src/modules/project-management/components/project-list/project-status-badge.tsx`
- Create: `src/modules/project-management/components/project-list/project-table-row.tsx`
- Create: `src/modules/project-management/components/project-list/project-table.tsx`
- Create: `src/modules/project-management/components/project-list/project-list-toolbar.tsx`
- Create: `src/modules/project-management/components/project-form/project-basic-fields.tsx`
- Create: `src/modules/project-management/components/project-form/project-form.tsx`
- Create: `src/modules/project-management/components/project-form/archive-project-dialog.tsx`
- Create: `src/modules/project-management/components/common/project-breadcrumb.tsx`
- Create: `src/modules/project-management/pages/project-list-page.tsx`
- Create: `src/modules/project-management/pages/create-project-page.tsx`
- Create: `src/modules/project-management/pages/edit-project-page.tsx`
- Create: `src/modules/project-management/index.ts`

- [ ] **Step 1: Create model/schema/service wrappers**

Re-export shared Project types from `model/project.types.ts` and `schemas/project.schema.ts`.

Implement `project.api.ts`:

```ts
import { apiFetch } from '@/lib/api-fetch'
import type { Project, ProjectDraft } from '@/shared/contracts/project.contract'

export function listProjects() {
  return apiFetch<Project[]>('/api/projects')
}

export function getProject(projectId: string) {
  return apiFetch<Project>(`/api/projects/${projectId}`)
}

export function saveProject(project: ProjectDraft) {
  return apiFetch<Project>(project.id ? `/api/projects/${project.id}` : '/api/projects', {
    method: project.id ? 'PUT' : 'POST',
    body: JSON.stringify(project),
  })
}

export function archiveProject(projectId: string) {
  return apiFetch<Project>(`/api/projects/${projectId}/archive`, { method: 'POST' })
}
```

- [ ] **Step 2: Create hooks**

Use TanStack Query:

```ts
useProjectListQuery()
useProjectQuery(projectId)
useSaveProject()
useArchiveProject()
```

Invalidate `projectQueryKeys.projects()` after save/archive.

- [ ] **Step 3: Create Project list UI**

Build `ProjectListPage` with:

- `AppPage`
- `ProjectListToolbar`
- `ProjectTable`
- row click/action link to `/projects/:projectId/apis`
- edit link to `/projects/:projectId/edit`
- archived badge via `ProjectStatusBadge`

- [ ] **Step 4: Create Project form UI**

Build `ProjectForm` with controlled local state for:

- `code`
- `name`
- `description`

Save action calls `useSaveProject()`. Create page starts from `createEmptyProject()`. Edit page loads project by `projectId`.

---

### Task 4: Router And Sidebar Navigation

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/layouts/app-shell/nav-config.ts`
- Create: `src/routes/_app/projects/index.tsx`
- Create: `src/routes/_app/projects/create.tsx`
- Create: `src/routes/_app/projects/$projectId/edit.tsx`
- Create: `src/routes/_app/projects/$projectId/apis/index.tsx`
- Create: `src/routes/_app/projects/$projectId/apis/create.tsx`
- Create: `src/routes/_app/projects/$projectId/apis/$apiId/edit.tsx`

- [ ] **Step 1: Add route components**

Each route entry should only import and return its page component:

```tsx
import { ProjectListPage } from '@/modules/project-management/pages/project-list-page'

export function ProjectListRouteComponent() {
  return <ProjectListPage />
}
```

Use equivalent route components for create/edit/project API list/API create/API edit.

- [ ] **Step 2: Update router tree**

Home redirects to `/projects`.

Add route hierarchy:

```txt
projects
projects/create
projects/$projectId/edit
projects/$projectId/apis
projects/$projectId/apis/create
projects/$projectId/apis/$apiId/edit
```

Remove old global `/api-management/list`, `/api-management/create`, and `/api-management/$apiId/edit` from the route tree. Keep the old route files on disk unused during this task; do not delete those files in this implementation.

- [ ] **Step 3: Update sidebar**

Update `nav-config.ts`:

```ts
{
  label: '项目管理',
  icon: FolderKanban,
  children: [
    { label: '项目列表', to: '/projects' },
    { label: '创建项目', to: '/projects/create' },
  ],
},
{
  label: 'API 管理',
  icon: Network,
  children: [{ label: '进入项目列表', to: '/projects' }],
}
```

---

### Task 5: API Management Project Context

**Files:**
- Modify: `src/modules/api-management/services/api-definition.api.ts`
- Modify: `src/modules/api-management/services/api-test.api.ts`
- Modify: `src/modules/api-management/services/api-management-query-keys.ts`
- Modify: `src/modules/api-management/hooks/use-api-definition-query.ts`
- Modify: `src/modules/api-management/hooks/use-save-api-definition.ts`
- Modify: `src/modules/api-management/hooks/use-run-api-test.ts`
- Create: `src/modules/api-management/components/project-api-header.tsx`
- Create: `src/modules/api-management/pages/project-api-list-page.tsx`
- Modify: `src/modules/api-management/pages/create-api-page.tsx`
- Modify: `src/modules/api-management/pages/edit-api-page.tsx`
- Modify: `src/modules/api-management/index.ts`

- [ ] **Step 1: Update API services**

Use project-scoped URLs:

```ts
listApiDefinitions(projectId) -> /api/projects/${projectId}/apis
getApiDefinition(projectId, apiId) -> /api/projects/${projectId}/apis/${apiId}
saveApiDefinition(projectId, draft) -> /api/projects/${projectId}/apis
runApiTest(projectId, apiId, request) -> /api/projects/${projectId}/apis/${apiId}/test
```

- [ ] **Step 2: Update query keys**

Query keys must include `projectId`:

```ts
apiDefinitions(projectId)
apiDefinition(projectId, apiId)
```

- [ ] **Step 3: Create Project API list page**

`ProjectApiListPage` reads `projectId` from route params, loads project and API list, renders:

- current project name/code/status
- API table
- create button to `/projects/:projectId/apis/create`
- disabled create button when project is archived

- [ ] **Step 4: Update create/edit pages**

`CreateApiPage` reads `projectId` and calls:

```ts
createEmptyApiDefinition({ projectId })
```

`EditApiPage` reads both `projectId` and `apiId`, loads the project-scoped API definition, and passes it into `ApiDesigner`.

---

### Task 6: API Test Route And Designer Save Flow

**Files:**
- Modify: `src/modules/api-management/components/designer/api-designer-toolbar.tsx`
- Modify: `src/modules/api-management/components/designer/api-test-panel.tsx`
- Modify: `src/modules/api-management/hooks/use-save-api-definition.ts`
- Modify: `src/modules/api-management/hooks/use-run-api-test.ts`
- Modify: `src/server/routes/api-test.route.ts`
- Modify: `src/server/domains/api-test/api-test.service.ts`

- [ ] **Step 1: Save flow**

Ensure `useSaveApiDefinition()` sends `state.apiDefinition.projectId` to project-scoped API routes.

`ApiDesignerToolbar` should keep calling the hook with only `state.apiDefinition`; the hook derives `projectId` from the draft.

- [ ] **Step 2: Test flow**

For create-page test runs where `apiId` does not exist yet, use a project-level endpoint:

```txt
POST /api/projects/:projectId/apis/test-draft
```

Add this endpoint to `project-api.route.ts` and have it call `ApiTestService.run()`.

Update `api-test.api.ts` to expose:

```ts
runApiDraftTest(projectId, request)
runApiTest(projectId, apiId, request)
```

Use draft testing in `ApiTestPanel`.

---

### Task 7: Verification

**Files:**
- Modify: the exact source file named by any failing verification output. Do not change unrelated files during verification cleanup.

- [ ] **Step 1: Run tests**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: exit code 0.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm lint
```

Expected: exit code 0.

- [ ] **Step 4: Build frontend**

Run:

```bash
pnpm build
```

Expected: production build succeeds. Existing CodeMirror chunk-size warning is acceptable.

- [ ] **Step 5: Build server**

Run:

```bash
pnpm build:server
```

Expected: SSR server bundle succeeds.

- [ ] **Step 6: Smoke test dev server**

Run:

```bash
pnpm dev
```

Open:

```txt
http://localhost:5173/projects
```

Check:

- Project list loads.
- Clicking a project opens `/projects/:projectId/apis`.
- Creating API opens `/projects/:projectId/apis/create`.
- API test panel returns mock response.
- `/api/health` returns `{ "ok": true }`.
