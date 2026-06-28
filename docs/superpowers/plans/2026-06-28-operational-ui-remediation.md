# Operational UI Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing interface into a clean, accessible, fully interactive operations workspace while retaining the current routes, domain model, and mock history data.

**Architecture:** Extend the existing shadcn-style primitive layer, then migrate business components onto those primitives. Keep API designer mutations in its reducer, keep mock-history filtering in pure utility modules, and let pages compose those units without introducing new global state.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui patterns, Radix UI, TanStack Router, TanStack Query, Vitest, Testing Library.

---

## File Map

- Create `src/components/ui/checkbox.tsx`, `radio-group.tsx`, `select.tsx`, `tooltip.tsx`, `pagination.tsx`, `toaster.tsx`: reusable shadcn-style primitives.
- Create `src/modules/project-management/components/project-workspace/history-utils.ts`: filtering, pagination and CSV functions for mock history pages.
- Create `src/modules/project-management/components/project-workspace/history-utils.test.ts`: pure behavior coverage.
- Create `src/modules/api-management/state/api-designer-reducer.test.ts`: reducer mutation coverage.
- Modify `src/app/providers.tsx`, `src/styles/globals.css`, `src/styles/codemirror.css`: providers, focus, viewport and reduced-motion behavior.
- Modify `src/layouts/app-shell/*`: navigation semantics, skip link and removal of fake commands.
- Modify API designer components and state files: real save/publish, workflow and schema commands.
- Modify history workspace components: real filters, paging, selection and CSV export.
- Modify shared form and table components: labels, accessible names and shadcn controls.

### Task 1: Install and add shadcn-style primitives

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/components/ui/checkbox.tsx`
- Create: `src/components/ui/radio-group.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/pagination.tsx`
- Create: `src/components/ui/toaster.tsx`
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Install Radix and notification dependencies**

Run:

```bash
pnpm add @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-select @radix-ui/react-tooltip sonner
```

Expected: dependencies and lockfile update without peer dependency errors.

- [ ] **Step 2: Add standard primitives**

Implement forward-ref wrappers using the project `cn` helper and existing CSS variables. Each interactive primitive must include `focus-visible:ring-2 focus-visible:ring-ring`, disabled states, and the standard shadcn Lucide indicator icon marked with `aria-hidden="true"`.

`Pagination` exposes this interface:

```tsx
type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}
```

It renders a textual `第 {page} / {totalPages} 页` summary and labeled previous/next `Button` controls.

- [ ] **Step 3: Mount shared providers**

Wrap the application content in `TooltipProvider` and render Sonner's `Toaster` once in `AppProviders`. Configure the toaster for rich colors and a visible close button.

- [ ] **Step 4: Verify primitives compile**

Run: `pnpm typecheck`

Expected: exit code 0.

### Task 2: Fix global semantics, focus and motion

**Files:**
- Modify: `src/layouts/app-shell/app-shell.tsx`
- Modify: `src/layouts/app-shell/app-header.tsx`
- Modify: `src/layouts/app-shell/app-sidebar.tsx`
- Modify: `src/layouts/app-shell/sidebar-user-menu.tsx`
- Modify: `src/layouts/app-shell/page-actions.tsx`
- Modify: `src/components/ui/tabs.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/alert-dialog.tsx`
- Modify: `src/components/ui/skeleton.tsx`
- Modify: `src/styles/globals.css`
- Modify: `src/styles/codemirror.css`
- Modify: `index.html`

- [ ] **Step 1: Add application landmarks**

Add a skip link targeting `#main-content`, assign that ID to `<main>`, and replace `h-screen` with `h-dvh min-h-0`. Add a matching `theme-color` meta tag in `index.html`.

- [ ] **Step 2: Remove fake global commands**

Delete the save/publish action generation from `AppHeader`; those commands will be rendered inside the API designer context. Remove unused notification/help/settings buttons from the sidebar. Keep the settings link that has a real route.

