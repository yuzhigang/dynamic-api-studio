# Project Init Frontend Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Dynamic API Studio Vite + React + TanStack + Tailwind + shadcn/ui + Hono scaffold around the approved three-column API designer.

**Architecture:** The frontend uses a thin TanStack Router layer, an AppShell layout, and feature-owned files under `modules/api-management`. Hono exposes mockable API routes under `/api`; shared Zod schemas and contracts are used by both browser services and server routes.

**Tech Stack:** Vite, TypeScript, React, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui-style primitives, CodeMirror 6, Hono, Zod, Knex.

---

### Task 1: Root Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `eslint.config.js`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `components.json`

- [ ] Add scripts for `dev`, `build`, `build:server`, `typecheck`, `lint`, and `test`.
- [ ] Configure `@` alias to `src`.
- [ ] Configure TanStack Router plugin before React.
- [ ] Configure `@hono/vite-dev-server` for `/api/*` routes only.

### Task 2: App Entry And Layout

**Files:**
- Create: `src/main.tsx`
- Create: `src/app/providers.tsx`
- Create: `src/app/router.tsx`
- Create: `src/app/query-client.ts`
- Create: `src/app/app-error-boundary.tsx`
- Create: `src/routes/**`
- Create: `src/layouts/app-shell/**`
- Create: `src/styles/globals.css`
- Create: `src/styles/codemirror.css`

- [ ] Mount React through `AppProviders`.
- [ ] Create code-based TanStack routes matching the planned URL shape.
- [ ] Build the dark sidebar, top breadcrumb/action bar, and content outlet.

### Task 3: Shared UI And Contracts

**Files:**
- Create: `src/components/ui/**`
- Create: `src/components/form/native-select.tsx`
- Create: `src/components/data-table/empty-state.tsx`
- Create: `src/shared/schemas/api-definition.schema.ts`
- Create: `src/shared/contracts/api-definition.contract.ts`
- Create: `src/shared/enums/http-method.ts`
- Create: `src/shared/utils/assert-never.ts`
- Create: `src/lib/**`

- [ ] Add shadcn-style primitives used by the first screen.
- [ ] Define API definition, workflow step, request param, schema field, and API test schemas.
- [ ] Add shared fetch and utility helpers.

### Task 4: API Management Frontend

**Files:**
- Create: `src/modules/api-management/pages/**`
- Create: `src/modules/api-management/components/**`
- Create: `src/modules/api-management/editors/**`
- Create: `src/modules/api-management/state/**`
- Create: `src/modules/api-management/hooks/**`
- Create: `src/modules/api-management/services/**`
- Create: `src/modules/api-management/model/**`
- Create: `src/modules/api-management/schemas/**`
- Create: `src/modules/api-management/utils/**`

- [ ] Implement `ApiDesigner` with left design panel, workflow panel, and API test panel.
- [ ] Add basic info, request params, response schema, workflow step cards, and test result sections.
- [ ] Wrap CodeMirror 6 for SQL, JavaScript, and JSON viewing.
- [ ] Add reducer-backed draft state and TanStack Query mutations.

### Task 5: Hono Server Skeleton

**Files:**
- Create: `src/server/app.ts`
- Create: `src/server/index.ts`
- Create: `src/server/node.ts`
- Create: `src/server/context.ts`
- Create: `src/server/routes/**`
- Create: `src/server/domains/**`
- Create: `src/server/analyzer/**`
- Create: `src/server/infra/**`

- [ ] Add `/api/health`.
- [ ] Add mock API definition CRUD, SQL analyze, metadata, and API test routes.
- [ ] Add Knex registry and SQL analyzer placeholders with typed interfaces.

### Task 6: Verification

**Files:**
- Modify as needed based on verification output.

- [ ] Install dependencies with `pnpm install`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm build:server`.
