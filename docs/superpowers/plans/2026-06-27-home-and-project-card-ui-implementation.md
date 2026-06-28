# Home And Project Card UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/home` overview, convert `/projects` to reusable project cards, and move create/edit project actions into dialogs.

**Architecture:** Home consumes a lightweight `/api/home/overview` endpoint. Project cards are shared by `/home` and `/projects`; project actions live in the card's top-right menu. Project cards navigate to `/projects/:projectId`.

**Tech Stack:** React, TanStack Router, TanStack Query, Tailwind CSS, Hono, Zod, Vitest.

---

### Task 1: Backend Overview And Project Copy

**Files:**
- Modify: `src/server/domains/project/project.repository.ts`
- Modify: `src/server/domains/project/project.service.ts`
- Modify: `src/server/routes/project.route.ts`
- Create: `src/server/routes/home-overview.route.ts`
- Modify: `src/server/app.ts`

- [ ] Add `copy(projectId)` to ProjectRepository and ProjectService.
- [ ] Add `POST /api/projects/:projectId/copy`.
- [ ] Add `GET /api/home/overview` returning metrics and recentProjects.

### Task 2: Project Card Components And Dialog Form

**Files:**
- Create: `src/modules/project-management/components/project-card/project-card.tsx`
- Create: `src/modules/project-management/components/project-card/project-card-actions.tsx`
- Create: `src/modules/project-management/components/project-card/project-card-grid.tsx`
- Create: `src/modules/project-management/components/project-form/project-form-dialog.tsx`
- Modify: `src/modules/project-management/components/project-form/project-basic-fields.tsx`
- Modify: `src/modules/project-management/hooks/use-save-project.ts`
- Create: `src/modules/project-management/hooks/use-copy-project.ts`
- Modify: `src/modules/project-management/services/project.api.ts`

- [ ] Add card layout with project name, code, status, description, apiCount, updatedAt.
- [ ] Add top-right action menu: copy, edit, archive.
- [ ] Add reusable ProjectFormDialog for create/edit.
- [ ] Ensure card action clicks stop propagation.

### Task 3: Home Module

**Files:**
- Create: `src/modules/home/services/home-overview-query-keys.ts`
- Create: `src/modules/home/services/home-overview.api.ts`
- Create: `src/modules/home/hooks/use-home-overview-query.ts`
- Create: `src/modules/home/components/metric-card.tsx`
- Create: `src/modules/home/components/metric-grid.tsx`
- Create: `src/modules/home/components/recent-projects-section.tsx`
- Create: `src/modules/home/pages/home-overview-page.tsx`
- Create: `src/modules/home/index.ts`

- [ ] Render metric cards for project/api/datasource/invocation counts.
- [ ] Render recent 10 projects using ProjectCardGrid.
- [ ] Add create project dialog and "查看全部" link.

### Task 4: Routes And Navigation

**Files:**
- Modify: `src/app/router.tsx`
- Create: `src/routes/_app/home.tsx`
- Create: `src/routes/_app/projects/$projectId/index.tsx`
- Modify: `src/layouts/app-shell/nav-config.ts`
- Modify: `src/layouts/app-shell/app-header.tsx`

- [ ] Route `/` to `/home`.
- [ ] Add `/home`.
- [ ] Add `/projects/:projectId`.
- [ ] Remove `/projects/create` and `/projects/:projectId/edit` from router tree.
- [ ] Sidebar has `首页 -> /home` and `项目 -> /projects`, no Project parent/child menu.

### Task 5: Project Pages

**Files:**
- Modify: `src/modules/project-management/pages/project-list-page.tsx`
- Create: `src/modules/project-management/pages/project-detail-page.tsx`
- Modify: `src/modules/project-management/index.ts`

- [ ] Convert `/projects` to card grid with page-level create button.
- [ ] Add basic placeholder `/projects/:projectId` detail page with project basic info and API entry link.

### Task 6: Verification

**Commands:**
- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm build:server`

**Smoke Checks:**
- `GET /home` returns SPA HTML.
- `GET /api/home/overview` returns metrics.
- `GET /projects` returns SPA HTML.
- `POST /api/projects/project_order/copy` returns copied project.