- [ ] **Step 3: Repair focus and animation styles**

Replace `transition-all` with explicit color/shadow transitions. Add `focus-visible` styles to tabs and dialog close buttons. Restore a visible CodeMirror focus ring with `.cm-editor.cm-focused`. Add a global reduced-motion media query and `touch-action: manipulation` for buttons and links.

- [ ] **Step 4: Normalize loading copy**

Replace visible `...` loading text with `…` in application source files. Do not alter code spread syntax.

- [ ] **Step 5: Verify shell changes**

Run: `pnpm lint && pnpm typecheck`

Expected: both commands exit 0.

### Task 3: Make navigation and compact forms accessible

**Files:**
- Modify: `src/modules/project-management/components/project-card/project-card.tsx`
- Modify: `src/modules/project-management/components/project-card/project-card-actions.tsx`
- Modify: `src/modules/project-management/components/project-form/project-basic-fields.tsx`
- Modify: `src/modules/api-management/components/common/compact-field.tsx`
- Modify: `src/modules/api-management/components/basic-info/*.tsx`
- Modify: `src/modules/api-management/components/request-params/*.tsx`
- Modify: `src/modules/api-management/components/response-schema/*.tsx`
- Modify: `src/modules/api-management/components/common/inline-actions.tsx`

- [ ] **Step 1: Convert project card navigation to a link**

Render the main project-card surface with TanStack `Link`, leaving the dropdown menu as a sibling positioned in the header. Ensure the link has a visible focus ring and the menu no longer relies on stopping a parent `div` click handler.

- [ ] **Step 2: Give compact fields stable control IDs**

Change `CompactField` to accept `htmlFor: string` and render a real `<Label htmlFor={htmlFor}>`. Pass matching IDs, meaningful names and `autoComplete="off"` from every API and project basic field.

- [ ] **Step 3: Replace native boolean and option controls**

Use `Checkbox` for required flags, `RadioGroup` for body content type, and `Select` for method/type/datasource/status choices. Table controls use `aria-label` values that include the row name, such as `参数 ${param.name || '未命名'} 是否必填`.

- [ ] **Step 4: Label every icon command**

Add `aria-label` and `Tooltip` to inline copy/add/delete controls, request parameter deletion, schema actions and project menu triggers. Mark nested Lucide icons decorative.

- [ ] **Step 5: Add focused accessibility tests**

Extend existing component tests to assert important controls by role and accessible name, including project menu, request-parameter delete and JSON copy actions.

- [ ] **Step 6: Run focused tests**

Run: `pnpm test -- src/modules/home/components/invocation-log-section.test.tsx`

Expected: all tests in the file pass.

### Task 4: Implement real API designer commands

**Files:**
- Modify: `src/modules/api-management/state/api-designer-types.ts`
- Modify: `src/modules/api-management/state/api-designer-actions.ts`
- Modify: `src/modules/api-management/state/api-designer-reducer.ts`
- Create: `src/modules/api-management/state/api-designer-reducer.test.ts`
- Modify: `src/modules/api-management/components/designer/api-designer.tsx`
- Modify: `src/modules/api-management/components/designer/api-designer-layout.tsx`
- Modify: `src/modules/api-management/components/designer/api-designer-toolbar.tsx`
- Modify: `src/modules/api-management/components/workflow/workflow-step-card.tsx`
- Modify: `src/modules/api-management/components/workflow/workflow-step-list.tsx`
- Modify: `src/modules/api-management/components/workflow/workflow-step-toolbar.tsx`
- Modify: `src/modules/api-management/components/response-schema/schema-field-row.tsx`
- Modify: `src/modules/api-management/components/response-schema/schema-row-actions.tsx`
- Modify: `src/modules/api-management/components/response-schema/schema-tree-table.tsx`
- Modify: `src/modules/project-management/components/project-workspace/project-api-main-panel.tsx`

