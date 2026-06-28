import type { ErrorComponentProps } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export function AppErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <div>
        <h1 className="text-lg font-semibold text-foreground">页面加载失败</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {error instanceof Error ? error.message : '未知错误'}
        </p>
      </div>
      <Button onClick={reset}>重新加载</Button>
    </div>
  )
}
