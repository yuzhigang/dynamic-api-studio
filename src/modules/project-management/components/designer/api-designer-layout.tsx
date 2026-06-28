import type { ReactNode } from 'react'

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

type ApiDesignerLayoutProps = {
  left: ReactNode
  workflow: ReactNode
}

export function ApiDesignerLayout({ left, workflow }: ApiDesignerLayoutProps) {
  return (
    <div className="min-h-0 flex-1 bg-slate-50 p-3">
      <ResizablePanelGroup
        autoSaveId="api-designer-layout"
        orientation="horizontal"
        className="h-full min-h-0 w-full"
      >
        <ResizablePanel id="left" className="min-w-0" defaultSize="42%" minSize="30%" maxSize="60%">
          {left}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="workflow" className="min-w-0" defaultSize="58%" minSize="40%" maxSize="70%">
          {workflow}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