- [ ] **Step 1: Write reducer tests first**

Cover these action sequences:

```tsx
apiDesignerActions.addWorkflowStep(existingStepId, 'sql-query')
apiDesignerActions.copyWorkflowStep(existingStepId)
apiDesignerActions.removeWorkflowStep(existingStepId)
apiDesignerActions.addSchemaField()
apiDesignerActions.addSchemaChild(parentId)
apiDesignerActions.copySchemaField(fieldId)
apiDesignerActions.removeSchemaField(fieldId)
```

Assertions must verify stable ordering, fresh IDs, copied nested data and recursive deletion.

- [ ] **Step 2: Run reducer tests and observe failure**

Run: `pnpm test -- src/modules/api-management/state/api-designer-reducer.test.ts`

Expected: FAIL because the new actions do not exist.

- [ ] **Step 3: Add reducer actions**

Extend `ApiDesignerAction` with explicit discriminated union members for each operation. Implement recursive helpers for schema insertion, cloning and removal. Workflow copies receive a new ID and a title ending in `副本`.

- [ ] **Step 4: Connect workflow and schema controls**

Pass step/field IDs into toolbars. Use `AlertDialog` for destructive actions. Add a visible `新增字段` button when the schema is empty and in the schema section header.

- [ ] **Step 5: Connect save and publish**

Render `ApiDesignerToolbar` inside `ApiDesignerProvider`. Save passes the current definition unchanged. Publish passes `{ ...definition, status: 'published' }`. Show pending labels `保存中…` and `发布中…`, and show Sonner success/error messages.

- [ ] **Step 6: Simplify the designer layout**

Replace the fixed three-column grid with `ResizablePanelGroup` containing only `LeftDesignPanel` and `WorkflowPanel`. Use percentage defaults and minimum sizes without a page-level minimum width.

- [ ] **Step 7: Run reducer and editor tests**

Run:

```bash
pnpm test -- src/modules/api-management/state/api-designer-reducer.test.ts src/modules/api-management/editors/code-mirror-editor.test.tsx
```

Expected: all tests pass.

### Task 5: Implement copy, collapse and feedback behavior

**Files:**
- Modify: `src/modules/api-management/editors/code-editor-shell.tsx`
- Modify: `src/modules/api-management/components/test-panel/request-preview-card.tsx`
- Modify: `src/modules/api-management/components/test-panel/response-result-card.tsx`
- Modify: `src/modules/api-management/components/designer/api-test-panel.tsx`
- Modify: `src/modules/api-management/components/test-panel/test-run-status.tsx`

- [ ] **Step 1: Make editor headers semantic**

Render the collapsible title as a full-width `button` with `aria-expanded`. Keep maximize and collapse icon buttons separate, labeled and wrapped in tooltips; prevent nested button markup.

- [ ] **Step 2: Add a shared JSON copy helper**

Serialize values with `JSON.stringify(value, null, 2)`, await `navigator.clipboard.writeText`, and show success/error Sonner messages. Disable response copying when no result exists.

- [ ] **Step 3: Improve async states**

Use pending labels and `Loader2` icons for API test execution. Add `aria-live="polite"` around execution status and ensure success is only shown after a result exists.

- [ ] **Step 4: Verify affected components**

Run: `pnpm typecheck && pnpm lint`

Expected: both commands exit 0.

### Task 6: Build history filtering, pagination and CSV export

**Files:**
- Create: `src/modules/project-management/components/project-workspace/history-utils.ts`
- Create: `src/modules/project-management/components/project-workspace/history-utils.test.ts`
- Modify: `src/modules/project-management/components/project-workspace/project-api-test-history-tab.tsx`
- Modify: `src/modules/project-management/components/project-workspace/project-api-invocation-log-tab.tsx`
- Modify: `src/modules/project-management/components/project-workspace/project-api-sidebar.tsx`
- Modify: `src/modules/home/components/invocation-log-pagination.tsx`
- Modify: `src/modules/invocation-log/components/invocation-log-table.tsx`
- Modify: `src/modules/invocation-log/utils/format-date-time.ts`

