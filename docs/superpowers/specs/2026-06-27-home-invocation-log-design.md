# 首页调用日志组件设计

## 背景

Dynamic API Studio 首页当前展示指标卡片区和最近项目列表。为让运维/实施人员快速感知平台调用情况，需要在首页最下方增加**调用日志**组件，展示最近的 API 调用记录。

## 目标

1. 在首页底部展示最近 API 调用日志列表。
2. 支持分页浏览。
3. 字段覆盖时间、请求方法、API 名称、路径、状态码、状态、耗时、操作。
4. 详情按钮为后续“请求参数/返回结果查看器”预留入口。
5. 当前使用 mock 数据，静态加载一次；后续可替换为真实调用链路数据。

## 范围

- 后端：新增 `GET /api/home/invocations` 路由，返回内存 mock 数据。
- 前端：新增调用日志模块组件、API 服务、Query Hook，并在 `HomeOverviewPage` 最下方引入。
- 不实现详情查看器（占位按钮 disabled）。

## 数据契约

### Request

`GET /api/home/invocations?page=1&pageSize=10`

- `page`：页码，从 1 开始，默认 1。
- `pageSize`：每页条数，默认 10。

### Response

```ts
type InvocationLog = {
  id: string
  timestamp: string // ISO 8601
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  apiName: string
  apiPath: string
  statusCode: number
  status: 'success' | 'failure'
  durationMs: number
}

type InvocationLogsResponse = {
  items: InvocationLog[]
  total: number
  page: number
  pageSize: number
}
```

## 后端设计

文件：`src/server/routes/home-overview.route.ts`

在现有 `homeOverviewRoute` 上新增：

```ts
homeOverviewRoute.get('/invocations', (context) => {
  const page = Math.max(1, Number(context.req.query('page') ?? '1'))
  const pageSize = Math.max(1, Number(context.req.query('pageSize') ?? '10'))
  // mock 数据切片返回
})
```

mock 数据约 25 条，覆盖不同方法、路径、状态码、状态、耗时，保证分页可见。

## 前端设计

### 模块结构

在 `src/modules/home/` 下新增：

```
services/
  invocation-log.api.ts
  invocation-log-query-keys.ts
hooks/
  use-invocation-logs-query.ts
components/
  invocation-log-section.tsx
  invocation-log-table.tsx
  invocation-log-pagination.tsx
  invocation-log-method-badge.tsx
```

### 组件职责

- `invocation-log-section.tsx`：容器组件，组合表格和分页，处理加载/错误状态。
- `invocation-log-table.tsx`：渲染表格，每行一个调用日志。
- `invocation-log-pagination.tsx`：分页控件，显示当前页/总页数、上一页/下一页。
- `invocation-log-method-badge.tsx`：根据 HTTP 方法显示不同颜色 Badge。

### 表格列

| 列名 | 说明 |
|------|------|
| 时间 | `YYYY-MM-DD HH:mm:ss` 格式 |
| 方法 | GET/POST/PUT/DELETE/PATCH Badge |
| API 名称 | 如“订单列表” |
| 路径 | 如 `/api/order/list` |
| 状态码 | 数字，如 200、500 |
| 状态 | 成功/失败 Badge |
| 耗时 | 如 45ms |
| 操作 | 详情按钮（disabled） |

### 分页

- 每页默认 10 条。
- 分页控件位于表格右下角。
- 显示“第 page / totalPages 页”。
- 上一页/下一页按钮在边界时 disabled。

### 状态处理

- 加载：表格主体显示 5 行 Skeleton。
- 错误：显示错误文本 + 重试按钮（调用 `query.refetch()`）。
- 空数据：显示“暂无调用日志”。

### 页面集成

在 `src/modules/home/pages/home-overview-page.tsx` 中，`RecentProjectsSection` 下方新增：

```tsx
<InvocationLogSection />
```

## 测试

1. 后端：`home-overview.route.ts` 新增测试，验证分页参数和返回结构。
2. 前端：`invocation-log-section.test.tsx` 验证表格渲染、分页切换触发请求、加载/错误状态。

## 后续扩展

1. 详情按钮启用，点击打开请求参数/返回结果查看器（Dialog）。
2. mock 数据替换为真实调用记录存储（数据库或调用链路日志）。
3. 增加筛选（按 API、状态、时间范围）和排序。
