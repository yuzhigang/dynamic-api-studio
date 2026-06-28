# Project Detail API Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/projects/:projectId` as a project-scoped API workspace matching the provided layout: API list sidebar on the left, selected API detail workspace on the right.

**Architecture:** Keep routing simple by managing selected API in page state rather than adding a new API detail URL. Reuse existing API designer building blocks by wrapping the selected API draft in `ApiDesignerProvider` and placing `LeftDesignPanel` plus `WorkflowPanel` inside the new project workspace layout.

**Tech Stack:** React, TypeScript, TanStack Query/Router, Tailwind CSS, shadcn-style local components, existing API designer components.

---

### Task 1: Build API Sidebar Components

**Files:**
- Create: `src/modules/project-management/components/project-workspace/project-api-list-card.tsx`
- Create: `src/modules/project-management/components/project-workspace/project-api-sidebar.tsx`

- [ ] Render a searchable API list with method badge, path, status badge, active state, add API button, and compact pagination controls.
- [ ] Use existing `Input`, `Button`, `Badge`, and `Card` components.
- [ ] Expose controlled props: `apis`, `selectedApiId`, `onSelectApi`, `projectId`, and `archived`.

### Task 2: Build Selected API Workspace

**Files:**
- Create: `src/modules/project-management/components/project-workspace/project-api-main-panel.tsx`

- [ ] Render selected API title, status, top actions, tabs, and two-column design workspace.
- [ ] Reuse `ApiDesignerProvider`, `LeftDesignPanel`, and `WorkflowPanel` for the `基本详情` tab.
- [ ] Render lightweight existing-component panels for `测试历史` and `调用日志`.
- [ ] Use a `key` on `ApiDesignerProvider` or wrapper so switching APIs resets designer state to the selected API.

### Task 3: Replace Project Detail Page Layout

**Files:**
- Modify: `src/modules/project-management/pages/project-detail-page.tsx`

- [ ] Fetch project, API summaries, and selected API draft.
- [ ] Default selected API to the first API returned for the project.
- [ ] Render the left sidebar and right main panel in a fixed-height split layout.
- [ ] Keep project missing/loading states.

### Task 4: Verification

**Files:**
- Test: project-wide validation

- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm build:server`.
- [ ] Smoke test `/projects/project_order` and `/home` on the dev server.
