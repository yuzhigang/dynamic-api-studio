# Shadcn UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the recent hand-written project UI primitives with shadcn-style components wherever the current stack supports it.

**Architecture:** Keep business modules unchanged and add missing reusable primitives under `src/components/ui`. Project features consume these primitives through `ProjectFormDialog`, `ProjectCardActions`, `ProjectCard`, and card grids.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn-style local components, Radix primitives.

---

### Task 1: Add Missing Shadcn-Style Primitives

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/alert-dialog.tsx`
- Create: `src/components/ui/skeleton.tsx`

- [ ] Add Radix dependencies: `@radix-ui/react-dropdown-menu` and `@radix-ui/react-alert-dialog`.
- [ ] Add local shadcn-style wrappers for dropdown menu, alert dialog, and skeleton.
- [ ] Run `pnpm typecheck`.

### Task 2: Refactor Project Dialogs And Menus

**Files:**
- Modify: `src/modules/project-management/components/project-form/project-form-dialog.tsx`
- Modify: `src/modules/project-management/components/project-card/project-card-actions.tsx`

- [ ] Replace custom fixed overlay in `ProjectFormDialog` with `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, and `DialogTitle`.
- [ ] Replace `<details>` menu in `ProjectCardActions` with `DropdownMenu`.
- [ ] Replace `window.confirm` archive flow with `AlertDialog`.
- [ ] Run `pnpm typecheck` and `pnpm lint`.

### Task 3: Refactor Cards And Loading States

**Files:**
- Modify: `src/modules/project-management/components/project-card/project-card.tsx`
- Modify: `src/modules/project-management/components/project-card/project-card-grid.tsx`
- Modify: `src/modules/home/components/metric-card.tsx`
- Modify: `src/modules/project-management/pages/project-detail-page.tsx`

- [ ] Use `CardHeader`, `CardContent`, and `CardTitle` where cards have clear sections.
- [ ] Replace hand-written loading blocks with `Skeleton`.
- [ ] Keep density and visual layout close to the existing dashboard design.

### Task 4: Verification

**Files:**
- Test: project-wide validation

- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm build:server`.
- [ ] Smoke test `/home`, `/projects`, and project card action UI with the dev server.
