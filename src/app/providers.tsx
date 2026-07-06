import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'

import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EditorAppearanceProvider } from '@/components/editors/editor-appearance-provider'

export function AppProviders() {
  return (
    <TooltipProvider delayDuration={300}>
      <QueryClientProvider client={queryClient}>
        <EditorAppearanceProvider>
          <RouterProvider router={router} />
        </EditorAppearanceProvider>
        <Toaster />
      </QueryClientProvider>
    </TooltipProvider>
  )
}
