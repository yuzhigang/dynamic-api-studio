import { Hono } from 'hono'

export const healthRoute = new Hono().get('/', (context) =>
  context.json({
    ok: true,
    service: 'dynamic-api-studio',
    time: new Date().toISOString(),
  }),
)
