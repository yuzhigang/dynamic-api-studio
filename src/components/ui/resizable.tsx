"use client"

import type { ComponentProps } from "react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/cn"

const groupClassName = "flex h-full w-full data-[panel-group-direction=vertical]:flex-col"

type ResizablePanelGroupProps = ComponentProps<typeof ResizablePrimitive.Group> & {
  /** 提供后，分栏宽度会按此 id 持久化到 localStorage，刷新后保持。各 Panel 需带稳定的 `id`。 */
  autoSaveId?: string
}

const ResizablePanelGroup = ({ autoSaveId, className, ...props }: ResizablePanelGroupProps) =>
  autoSaveId ? (
    <PersistentPanelGroup autoSaveId={autoSaveId} className={className} {...props} />
  ) : (
    <ResizablePrimitive.Group className={cn(groupClassName, className)} {...props} />
  )

const PersistentPanelGroup = ({
  autoSaveId,
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Group> & { autoSaveId: string }) => {
  const { defaultLayout, onLayoutChanged } = ResizablePrimitive.useDefaultLayout({
    id: autoSaveId,
    storage: typeof window === "undefined" ? undefined : window.localStorage,
  })

  return (
    <ResizablePrimitive.Group
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      className={cn(groupClassName, className)}
      {...props}
    />
  )
}

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.Separator
    className={cn(
      "group relative flex w-3 shrink-0 cursor-col-resize items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-slate-200 hover:after:bg-blue-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-3 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-px data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:h-1.5 [&[data-panel-group-direction=vertical]>div]:w-8",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 h-8 w-1.5 rounded-full bg-slate-300 shadow-sm transition-colors group-hover:bg-blue-400" />
    )}
  </ResizablePrimitive.Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