- [ ] **Step 1: Write pure utility tests first**

Test case-insensitive keyword matching, status matching, inclusive date ranges, page clamping and CSV escaping:

```ts
expect(toCsvCell('a,"b"')).toBe('"a,""b"""')
expect(paginate([1, 2, 3], 2, 2)).toEqual({ items: [3], page: 2, totalPages: 2 })
```

- [ ] **Step 2: Run utility tests and observe failure**

Run: `pnpm test -- src/modules/project-management/components/project-workspace/history-utils.test.ts`

Expected: FAIL because the utility module does not exist.

- [ ] **Step 3: Implement utilities**

Export typed `filterTestHistory`, `filterInvocationLogs`, `paginate`, `toCsvCell`, `buildInvocationCsv` and `downloadCsv`. Keep all filtering functions pure; isolate DOM APIs to `downloadCsv`.

- [ ] **Step 4: Connect test-history controls**

Use controlled keyword and status state. Derive filtered and paged items with `useMemo`; reset page in event handlers. Make selection follow visible data when filters remove the selected row. Use the shared `Pagination` component.

- [ ] **Step 5: Connect invocation-history controls**

Use real date inputs, status `Select`, query/reset buttons and CSV export. Derive metric values from the filtered data where possible. Replace fake numbered controls with shared `Pagination`.

- [ ] **Step 6: Reuse shared pagination elsewhere**

Replace home and API-sidebar pagination markup with `Pagination`. Hide API-sidebar pagination when there is only one page.

- [ ] **Step 7: Internationalize values**

Replace the manual date formatter with a module-level `Intl.DateTimeFormat('zh-CN', ...)`. Add `tabular-nums` to times, durations, status codes and metric values.

- [ ] **Step 8: Run history tests**

Run:

```bash
pnpm test -- src/modules/project-management/components/project-workspace/history-utils.test.ts src/modules/home/components/invocation-log-section.test.tsx
```

Expected: all tests pass.

### Task 7: Responsive cleanup and final verification

**Files:**
- Modify: `src/modules/project-management/components/project-workspace/project-api-test-history-tab.tsx`
- Modify: `src/modules/project-management/components/project-workspace/project-api-invocation-log-tab.tsx`
- Modify: `src/modules/project-management/components/project-workspace/project-api-main-panel.tsx`
- Modify: `src/modules/project-management/components/project-workspace/project-api-sidebar.tsx`
- Modify: `src/modules/api-management/components/designer/left-design-panel.tsx`
- Modify: `src/modules/api-management/components/designer/workflow-panel.tsx`
- Modify: `src/components/ui/table.tsx`

- [ ] **Step 1: Remove page-level fixed minimum widths**

Use responsive grid breakpoints and local overflow containers. Preserve dense desktop layouts while allowing filter controls and metric cards to wrap. Keep table headers stable and let the shared table wrapper scroll horizontally.

- [ ] **Step 2: Restore scroll discoverability**

Remove hidden-scrollbar utility classes from designer panels. Add `overscroll-contain` to modal and work-area scrollers.

- [ ] **Step 3: Run the complete verification suite**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Expected: every command exits 0 with no failing tests or build errors.

- [ ] **Step 4: Start and inspect the application**

Run: `pnpm dev`

Inspect `/`, `/projects`, a project API basic view, `/tests`, and `/invocations` at desktop and narrow-desktop widths. Confirm there are no overlapping controls, page-level forced horizontal scrollbars, blank panels or dead visible commands.

## Execution Note

The workspace does not contain a `.git` directory, so commit checkpoints cannot be executed. All edits must remain scoped to the files above, and verification output replaces commit-based progress evidence.
