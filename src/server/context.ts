import type { Context } from 'hono'

export type AppBindings = {
  Variables: {
    requestId: string
  }
}

export type AppContext = Context<AppBindings>
